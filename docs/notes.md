# Notes & known limitations

[← Back to README](../README.md)

Honest caveats, gotchas, and things to know.

## Models are account-bound

`/model` lists exactly what `client.listModels()` returns, which is what your **Copilot
account is entitled to** — not a giopilot filter. A different account (e.g. a Copilot
Enterprise org) will see more models. `auto` is always available and lets Copilot route.

## Telemetry is off

The SDK's internal session telemetry defaults to **on** for GitHub-authenticated sessions
(`SessionConfig.enableSessionTelemetry`). giopilot pins it to `false` on every
`createSession` (`harness.ts`), so no session telemetry is sent. The separate OpenTelemetry
hook (`CopilotClientOptions.telemetry`) is never configured, so it's off as well.

## Credits

The status-line credits come from GitHub's **undocumented** `copilot_internal/user`
endpoint — the same source and computation the VS Code Copilot extension uses
(`used = entitlement × (1 − percent_remaining/100)`, shown as `used / total used`). Because
it's unofficial, it may change; giopilot treats every failure as "no credits" and simply
omits the segment.

Credits reflect the **authenticated account**. giopilot uses `GITHUB_TOKEN` / `GH_TOKEN`, or
`gh auth token`. To show a Copilot Enterprise org's credits, set `GITHUB_TOKEN` to that
account's token. See [ADR&nbsp;0007](./adr/0007-credits-endpoint.md).

## The TUI needs a TTY

The Ink interface requires an interactive terminal. CI and piped contexts should use the
one-shot form: `giopilot "<task>"`. The interactive parts are covered by
`ink-testing-library` and `SessionController` unit tests.

## Releases

`release.yml` is wired but unexercised until the first tag. Before releasing:

- add an **`NPM_TOKEN`** repo secret;
- confirm the npm package name **`giopilot`** is available (`npm view giopilot`);
- until published, `giopilot update` will report "couldn't reach" — expected.

## CI

The workflows pin `actions/checkout@v4` / `setup-node@v4`, which GitHub flags as Node-20
actions (deprecating mid-2026). Harmless today; bump when convenient.

## Future: non-Copilot models & ChatGPT-subscription auth (BYOK)

The Copilot SDK can talk to non-Copilot models via its **BYOK** path —
`SessionConfig.provider` (`ProviderConfig`): a `baseUrl` + `apiKey`/`bearerToken` against an
OpenAI-compatible endpoint, with `type: "openai" | "azure" | "anthropic"`. This covers:

- **Local models via Ollama** — `baseUrl: http://localhost:11434/v1`, no key needed.
- **OpenAI / Azure / Anthropic by API key** — pay-as-you-go.

Pair it with `CopilotClientOptions.onListModels` so `/model` lists the BYOK models. Note: the
SDK force-disables session telemetry whenever a BYOK `provider` is set.

**ChatGPT Plus/Pro subscription (Codex) is the open question.** Pi
([`badlogic/pi-mono`](https://github.com/badlogic/pi-mono)) supports subscription logins
(Claude Pro/Max, ChatGPT Plus/Pro via Codex OAuth, GitHub Copilot) because it ships its **own**
provider/auth layer (`packages/ai`) with a Codex OAuth/device-code flow — it does not go
through the Copilot SDK. The Copilot SDK has **no** OAuth-subscription path; `ProviderConfig`
only accepts `apiKey`/`bearerToken`. So giopilot can't get the ChatGPT subscription "for free."

Two routes if we want it:

1. **Piggyback on the SDK** — implement the Codex OAuth/device-code flow ourselves, then feed
   the resulting bearer token into `ProviderConfig.bearerToken` (`type: "openai"`, likely
   `wireApi: "responses"`). _Unverified_: whether Codex's endpoint is OpenAI-compatible enough
   to work this way is the spike that gates this option.
2. **Bypass the SDK model layer** — reuse Pi's `@mariozechner/pi-ai` package for inference and
   keep the Copilot SDK only for the harness bits we still want.

## Out of scope (for now)

A true Pi-style own-the-loop ReAct agent (the SDK is managed-only), MCP wiring (add via an
extension), themes, and session persistence.
