#!/usr/bin/env node
// Refuse to deploy a Cloudflare Worker that ships better-auth without a session-signing
// secret bound to it.
//
// WHY THIS EXISTS. better-auth does not refuse an unset secret; it substitutes one.
// In 1.7.4, `dist/context/create-context.mjs`:
//
//   const legacySecret = options.secret || env.BETTER_AUTH_SECRET || env.AUTH_SECRET || "";
//   secret = legacySecret || "better-auth-secret-12345678901234567890";
//   validateSecret(secret, logger);
//
// and `validateSecret` throws for that default only when NODE_ENV === "production",
// which a Cloudflare Worker never sets. So a Worker missing the secret signs sessions
// with a constant published on npm — forgeable by anyone who can read the package.
// On 2026-09-16 `simba-control-plane-alpha` was found doing exactly that, with the
// literal default present in its deployed bundle; only Cloudflare Access, a control
// nobody designed for the purpose, stood between that and forged staff sessions.
//
// HOW IT MEASURES. Two facts, in order, both read rather than assumed:
//
//   1. Does the artifact about to be uploaded actually contain better-auth's session
//      signer? Measured by finding better-auth's fallback-secret literal in the
//      INSTALLED package and then looking for that same literal in the bundle
//      `wrangler deploy --dry-run --outdir` just produced. The literal is read out of
//      node_modules rather than hardcoded here, so a better-auth release that changes
//      it does not silently disarm this guard: if the literal cannot be found in the
//      installed package at all, the guard fails rather than passing.
//
//      A Worker with no better-auth in its bundle exits 0 with a notice. A guard that
//      fires on Workers with no auth is noise, gets disabled, and then protects nothing.
//
//   2. Is a session-signing secret bound to the live script? Measured with
//      `wrangler secret list`, which reads the deployed script's secret bindings —
//      not an intention recorded in configuration. Secrets survive a deploy (wrangler's
//      own --keep-vars help: "Note that secrets are never deleted by deployments"), so
//      what is bound now is what will be bound after this deploy. That is why the check
//      runs BEFORE the upload: the same fact, before the forgeable Worker goes live.
//
// Every failure exits non-zero. It is a gate, not a warning.

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";

const DEFAULT_NAMES = ["BETTER_AUTH_SECRET", "BETTER_AUTH_SECRETS", "AUTH_SECRET"];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (!argv[i].startsWith("--")) continue;
    args[argv[i].slice(2)] = argv[i + 1];
    i += 1;
  }
  return args;
}

function fail(title, message) {
  console.log(`::error title=${title}::${message.replace(/\n/g, "%0A")}`);
  process.exit(1);
}

