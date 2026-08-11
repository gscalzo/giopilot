# ADR 0010 — Provider presets, with optional Hetzner Inference support

## Status

Accepted.

## Context

The judge and the distillation step both speak the OpenAI `/chat/completions`
wire format, so any compatible endpoint already worked — but only if the user
knew the base URL and model string to type. Hetzner launched **Hetzner
Inference**, an OpenAI-compatible API on their own EU infrastructure
(`https://inference.hetzner.com/api/v1`, tokens from
`https://experiments.hetzner.com`), currently an experiment: no billing, no SLA,
and a single model, `Qwen/Qwen3.6-35B-A3B-FP8`. For a privacy-sensitive
extension that ships post text to a third party, a European, currently-free
option is worth making a first-class choice.

## Decision

1. **A small preset table** (`src/providers.ts`) holds the known providers —
   OpenAI (default) and Hetzner Inference — each with base URL, judge model,
   distillation model, a caveat note, and where to get a token. Options gains a
   **Provider** dropdown that fills the fields; **Custom…** remains for any other
   OpenAI-compatible endpoint, and the stored config is still the source of
   truth (a preset only writes fields when the user picks one).
2. **Hetzner uses the same model for judging and distillation.** ADR 0009 wanted
   a stronger model for the once-per-update distillation; Hetzner's experiment
   exposes exactly one model, so the preset points both at it. This is recorded
   as a known limitation of that provider, not a change to ADR 0009's principle.
3. **`response_format: {type:"json_object"}` is sent only when the provider is
   known to support it.** OpenAI does; the Hetzner experiment's support is
   unverified, and an unknown parameter can fail a request outright. For Hetzner
   the field is omitted and we rely on the code-owned JSON contract in the system
   prompt plus the parser's existing fence/whitespace tolerance. Unknown custom
   endpoints default to sending it, matching the common case.
4. **Nothing is Hetzner-specific beyond the preset.** No new permission model
   (the existing origin request covers whatever base URL is configured), no
   second client, no coupling in the judge beyond the json-mode check.

## Consequences

- Users get a two-click EU-hosted option; the extension gains no dependency on
  it, and the OpenAI default is unchanged.
- Verdict quality will differ between providers — a 35B MoE experiment is not
  `gpt-5.6-luna`. Judgments remain visibly model-sourced, and the report shows
  the likelihood, so a user can compare.
- Hetzner's experiment may change endpoint, model, or disappear; when it does,
  the damage is one stale preset entry (and Custom… still works). The preset's
  note states the experimental status in the UI rather than burying it here.
- If json mode turns out to be supported, flipping one boolean re-enables it.
