# require-better-auth-secret

Refuses to deploy a Cloudflare Worker whose bundle ships `better-auth` while no
session-signing secret is bound to it. It fails the deploy job; it never warns.

## Why

`better-auth` does not refuse an unset secret — it substitutes one. In 1.7.4,
`dist/context/create-context.mjs`:

```js
const legacySecret = options.secret || env.BETTER_AUTH_SECRET || env.AUTH_SECRET || "";
secret = legacySecret || "better-auth-secret-12345678901234567890";
validateSecret(secret, logger);
```

`validateSecret` throws for that default only when `NODE_ENV === "production"`, which a
Cloudflare Worker never sets. A Worker missing the secret therefore signs every session
with a constant published on npm, forgeable by anyone who can read the package.

On 2026-09-16 `simba-control-plane-alpha` was found doing exactly that, with the literal
default present in its deployed bundle. The only thing between that and forged staff
sessions was Cloudflare Access — a control nobody had designed for the purpose.

## What it measures

Two facts, both read rather than assumed:

1. **Does the artifact about to be uploaded ship better-auth's session signer?** The gate
   builds the bundle with `wrangler deploy --dry-run --outdir` (no credentials needed) and
   looks in it for better-auth's fallback-secret literal, which it reads out of the
   *installed* package rather than hardcoding. A better-auth release that changes that
   constant does not silently disarm the gate: if the literal cannot be found in the
   installed package at all, the gate fails and says so.

   A Worker that ships no better-auth exits 0 with a notice. A guard that fires on Workers
   with no auth is noise, gets disabled, and then protects nothing.

2. **Is a session-signing secret bound to the live script?** `wrangler secret list` reads
   the deployed script's secret bindings — not an intention recorded in config. Secrets
   survive a deploy (wrangler's own `--keep-vars` help: *"Note that secrets are never
   deleted by deployments"*), so what is bound now is what will be bound after this deploy.
   That is why the check runs **before** the upload: the same fact as a post-deploy binding
   check, but in time to prevent the forgeable Worker going live.

Any answer other than "the secret is bound" fails the job, and each failure reads
differently: no secret bound, the script does not exist yet, the token may not list
secrets, or wrangler said something unparseable. Unknown is not a pass.

## Requirements

- Run it **after** the repo's build and `npm ci`/`pnpm install`, and **before** the deploy step.
- The Cloudflare API token needs **Workers Scripts Read** (Workers Scripts Write also
  satisfies it — the token that deploys already has it).
- Pass the same `config` and `environment` the deploy step passes, or the gate reads a
  different script than the one about to be deployed.

## Use

```yaml
      - name: Refuse to deploy better-auth without a session-signing secret
        uses: TGWAB/.github/.github/actions/require-better-auth-secret@<commit-sha>
        with:
          api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}

      - name: Deploy
        uses: cloudflare/wrangler-action@ebbaa1584979971c8614a24965b4405ff95890e0 # v4.0.0
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          wranglerVersion: '4'
          command: deploy
```

With a subdirectory Worker, an environment, or a config path:

```yaml
        with:
          api-token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          working-directory: worker
          environment: alpha
          config: ../../infra/operator/control-plane/wrangler.jsonc
```

`names` defaults to `BETTER_AUTH_SECRET,BETTER_AUTH_SECRETS,AUTH_SECRET` — every name
better-auth reads for itself. Override it only when the Worker passes `secret` to
`betterAuth()` from a differently named binding.

## Tests

`node --test .github/actions/require-better-auth-secret/test/guard.test.mjs`, run by this
repo's `ci` workflow. The suite covers the red (better-auth shipped, nothing bound), the
green, the quiet cases, and every fail-closed branch, driving the Cloudflare half through a
stub `wrangler`. Turning the gate into a warning fails seven of its twelve tests; blinding
the bundle scan fails six.
