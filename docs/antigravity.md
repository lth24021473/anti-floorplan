# Floorplan in Antigravity

Floorplan is packaged as a native **Google Antigravity** plugin (`plugin.json`, `skills/floorplan/`, and `agents/`), and also continues to support Claude Code, Codex, and unattended CI pipelines.

## What you need

- **Google Antigravity** (Antigravity 2.0 desktop app, Antigravity IDE, or the Antigravity CLI `agy`).
- **[Node.js](https://nodejs.org) 18 or newer.** Floorplan's scripts use built-in Node APIs with zero external dependencies (`node --version`).
- **The Antigravity CLI (`agy`)** for the map's live Ask bar, requested flows, and interactive blueprint changes.

## Install

### Option 1: Antigravity CLI (`agy`)

Install directly from a local folder or repository:

```bash
agy plugin install /path/to/floorplan
```

Verify installation and check active status:

```bash
agy plugin list
```

### Option 2: Workspace or Global Plugin Directory

- **Global (all projects):** copy or symlink the plugin folder into `~/.gemini/config/plugins/floorplan/`.
- **Workspace-scoped (single project):** place or symlink the plugin folder into `<project>/.agents/plugins/floorplan/`.

Validate the plugin strictly at any time:

```bash
agy plugin validate --strict /path/to/floorplan
```

## Making and updating a map

Start a session in Antigravity (or run `agy` in your project folder) and ask:

> Make me a floorplan of this app.

Or invoke the skill explicitly with `/floorplan`.

On large codebases (> ~150 files), Floorplan fans description worksheets out in parallel across the bundled `floorplan-describer` subagent (`model: flash`) or via `run_workflow`.

To update an existing map after editing code, ask:

> Update the floorplan.

`refresh.mjs` re-scans, preserves unchanged descriptions across renames/moves, flags changed exports/routes for review, and highlights what changed under **Recent work**.

## Asking questions (`agy` read-only mode)

When `open.mjs` or `node floorplan/serve.mjs` starts the map's local server for an Antigravity map, the Ask bar runs `agy` in streaming JSON mode (`--input-format stream-json --output-format stream-json --json-schema ... --disable-slash-commands`) with a generated read-only session settings file (`floorplan/.cache/agy-readonly-settings.json`):

- Allows `command(node floorplan/query.mjs)` so the CLI can query the map.
- Denies `write_file(*)`, `read_url(*)`, `execute_url(*)`, `download_url(*)`, `mcp(*)`, and reading generated map internals (`floorplan/index.html`, `serve.mjs`, `page-safety.mjs`, `floorplan/.cache`).
- Resumes multi-turn follow-ups via `--conversation <id>`.

You can also use the bundled `floorplan-analyst` custom agent (`agy --agent floorplan-analyst` or `/agents`) inside Antigravity for interactive, map-first architecture exploration.

## Editor links (`antigravity://`)

Maps built or served under Antigravity default **Open in editor** and **Open handler** links to `antigravity://file/{path}:{line}`. Override at any time with `--editor vscode` (or `cursor`, `zed`, etc.) on `open.mjs`/`serve.mjs`, or `"editor"` in `floorplan/architecture.json`.

## Workspace rule memory (`.agents/rules/floorplan.md`)

On your first code map, Floorplan offers to create `.agents/rules/floorplan.md` (`trigger: model_decision`). When enabled via `build.mjs <root> --agy-rule`, future Antigravity sessions automatically discover the map when answering "where is X" or "how does Y work" questions, and the file is ignored locally via `.git/info/exclude` without touching `.gitignore`. Put `<!-- floorplan:off -->` in `.agents/rules/floorplan.md` to opt out permanently.
