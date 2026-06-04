# Notes & known limitations

[← Back to README](../README.md)

Honest caveats, gotchas, and things to know.

## Models are account-bound

`/model` lists exactly what `client.listModels()` returns, which is what your **Copilot
account is entitled to** — not a giopilot filter. A different account (e.g. a Copilot
Enterprise org) will see more models. `auto` is always available and lets Copilot route.

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

## Out of scope (for now)

A true Pi-style own-the-loop ReAct agent (the SDK is managed-only), MCP wiring (add via an
extension), themes, and session persistence.
