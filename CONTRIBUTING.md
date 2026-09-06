# Contributing to the TGWAB estate

This file exists because most of the rules that keep this estate working are
currently written somewhere only Claude Code sessions read. If you are a human,
a different AI agent, or a future version of any of us, this is the short list —
and every rule below was earned by something breaking.

Read it before your first change. It is deliberately short.

**This file is not copy-safe by accident — it is copy-safe by design.** It is
republished verbatim as the owner-level default for every repo that lacks its
own, so it carries no relative links; the files it names live in the private
`tgwab-standards` repo, and a link to them 404s for anyone outside it
(DEV-STANDARDS §10: *a 404 link is worse than plain text*). Keep any edit
paste-safe, so the copies can stay byte-identical and drift stays detectable.

## Where this file reaches, and where it does not

Measured 2026-09-06. A rules document that reaches nobody is worse than none,
because it looks like coverage:

- **On github.com, every repo.** An owner-level `.github` repo supplies a
  default `CONTRIBUTING.md` to every repo without one. Both
  `MichalAFerber/.github` and `TGWAB/.github` carry this file, and
  `repos/<owner>/<repo>/community/profile` resolves `contributing` to it.
- **On disk, no repo.** A default community-health file is **not** cloned into
  the repos it covers. Of 79 local clones, exactly one holds a
  `CONTRIBUTING.md`, and it is that project's own — this file is on disk in
  **zero** of them.
- **No agent loads it.** Grok reads `Agents.md`, `Claude.md`, `AGENT.md`, and
  `AGENTS.md`, from `~/.grok/` and from the repo root down to the working
  directory. Claude Code reads `CLAUDE.md`. `CONTRIBUTING.md` is in neither
  list, under any name.

So this is the **human** channel on github.com, and there it is complete. The
agent channel is `AGENTS.md` / `CLAUDE.md` — which is why this repo now carries
an `AGENTS.md` pointing here. Do not assume an agent has read this file.

---

## 1. Find out who is already working on it

**This is the rule most likely to waste your afternoon.** On 2026-09-02 three
tickets were each picked up by two or three contributors at once, and the
duplicate PRs reached *ready for review* before anyone noticed. On 2026-09-05
five PRs were invisible to two separate scoping passes on the same night.

Before you start:

```sh
gh pr list  -R <owner>/<repo> --state all --search "<term>"
gh issue list -R <owner>/<repo> --state all --search "<term>"
```

**`--state all` is not optional.** `gh pr list` defaults to open PRs and most
repos here sit at zero open, so the bare search returns nothing and reads as
*clear*. Measured on one ticket: the search alone returned **0**; the same
search with `--state all` returned **3**. The duplicate is usually already
merged — which is exactly why nobody noticed it.

**Put a searchable identifier in your PR body** (`Closes #N`), or the check has
nothing to find for the next person.

## 2. Resolve the owner; never assume it

The estate spans **two** GitHub accounts — `MichalAFerber/` and `TGWAB/` — and
repos migrate between them. GitHub redirects a transferred repo, so the old
path still resolves and **nothing fails loudly to tell you it moved**.

```sh
gh api repos/<owner>/<name> --jq .full_name    # prints the current truth
```

At least one repo exists only under `TGWAB/` and will never appear in a listing
of the other.

## 3. Open a draft. Do not merge your own work

Three hands, in order, and nobody skips a step:

| who | does |
| --- | --- |
| contributor | opens the PR **as a draft** |
| maintainer | reviews, then marks it ready for review |
| Michal | merges |

Draft is a *state*, not a convention — which is the point. A warning can be
forgotten; a draft cannot be merged.

## 4. Claims are part of the change

An inaccurate claim in a code comment, commit message, PR body, review, or
release note is a **defect in its own right**, not a style issue. Two kinds
fail differently, so they are checked differently.

**A claim about a mechanism** — why a line is safe, what a library does, what a
check would report if you changed it — is DEV-STANDARDS §15 **trap 9**. Nothing
this estate has can test it: lint, tests, and CI all report green while it is
wrong, and "no non-comment line changed" states that the gates are blind to the
change, not that it is safe. So a mechanism claim **MUST** be traced against
control flow before it is written, and read in full, as prose, by someone who is
not its author.

