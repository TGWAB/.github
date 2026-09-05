---
name: Defect
about: Something is broken, or a check reported the wrong answer
title: ""
labels: bug
---

<!-- Sole authored copy: templates/issue-defect.md in tgwab-standards.
     Deployed as the org-wide default issue template in MichalAFerber/.github
     and TGWAB/.github. -->

## What is wrong

## The instrument

The command, query, or observation that produced this. Paste it with its output.

```
$

```

## The control

Run that same instrument against a case you **know** matches, and one you know
does not. Paste both results.

- known-present case returned:
- known-absent case returned:

An empty result is a claim about your instrument, not the world. A check that
returns the wrong answer confidently is worse than no check, because it closes
the question (DS §15 names this trap 4: establish what the instrument returns
for a known-present and a known-absent case before reading its output).

<!-- Every one of these read as a clean answer:
     - `gh api .../actions/runs/<id>/logs` returns a ZIP, so a log full of your
       search string greps to 0; the per-job endpoint returns 0 bytes.
     - `path=` as a zsh variable destroys PATH, so every later `grep -c` is 0.
     - GitHub code search does not index forks, so the estate's one fork was
       invisible to every count derived from it.
     - Firing many `gh` calls quickly hits a *secondary* rate limit; the failures
       return empty and read as "no results".
     - CLAUDECODE=1 makes vitest select MinimalReporter, which drops console.log
       from passing tests. Three reviewers filed the same false finding
       independently — they shared a shell.
     - A multi-line `//` comment breaks a phrase across lines, so a
       contiguous-string grep returns 0 where the text is present in 11 repos. -->

## Expected, and actual

## What I did NOT check

<!-- Required. -->
