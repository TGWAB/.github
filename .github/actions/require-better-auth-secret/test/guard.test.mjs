// Every branch of the gate, including the red one. A guard never observed failing is
// unverified, not correct.
//
// The Cloudflare half is exercised through a stub `wrangler` passed with
// --wrangler-command: the gate must classify "no secret bound", "script does not
// exist", and "token cannot list secrets" differently, and each of those is an API
// response we cannot and must not produce against a real Worker from a test.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const guard = join(dirname(fileURLToPath(import.meta.url)), "..", "guard.mjs");
const DEFAULT_LITERAL = "better-auth-secret-12345678901234567890";

function fixture({ betterAuth = DEFAULT_LITERAL, bundle = "", withBundleDir = true } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "better-auth-gate-"));
  if (betterAuth !== null) {
    const dist = join(dir, "node_modules", "better-auth", "dist");
    mkdirSync(dist, { recursive: true });
    writeFileSync(
      join(dir, "node_modules", "better-auth", "package.json"),
      JSON.stringify({ name: "better-auth", version: "1.7.4", exports: { ".": "./dist/index.mjs" } }),
    );
    writeFileSync(join(dist, "index.mjs"), "export const betterAuth = () => {};\n");
    writeFileSync(
      join(dist, "constants.mjs"),
      betterAuth === "" ? "const DEFAULT_SECRET = null;\n" : `const DEFAULT_SECRET = "${betterAuth}";\n`,
    );
  }
  const bundleDir = join(dir, "out");
  if (withBundleDir) {
    mkdirSync(bundleDir, { recursive: true });
    writeFileSync(join(bundleDir, "index.js"), `globalThis.x=1;\n${bundle}\n`);
    // A sourcemap is emitted next to the bundle and is never the thing we ship;
    // the gate must not read its verdict out of one.
    writeFileSync(join(bundleDir, "index.js.map"), JSON.stringify({ sourcesContent: [DEFAULT_LITERAL] }));
  }
  return { dir, bundleDir };
}

function stubWrangler(dir, { stdout = "", stderr = "", status = 0 }) {
  const path = join(dir, "stub-wrangler.sh");
  writeFileSync(
    path,
    `#!/usr/bin/env bash\ncat <<'OUT'\n${stdout}\nOUT\ncat <<'ERR' >&2\n${stderr}\nERR\nexit ${status}\n`,
  );
  chmodSync(path, 0o755);
  return path;
}

function run({ dir, bundleDir }, wrangler) {
  const args = ["--bundle", bundleDir];
  if (wrangler) args.push("--wrangler-command", wrangler);
  const result = spawnSync(process.execPath, [guard, ...args], { cwd: dir, encoding: "utf8" });
  return { code: result.status, out: `${result.stdout}${result.stderr}` };
}

const listed = (...names) => JSON.stringify(names.map((name) => ({ name, type: "secret_text" })));

test("green: better-auth ships and the secret is bound", () => {
  const f = fixture({ bundle: `const s = "${DEFAULT_LITERAL}";` });
  const { code, out } = run(f, stubWrangler(f.dir, { stdout: listed("STRIPE_SECRET_KEY", "BETTER_AUTH_SECRET") }));
  assert.equal(code, 0);
  assert.match(out, /BETTER_AUTH_SECRET is bound/);
});

test("RED: better-auth ships and no secret is bound — the deploy must fail", () => {
  const f = fixture({ bundle: `const s = "${DEFAULT_LITERAL}";` });
  const { code, out } = run(f, stubWrangler(f.dir, { stdout: listed("STRIPE_SECRET_KEY") }));
  assert.equal(code, 1);
  assert.match(out, /::error title=BETTER_AUTH_SECRET missing::/);
  assert.match(out, /published default/);
  assert.match(out, /secret put BETTER_AUTH_SECRET/);
});

test("RED: the Worker has no secrets at all", () => {
  const f = fixture({ bundle: `const s = "${DEFAULT_LITERAL}";` });
  const { code, out } = run(f, stubWrangler(f.dir, { stdout: "[]" }));
  assert.equal(code, 1);
  assert.match(out, /no secrets/);
});

test("green: BETTER_AUTH_SECRETS, which better-auth also reads, satisfies the gate", () => {
  const f = fixture({ bundle: `const s = "${DEFAULT_LITERAL}";` });
  const { code } = run(f, stubWrangler(f.dir, { stdout: listed("BETTER_AUTH_SECRETS") }));
  assert.equal(code, 0);
});

test("quiet: a Worker that ships no better-auth is not gated", () => {
  const f = fixture({ betterAuth: null, bundle: "const s = 1;" });
  const { code, out } = run(f, stubWrangler(f.dir, { stdout: "[]" }));
  assert.equal(code, 0);
  assert.match(out, /not installed here/);
});

test("quiet: better-auth is installed but not in the bundle", () => {
  const f = fixture({ bundle: "const s = 1;" });
  const { code, out } = run(f, stubWrangler(f.dir, { stdout: "[]" }));
  assert.equal(code, 0);
  assert.match(out, /not in the deployed bundle/);
});

test("the sourcemap alone never trips the gate", () => {
  // index.js.map carries the literal in every fixture; index.js does not here.
  const f = fixture({ bundle: "const s = 1;" });
  const { code } = run(f, stubWrangler(f.dir, { stdout: "[]" }));
  assert.equal(code, 0);
});

test("fails closed when the script does not exist yet", () => {
  const f = fixture({ bundle: `const s = "${DEFAULT_LITERAL}";` });
  const stub = stubWrangler(f.dir, {
    stdout: '{"result":null,"success":false,"errors":[{"code":10007,"message":"workers.api.error.script_not_found"}]}',
    status: 1,
  });
  const { code, out } = run(f, stub);
  assert.equal(code, 1);
  assert.match(out, /does not exist on Cloudflare yet/);
});

test("fails closed, and says so plainly, when the token cannot list secrets", () => {
  const f = fixture({ bundle: `const s = "${DEFAULT_LITERAL}";` });
  const stub = stubWrangler(f.dir, {
    stdout: '{"success":false,"errors":[{"code":10000,"message":"Authentication error"}]}',
    status: 1,
  });
  const { code, out } = run(f, stub);
  assert.equal(code, 1);
  assert.match(out, /Workers Scripts Read/);
});

test("fails closed when wrangler answers something unparseable", () => {
  const f = fixture({ bundle: `const s = "${DEFAULT_LITERAL}";` });
  const { code, out } = run(f, stubWrangler(f.dir, { stdout: "not json at all" }));
  assert.equal(code, 1);
  assert.match(out, /unknown is not a pass/);
});

test("fails when better-auth carries no fallback literal to detect it by", () => {
  // A future release that renames the constant must break the gate loudly rather than
  // turn it into a check that passes because it measured nothing.
  const f = fixture({ betterAuth: "", bundle: "const s = 1;" });
  const { code, out } = run(f, stubWrangler(f.dir, { stdout: "[]" }));
  assert.equal(code, 1);
  assert.match(out, /can no longer tell/);
});

test("fails when there is no bundle to scan", () => {
  const f = fixture({ withBundleDir: false });
  const { code, out } = run(f, stubWrangler(f.dir, { stdout: "[]" }));
  assert.equal(code, 1);
  assert.match(out, /a scan over nothing is not a pass/i);
});