**A number fails the opposite way: it is falsifiable — so falsify it, and say
how.** On 2026-09-05 one question, *how many repos declare `eslint`*, produced
**11, 13, and 16** from three sincere instruments in a single night. The answer
is **17**, and it is recorded with its method because the method is what makes
it trustworthy: a completed serial enumeration of every non-archived repo's
default branch across both owners. A parallel run of the same 124 calls tripped
GitHub's secondary rate limit and returned 13, because an empty response is
indistinguishable from "declares no `eslint`." A count without a method is not a
weak finding; it is not a finding.

The same applies to citations. Open every `#N`, file path, and section reference
you cite and confirm it says what you claim. A migration header once cited an
issue about job-scheduling as the origin of a rule about delete cascades; it
survived a clearance because the reviewer verified the arithmetic and never
opened the citation.

## 5. An empty result is a claim about your instrument, not the world

Before believing any negative — *not found*, *clean*, *zero*, *nothing matches* —
run the same instrument against something you **know** matches, and say so.
Before believing a positive, prove it can produce a negative.

Real failures from this estate, all of which looked like clean answers:

- `gh api .../logs` returns a **ZIP**, so a log full of your search string greps
  to zero. Use `gh run view --log`.
- Firing many `gh` calls quickly hits a **secondary** rate limit; failed calls
  return empty and read as *"no results"*. Go serial; count failures separately
  from negatives.
- `path=` as a shell variable in **zsh** silently destroys `PATH`; every command
  afterwards returns "command not found" and every `grep -c` returns 0.
- A file that 404s because *your PR adds it* returns zero matches on the default
  branch. That is a 404, not a measurement.
- GitHub code search **does not index forks**, so any estate-wide count built on
  it silently omits them.

## 6. A file existing is not evidence it works

A workflow file is not a workflow: check it has ever run, and what its
conclusion was. A `Makefile` target is not a working build: run it. A green
check is not a deploy.

> Two premises in one task brief were false on exactly this — a CI config that
> "solved the dependencies" whose only run had failed, and packaging targets
> that "encoded real knowledge" and had never once succeeded.

**And merging is not deploying.** Several repos here reach production only via a
manual step. Say what you verified and what you did not.

## 7. Estate agents: the shared `~/GitHub` checkout

*Scope: agents and maintainers working the estate's shared workstation clones.
If you are an outside contributor working from your own fork or clone, none of
this section applies to you — skip to 8.*

Everything under `~/GitHub` is a **single checkout shared by several concurrent
sessions**. Moving `HEAD` silently redirects someone else's work — a
`git checkout` performed *to read a file* once landed another contributor's
commit on the wrong branch.

Read without touching the working tree:

```sh
git -C <repo> fetch -q origin
git -C <repo> show origin/main:path/to/file
```

To write, use a worktree, and **bind the `cd` to the `add`** so a failure cannot
leave you writing in the shared clone:

```sh
git worktree add "$WT" <branch> && cd "$WT" || exit 1
```

## 8. Things that cost real data

- **Confirm destructive operations twice**, stating the literal target with its
  object count — *and what cascades from it*. An approved one-row delete removed
  four; the three children were unread and therefore unrestorable.
- **Never commit secrets, and check history before making a repo public.**
  Publishing exposes every commit, not the current tree.
- **Never mint long-lived credentials.** Scope tokens to the task and delete
  them as the task's final step.
- **Monitor-only means monitor-only.** Several audits deliberately report
  without remediating. Do not convert a reporting job into an acting one because
  it seemed helpful.

## 9. Repo conventions

- Public + MIT is **Class A**; the class **MUST** appear in the README's first
  paragraph and match the `LICENSE`. A repo shipping MIT while its README calls
  itself internal is a contradiction that ships.
- Every Class A/B repo needs a row in `REGISTRY.md` — that file, not any local
  list, is the authority on what exists.
- `main` is PR-protected in most repos. Branch, push, open a PR — and **open it
  against the default branch**, unless it is deliberately stacked and carries the
  `stacked-pr` label, in which case whoever merges it confirms the base itself
  reaches the default branch. A PR merged into a non-default base reads
  **Merged** in the UI, in `gh pr list`, and in the registry, while `main`
  silently lacks the work, and nothing in the normal review surface shows the
  gap. `templates/pr-base-guard.yml` is the gate.
- Match the repo you are in. Its conventions beat your defaults.

---

## The one-line version

**Say what you measured, how you measured it, and what you did not check.**
Almost every rule above is a specific instance of that, and the estate's most
common defect is not broken code — it is a check that reports success while
doing nothing.

Full standards: `DEV-STANDARDS.md`. Product map: `REGISTRY.md`. Both live in the
private `tgwab-standards` repo; they are named, not linked, so this file stays
safe to republish.