function notice(title, message) {
  console.log(`::notice title=${title}::${message}`);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

// better-auth's installed location, resolved the way the bundler resolved it.
function findBetterAuth(cwd) {
  const require = createRequire(join(cwd, "noop.js"));
  try {
    // `better-auth/package.json` is not in the package's `exports`, so resolve an
    // entry point that is and walk up to the package root.
    const entry = require.resolve("better-auth");
    const marker = `${join("node_modules", "better-auth")}`;
    const at = entry.lastIndexOf(marker);
    if (at !== -1) return entry.slice(0, at + marker.length);
  } catch {
    /* fall through to the conventional path */
  }
  const conventional = join(cwd, "node_modules", "better-auth");
  return existsSync(conventional) ? conventional : null;
}

// The literals better-auth would fall back to. Read from the installed package so a
// release that changes the constant is picked up rather than missed.
function fallbackLiterals(pkgDir) {
  const found = new Set();
  const dist = existsSync(join(pkgDir, "dist")) ? join(pkgDir, "dist") : pkgDir;
  for (const file of walk(dist)) {
    if (!/\.(mjs|cjs|js|ts)$/.test(file)) continue;
    for (const hit of readFileSync(file, "utf8").matchAll(/better-auth-secret-[A-Za-z0-9]+/g)) {
      found.add(hit[0]);
    }
  }
  return [...found];
}

function bundleFiles(bundleDir) {
  return walk(bundleDir).filter((file) => !file.endsWith(".map"));
}

function readSecretNames(wranglerCommand, passthrough) {
  const [bin, ...prefix] = wranglerCommand.split(/\s+/).filter(Boolean);
  const argv = [...prefix, "secret", "list", "--format", "json", ...passthrough];
  const run = spawnSync(bin, argv, { encoding: "utf8" });
  // wrangler prints API errors on stdout and npm noise on stderr, so neither stream
  // alone tells you what happened. Classify over both.
  const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;
  if (run.error) return { kind: "spawn-failed", output: `${run.error.message}\n${output}` };
  if (run.status !== 0) {
    if (/10007|script not found|workers\.api\.error\.script_not_found/i.test(output)) {
      return { kind: "no-script", output };
    }
    if (/10000|Authentication error|not authorized|unauthorized|403/i.test(output)) {
      return { kind: "no-scope", output };
    }
    return { kind: "failed", output };
  }
  const start = run.stdout.indexOf("[");
  const end = run.stdout.lastIndexOf("]");
  if (start === -1 || end === -1) return { kind: "unreadable", output };
  try {
    const parsed = JSON.parse(run.stdout.slice(start, end + 1));
    return { kind: "ok", names: parsed.map((secret) => secret.name), output };
  } catch {
    return { kind: "unreadable", output };
  }
}

const args = parseArgs(process.argv.slice(2));
const cwd = resolve(args.cwd ?? process.cwd());
const bundleDir = resolve(cwd, args.bundle ?? "");
const names = (args.names ?? DEFAULT_NAMES.join(",")).split(",").map((name) => name.trim()).filter(Boolean);
const wranglerCommand = args["wrangler-command"] ?? "npx --yes wrangler@4";
const passthrough = [];
if (args.config) passthrough.push("--config", args.config);
if (args.env) passthrough.push("--env", args.env);
const where = `${args.env ? `--env ${args.env} ` : ""}${args.config ? `--config ${args.config}` : ""}`.trim();

if (!existsSync(bundleDir)) {
  fail(
    "better-auth secret gate: no bundle",
    `${bundleDir} does not exist. The gate scans the artifact 'wrangler deploy --dry-run --outdir' produces; a scan over nothing is not a pass.`,
  );
}
const files = bundleFiles(bundleDir);
if (files.length === 0) {
  fail(
    "better-auth secret gate: empty bundle",
    `${bundleDir} contains no non-sourcemap files. A scan over nothing is not a pass.`,
  );
}

const pkgDir = findBetterAuth(cwd);
if (!pkgDir) {
  notice("better-auth secret gate", "better-auth is not installed here, so this Worker cannot ship it. Nothing to gate.");
  process.exit(0);
}

const literals = fallbackLiterals(pkgDir);
if (literals.length === 0) {
  fail(
    "better-auth secret gate: cannot measure",
    `better-auth is installed at ${pkgDir} but none of its files contain a 'better-auth-secret-…' fallback literal. This gate detects better-auth by that literal, so it can no longer tell whether the bundle ships a session signer. Fix the gate before deploying — do not disable it.`,
  );
}

const shipped = files.filter((file) => {
  const text = readFileSync(file, "utf8");
  return literals.some((literal) => text.includes(literal));
});
if (shipped.length === 0) {
  notice(
    "better-auth secret gate",
    `better-auth is installed but its fallback secret (${literals.join(", ")}) is not in the deployed bundle, so no session signer ships. Nothing to gate.`,
  );
  process.exit(0);
}

const result = readSecretNames(wranglerCommand, passthrough);
const put = `npx wrangler@4 secret put ${names[0]} ${where}`.trim();

switch (result.kind) {
  case "ok":
    if (result.names.some((name) => names.includes(name))) {
      notice(
        "better-auth secret gate",
        `${names.find((name) => result.names.includes(name))} is bound to the Worker; better-auth will not fall back to its published default.`,
      );
      process.exit(0);
    }
    fail(
      "BETTER_AUTH_SECRET missing",
      `${shipped[0]} ships better-auth, and the Worker has none of ${names.join(", ")} bound (it has: ${result.names.join(", ") || "no secrets"}). Deploying it would sign every session with better-auth's published default, forgeable by anyone who can read the package on npm. Set it and re-run: ${put}`,
    );
    break;
  case "no-script":
    fail(
      "BETTER_AUTH_SECRET missing",
      `This Worker ships better-auth and does not exist on Cloudflare yet, so no secret is bound to it. Bind it first — 'wrangler secret put' creates the script if it is absent — then deploy: ${put}`,
    );
    break;
  case "no-scope":
    fail(
      "better-auth secret gate: token cannot read secret bindings",
      `'wrangler secret list' was refused. Listing secrets needs Workers Scripts Read (Workers Scripts Write also satisfies it); grant it to the deploy token rather than removing this gate. wrangler said: ${result.output.trim().slice(0, 500)}`,
    );
    break;
  default:
    fail(
      "better-auth secret gate: could not read the secret bindings",
      `'wrangler secret list' did not return a readable list, so whether this Worker has a session-signing secret is unknown — and unknown is not a pass. wrangler said: ${result.output.trim().slice(0, 500)}`,
    );
}
