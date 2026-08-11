# AI-Tell Meter

A Chrome (Manifest V3) extension that flags **AI-typical writing patterns** in your
LinkedIn feed. Each post — and, optionally, each comment — gets a coloured border —
green / yellow / red — and a badge; clicking the badge opens a report modal that lists
every detected tell (em dashes, "not X, it's Y" contrast templates, stock AI
vocabulary, emoji listicles, …) and highlights exactly where each one occurs.

> **This is a density meter, not an authorship oracle.** It measures how heavily a post
> leans on patterns over-represented in LLM output. Humans — especially ghostwritten,
> engagement-optimised LinkedIn humans — write like this too. Red means "dense with
> AI-typical patterns", never "this person used AI".

## How it works

1. **Heuristic engine (always on, fully local).** Deterministic detectors scan each
   post and return flags with exact character offsets, weighted by specificity. The
   score is flag-weight per 100 words: `< 3` green, `3–7` yellow, `≥ 7` red. Posts
   under 40 words or mostly non-Latin text get **no verdict** (grey badge) — too
   little signal for an honest read.
2. **Cloud judge (optional, off by default).** Any OpenAI-compatible API
   (base URL + model + API key, configured in Options) gives a second opinion:
   a 0–1 likelihood plus verbatim quotes it found suspicious, which are located back
   to offsets locally. The final tier is the rounded-up average of the two opinions.
   ⚠️ **Privacy:** enabling this sends post text to the endpoint you configure.
3. **Truncated posts.** Posts clamped behind "…see more" are scored on the visible
   text only and marked *partial* (◐ on the badge). The extension never clicks
   LinkedIn's UI or calls LinkedIn's internal APIs — it only reads the DOM you are
   already looking at.
4. **Comments (optional, on by default).** Visible comments run through the same
   engine with a lower abstain floor (20 words instead of 40) and compact
   decoration; comments with no verdict get no badge at all, so short "Congrats!"
   replies stay unmarked. Toggle in Options. See
   [ADR 0004](./docs/adr/0004-comment-checking.md).

## Install (unpacked)

```bash
npm install
npm run build
```

Then open `chrome://extensions`, enable *Developer mode*, *Load unpacked*, and pick
the `dist/` folder. Visit `https://www.linkedin.com/feed/` — the content script runs
only there.

To enable the cloud judge: extension → *Options* → set base URL / model / API key and
tick *Enable cloud judge*. Chrome will ask to grant access to the API host
(the extension requests that origin only, at save time).

## Development

Mirrors giopilot's gates: **TDD**, ESLint cyclomatic complexity ≤ 5, and
`npm run check` (lint + typecheck + coverage ≥ 80%) before committing.

```
src/core        detectors, scoring, quote location — pure, fully tested
src/judge       OpenAI-compatible judge client
src/adapters    SiteAdapter interface + the LinkedIn adapter (the ONLY file that
                knows LinkedIn's DOM)
src/content     border/badge decoration, report modal, orchestrator glue
src/background  service worker: owns the API key, caches judge verdicts
src/options     options page
```

Supporting another site (the "other pages with text blocks" ambition) means writing
one new `SiteAdapter` and a manifest entry — nothing in core changes.

Decisions are recorded in [docs/adr/](./docs/adr/). This folder is deliberately
self-contained (own package.json, lint, tests) so it can be extracted to its own
repository with a `git subtree split`.
