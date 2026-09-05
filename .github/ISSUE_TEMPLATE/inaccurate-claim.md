---
name: Inaccurate claim
about: A comment, commit message, PR body, doc, or release note states something untrue
title: ""
labels: documentation
---

<!-- Sole authored copy: templates/issue-inaccurate-claim.md in tgwab-standards.
     Deployed as an org-wide default issue template in MichalAFerber/.github
     and TGWAB/.github. -->

An inaccurate claim is a defect in its own right, not a style issue (DS §15,
trap 9). Lint, tests, and citation checks cannot read prose, so every gate can
be green while one ships — and has been.

## The claim, quoted

<!-- Exact text, with a permalink to the line. -->

## Where it appears

<!-- File and line, commit message, PR body, review, or release note. -->

## Why it is wrong

<!-- Trace it: name the line, the command, or the source that refutes it. A
     claim with no trace behind it is what this catches, and a correction with
     no trace is the same defect again. One commit message claimed a change its
     own diff did not contain. A migration header cited an issue about job
     scheduling as the origin of a rule about delete cascades; it survived
     review because the reviewer checked the arithmetic and never opened the
     citation. -->

## Every place that repeats it

<!-- Required, and this is the half that gets skipped. List each copy, or say
     "none" and show how you searched. A corrected figure once failed to
     propagate to the two numbers derived from it — three times, in the document
     whose subject was that exact defect. One question about a single count
     produced 11, 13, 14, 15, 16, and 17 from six sincere instruments in one
     night. -->
