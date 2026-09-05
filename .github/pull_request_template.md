<!-- Sole authored copy: templates/pull-request-template.md in tgwab-standards.
     Deployed as the org-wide default in MichalAFerber/.github and TGWAB/.github,
     and as this repo's own .github/pull_request_template.md. Keep the four
     headings. A long PR template gets deleted rather than filled. -->

## What changed

## Duplicate check — paste the output

Replace the placeholders, run it, and paste what it printed. A checkbox is a
claim; an output is evidence.

```
$ gh pr list -R OWNER/REPO --state all --search "TICKET-ID-OR-TERM"

```

**`--state all` is not optional.** Most repos here sit at zero open PRs, so the
bare search returns nothing and reads as *clear*. Measured on one ticket: the
search alone returned **0**; the same search with `--state all` returned **3**.
On 2026-09-02 three tickets were each picked up by two or three sessions at
once, and the duplicate PRs reached *ready for review* before anyone noticed.
On 2026-09-05 five more PRs were invisible to two separate scoping passes,
because every session searched branch names and each had picked a different
one. A second AI fleet works this estate concurrently, with agents sharing our
agents' names and the same worktree root, so the collision is not hypothetical.

If this PR closes a ticket, put its ID in this body. That is what makes the
check work for the next person — not for you.

## What I verified

<!-- Name the command and what it printed. "Tests pass" is not a verification;
     "npm test — 442 passed" is. A file existing is not evidence it runs: a
     workflow valid since March had zero runs, and a ruleset requiring the
     check `ci` on a repo reporting `Test (ubuntu-latest)` blocked every PR
     forever. -->

## What I did NOT verify

<!-- Required. "Nothing" is a valid answer only when it is true.
     Merging is not deploying — several repos here reach production by a manual
     step, and one audit was built, reviewed, merged, and installed but never
     scheduled, so it had zero coverage from the day it shipped. -->
