# Usage

[← Back to README](../README.md)

## Running

```bash
giopilot                      # interactive TUI (default)
giopilot "<task>"             # one-shot: run a single task, then exit
giopilot --model <id>         # start with a specific model (e.g. gpt-5-mini)
giopilot update               # check npm / GitHub for a newer version
giopilot --help               # usage
giopilot --version            # version
```

The first run may prompt you to authenticate with GitHub Copilot (the SDK manages the
bundled Copilot CLI).

## The TUI

Type a prompt and press Enter. Slash commands start with `/`; press **Tab** to autocomplete.

| Command | What it does |
|---|---|
| `/skills` | List available skills (one line each) |
| `/skill:<name>` | Load a skill's full instructions and act on it |
| `/model` | Open a picker to switch the model (from `client.listModels()`) |
| `/<command>` | Run an extension-registered command |
| `/help` | Show help |
| `/exit`, `/quit` | Leave giopilot |

Assistant text streams in; tool calls appear as dim `[tool: …]` notices.

## The status line

The header is a single status line:

```text
model: auto · idle · ⎇ main · ◆ 7.4 / 200 used
```

- **model** — the active model.
- **status** — `idle` or `thinking` (a turn is in flight).
- **⎇ branch** — the git branch of the working directory (omitted outside a repo).
- **◆ credits** — your GitHub Copilot **Credits**, shown as `used / total used`, computed
  exactly as the VS Code Copilot extension does (see [Notes](./notes.md#credits)). Omitted
  when unavailable.

## Models

The available models depend on your Copilot account entitlement, not on giopilot —
`/model` lists exactly what `client.listModels()` returns. Set a default in
[`settings.json`](./configuration.md), or pass `--model`.

## Self-update

`giopilot update` queries the npm registry (then GitHub Releases) and reports whether a
newer version exists, with the upgrade command. It never updates silently.
