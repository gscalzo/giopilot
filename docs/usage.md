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

Assistant text streams in; tool calls appear as dim `[tool: …]` notices. The input sits
between two full-width rules; the prompt shows a `›` chevron when idle and an animated
spinner while the model is working.

### Shell commands (`!`)

Start a line with `!` to run the rest in a subshell — handy for a quick `git status` or
`ls` without leaving the session. The leading `!` becomes a yellow `!` prompt glyph and the
field turns yellow, so it's clear you're in shell mode (erasing the command leaves it).

```text
─────────────────────────────────────────────
! git status
─────────────────────────────────────────────
```

The command's stdout/stderr (and a `[exit N]` note on failure) is printed to the
transcript. It is **display-only**: shell output never enters the agent's context, so the
model doesn't see the command or its result. See
[ADR 0008](./adr/0008-shell-passthrough-not-in-context.md).

## The status line

A single status line sits just below the input:

```text
─────────────────────────────────────────────
› your prompt here
─────────────────────────────────────────────
giopilot  model: auto · idle · ⎇ main · ◆ 7.4 / 200 used
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
