# Configuration

[← Back to README](../README.md)

giopilot reads configuration from a **global** and a **project** directory; the project
overrides the global.

```
~/.giopilot/            # global
./.giopilot/            # project (current working directory)
├── settings.json       # { "model": "auto", "permissions": { ... } }
├── skills/
│   └── <name>/SKILL.md
├── extensions/
│   └── *.ts | *.mjs | *.js
└── memory/
    ├── <slug>.md
    └── MEMORY.md        # generated index
```

## `settings.json`

```json
{
  "model": "auto",
  "permissions": { "shell": "deny", "url": "deny" }
}
```

| Key | Type | Default | Meaning |
|---|---|---|---|
| `model` | string | `"auto"` | Model id passed to the Copilot session. `auto` lets Copilot route. |
| `permissions` | object | `{}` | Per-kind allow/deny policy (see below). |

Unknown keys are ignored; a malformed file falls back to defaults (never throws).

## Permissions

By default giopilot **approves every tool request**. Restrict specific kinds in
`settings.json`:

```json
{ "permissions": { "shell": "deny", "write": "allow" } }
```

Kinds: `shell`, `write`, `read`, `url`, `mcp`, `custom-tool`, `memory`, `hook`. A kind set
to `"deny"` is rejected; anything else is approved.

Extensions can add **fine-grained gates** via `gio.gatePermission(req => …)`. Gates run
first (the first one to return a decision wins); the settings policy applies only when all
gates abstain. See [Extensions](./extensions.md) and
[ADR&nbsp;0005](./adr/0005-permission-gating.md).

## Credits token

The status-line credits are fetched with your `GITHUB_TOKEN` / `GH_TOKEN` env var, falling
back to `gh auth token`. To show a different account's credits (e.g. a Copilot Enterprise
org), set `GITHUB_TOKEN` to that account's token. See [Notes → Credits](./notes.md#credits).
