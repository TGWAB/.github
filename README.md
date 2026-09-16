# `.github` — default community health files

This repo holds the files GitHub surfaces across **every repo under this owner
that does not carry its own copy**, and the shared GitHub Actions the estate's
deploy jobs call by SHA.

| file | applies to |
| --- | --- |
| [`CONTRIBUTING.md`](./CONTRIBUTING.md) | every repo under this owner without its own |
| [`.github/actions/require-better-auth-secret`](./.github/actions/require-better-auth-secret) | any repo, either owner, that deploys a Worker shipping `better-auth` |

**A public `.github` repo is required for these defaults to apply to public
repos.** A private one applies only to private repos, which would have silently
covered a small minority of this estate — the failure being that it *looks*
deployed either way.

**The shared actions are defined here, not copied here.** Consumers reference them as
`TGWAB/.github/.github/actions/<name>@<sha>`, so there is one definition and no drift. They
cannot live in `tgwab-standards`: GitHub only lets a private repo's actions be used by
repos owned by the same user, and the consumers span both `MichalAFerber` and `TGWAB`. A
public repo is the only shape that reaches all of them — which is also why a change here
reaches production deploys, and why the actions carry tests that run on every PR.

Community health files have a different rule. Canonical source:
[`MichalAFerber/tgwab-standards`](https://github.com/MichalAFerber/tgwab-standards) — edit
them there and copy here.
