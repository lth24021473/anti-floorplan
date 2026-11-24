---
name: floorplan
description: >-
  Draw an interactive, plain-English codebase map (single repo, monorepo, or
  multi-repo) where every subsystem, module, file, and endpoint has a
  human-readable name and description, connected by imports and HTTP calls, with
  health checks, screens, guided flows, recent work highlights, and live Ask
  Q&A. Also use before code exists to plan a blueprint map from a PRD, spec, or
  description, or to update an existing floorplan.
---

# Floorplan

Produce `floorplan/` at the codebase root: an interactive architectural map that someone new can read like a system diagram. Every card shows a plain-English name and one-line description, with the real path underneath.

- **You write:** `floorplan/architecture.json` (subsystems, modules, flows, tour) and `floorplan/descriptions/*.json` (a name and description for every file and route) — or `floorplan/plan.json` for a blueprint.
- **Scripts generate:** `floorplan/graph.json`, `floorplan/index.html`, `floorplan/serve.mjs`, `floorplan/query.mjs`, and `floorplan/page-safety.mjs`.

Scripts live under `<skillDir>/scripts/` (the folder containing this `SKILL.md`). Always run them with `node <skillDir>/scripts/<script>.mjs <root>` from `run_command`, passing `<root>` (the workspace or multi-repo parent folder; `.` if omitted). Never run a single shell command with `$ARGUMENTS`; extract `<root>` and `--refresh` from the user's request.

## Step 0: Check existing map

Always run this first:

```bash
node <skillDir>/scripts/status.mjs <root>
```

- If a map or blueprint already exists (and the user didn't ask to start over), follow **Refresh an existing map** below.
- If the user wants to plan an app that has no code yet (from a PRD, spec, or system description), follow **Nothing built yet? Draw a blueprint** below.
- Otherwise follow **First run** below.

---

## Nothing built yet? Draw a blueprint

Use this when there is no code for the system yet, even if the folder holds docs or other files.

1. **Read the input.** Read the PRD file, spec, or pasted description. Ask 2–3 questions only if something fundamental is open (who uses it, web or mobile, whether users sign in, whether money changes hands); otherwise decide and record your choice in `assumptions`.
2. **Read the formats.** Read [references/blueprint.md](references/blueprint.md) and [references/schema.md](references/schema.md). If the PRD came only in chat, save it as `docs/prd.md` and set `"source": "docs/prd.md"` so the map and later questions can cite it.
3. **Write `floorplan/plan.json`** and **`floorplan/architecture.json`**:
   - Include every planned file, screen URL (`screen`), endpoint (`method`, `path`, `file`, `name`, `description`, `access`, optional `who` / `publicBecause`), `uses`, `calls`, `services`, `data`, `stack`, `assumptions`, and `questions`.
   - Write `architecture.json` with plain-language parts, external nodes for services and data stores, `paths` globs covering all planned files, 1–3 flows, and a 3–8 stop `tour`.
4. **Convert and build:**
   ```bash
   node <skillDir>/scripts/plan.mjs <root>
   node <skillDir>/scripts/build.mjs <root>
   ```
   Fix reported errors/warnings until both are clean. Skip `describe.mjs` and `recent.mjs` (names and descriptions come from `plan.json`, and blueprints never add workspace rules).
5. **Show it:** run `open.mjs` (see Step 8 below).
6. **Report:** give the URL, the system shape in 3–5 lines, chosen stack, main assumptions, and design review questions/warnings. Mention that:
   - every part has **Build this with Antigravity** (a ready prompt to build that piece);
   - switching the Ask bar to **Change** lets them modify the plan directly from the map (and **Resolve on the map** prefills review items);
   - `plan.json` and `architecture.json` can be edited anytime, and `floorplan/` stays out of git.

To update a blueprint after editing `plan.json` or `architecture.json`, run `refresh.mjs <root>`. Once code is built and the user wants a map of the real code, run `refresh.mjs <root> --from-code` (keeping `plan.json` intact) and continue as a code refresh.

---

## Refresh an existing map

When `status.mjs` reports an existing map, do not start over. Run:

```bash
node <skillDir>/scripts/refresh.mjs <root>
```

It re-scans, compares content/signature fingerprints, carries descriptions over across renames/moves, prunes deleted files, flags entries whose exports or routes changed with `review`, rebuilds, and prints a `NEXT` list.

Act only on what `NEXT` requests:
- `fix_build` / `assign_new_files` / `review_structure`: update `floorplan/architecture.json` (add globs for new directories under `"unassigned, by directory"`, fix stale flow/tour/annotation refs, update summaries if large) and rebuild.
- `describe`: run `describe.mjs <root>` (writes worksheets only for new or `REVIEW`-flagged items), update those `descriptions/*.json` entries (dropping `"review"` once accurate), and rebuild.
- `recent_work`: follow Step 7 (`recent.mjs`).

Finally run `open.mjs` (Step 8) and report what changed (highlighted under **Recent work**). Always show the map even when nothing changed.

---

## Workflow (first run)

### 1. Scan

```bash
node <skillDir>/scripts/scan.mjs <root>
```

It writes `floorplan/.cache/scan.json` and prints a compact summary: repos, code tree with LOC, entrypoint candidates, heaviest directory-to-directory import edges, HTTP call-to-route matches across repos, external packages, hosts, and framework sections (Nuxt, Laravel, Firebase, Supabase Edge Functions, Serverless Framework, Shopify themes). Work from the printed summary; do not read `scan.json` directly (it is large).

### 2. Read the contract

Read [references/schema.md](references/schema.md) and [references/choosing-boundaries.md](references/choosing-boundaries.md).

### 3. Explore just enough

Use `read_file` to inspect READMEs, manifests (`package.json`, `pyproject.toml`, `go.mod`, `composer.json`, `Package.swift`, `docker-compose.yml`, deploy configs), and key entrypoints. Skim 1–2 files per candidate subsystem (top ~80 lines) until you can summarize each part in one plain sentence.

### 4. Write `floorplan/architecture.json`

Aim for:
- **3–9 top-level nodes**, and **3–12 children** under any large node (> ~24 files);
- `paths` globs covering **> 90%** of included files (`unassigned < 10%`);
- `external` nodes for databases and third-party services actually used (with `packages` and/or `hosts` so `build.mjs` auto-links them);
- explicit `edges` only for links static analysis cannot see (queues, cron/schedules, webhooks, env-configured URLs, Firebase/Serverless background triggers to `worker` nodes);
- **1–3 `flows`** explaining the app's main end-to-end jobs;
- **3–8 `tour` stops** in newcomer reading order (overview -> user-facing apps -> main server -> outside services -> an important screen file).

**Audience (`everyone` by default):** write `project.summary`, node `label`/`summary`, flow notes, and `tour` in plain everyday language for the app's owner (see "Plain language" in [references/writing-descriptions.md](references/writing-descriptions.md)). Framework names may appear once in `project.summary`; keep them out of node summaries unless `"audience": "developers"` is requested. Always say what the code does **today** (call out stubs/placeholders plainly).

### 5. Build and fix

```bash
node <skillDir>/scripts/build.mjs <root>
```

Fix every error and tighten globs until `unassigned` is under 10%. Address `plain language:` warnings by using the suggested plain wording, and split coarse parts ("holds N files and no smaller parts") into feature children.

- `floorplan/` creates its own `.gitignore` (`*`) so nothing Floorplan generates is committed. If git already tracked files there, pass the printed `git rm -r --cached` command to the user.
- **Workspace memory rule (`.agents/rules/floorplan.md`):** `build.mjs` never modifies files outside `floorplan/` on its own and reports `AGY RULE  not added`. Offer it once to the user in Step 8; only if they say yes, run `node <skillDir>/scripts/build.mjs <root> --agy-rule` (adds a `model_decision` rule ignored locally via `.git/info/exclude`).

### 6. Describe every file and route

```bash
node <skillDir>/scripts/describe.mjs <root>
```

This generates per-module worksheets (`floorplan/.cache/worksheets/<key>.md`) and skeletons (`floorplan/descriptions/<key>.json`), quoting endpoints and very short files with secrets masked.

Read [references/writing-descriptions.md](references/writing-descriptions.md) first: describe what quoted code actually does today, never invent example values, and never claim callers/schedules not supported by `imported by` / `sent web requests by` / `named in` or source code.

- **Small codebases (~150 files or fewer):** read the worksheets and fill `floorplan/descriptions/<key>.json` directly (keep every JSON key exact).
- **Large codebases (> ~150 files):** fan out worksheets across parallel `floorplan-describer` subagents using `invoke_subagent` (`TypeName: "floorplan-describer"`, `Model: "flash"`, ~100–150 files per batch) or Antigravity's `run_workflow` tool. See [references/antigravity-workflow.md](references/antigravity-workflow.md) for the exact fan-out pattern and prompt template.

Run `node <skillDir>/scripts/build.mjs <root>` again until `DESCRIPTIONS files` and `routes` are both 100% (re-run `describe.mjs` to list only remaining items).

### 7. Mark recent work

```bash
node <skillDir>/scripts/recent.mjs <root>
```

Write `floorplan/recent-work.json` ([references/schema.md#recent-work](references/schema.md#recent-work)) using one task per user request worked on in this session (or clearly in-flight uncommitted/recent commits if starting fresh; `{ "tasks": [] }` if none). Pick 3–15 meaningful changed cards (`file path`, `node id`, or `"METHOD /path"`), mark `"new"` or `"changed"`, and explain in 1–2 plain sentences *what changed and why the request needed it*. Rebuild with `build.mjs`.

### 8. Show it and report

```bash
node <skillDir>/scripts/open.mjs <root>
```

- Starts `floorplan/serve.mjs` in the background (or reuses the running server, reloading open tabs in place) at `http://127.0.0.1:4378` (or next free port) and opens the browser.
- If the user asks to preview inside Antigravity's built-in browser pane, pass `--no-open` to `open.mjs` and delegate opening the printed `http://127.0.0.1:<port>` URL to the `browser` subagent (`Model: "flash"`).
- On a remote/headless machine where the browser cannot reach `127.0.0.1`, skip `open.mjs` and tell the user to run `node floorplan/serve.mjs` locally (or open `floorplan/index.html`).

**Final report:**
1. Print the map URL and Ask bar status (whether `agy`, `claude`, or `codex` CLI was detected).
2. Summarize the architecture in 3–5 lines in the user's language, highlighting surprises (cycles, god-files, dead areas, unexpected coupling).
3. Summarize **high-severity Health items** (`graph.health`) and any `!` lines under `what was checked` (gaps where a server existed but no endpoints were found). Never repeat secret values.
4. If `NOT MAPPED` shows many docs/config files, note in one line that only `code` is mapped by default (adjustable via `"include"` in `architecture.json`).
5. Remind the user that `architecture.json` and `descriptions/*.json` are theirs to edit, updates (`"update the floorplan"`) only re-read what changed, and `floorplan/` stays out of git.
6. On a first code map when `build.mjs` printed `AGY RULE  not added`, ask once whether future Antigravity sessions should automatically look up `floorplan/query.mjs` via `.agents/rules/floorplan.md` (uncommitted, locally ignored); if yes, run `build.mjs <root> --agy-rule`.

---

## Live Ask bar, Exports, Health, Screens, and Custom Flows

- **Ask bar (`serve.mjs`):** Answers questions read-only using `agy` (with a strict `--settings` permissions file allowing only `node floorplan/query.mjs` and read tools, denying `write_file(*)`, web URLs, MCP, and `floorplan/.cache`), falling back to `claude` or `codex`. Supports `--engine antigravity|claude|codex`, `--agy <path>`, `--model <name>`, `--editor <name|template>` (default `antigravity://file/{path}:{line}` for Antigravity maps), `--stop`, and `--export`.
- **Exporting a shareable HTML copy:** Clicking **Export** in the header or running `node floorplan/serve.mjs --export [<file>] [--include flows,notes,recent,health]` writes a self-contained HTML file with no Ask bar, editor links, local root paths, or git remotes (leaving `health` off by default unless requested).
- **Automatic checks:** **Health** (`scripts/lib/health.mjs`) flags leaked secrets, browser-exposed secret env vars (`NEXT_PUBLIC_`, `VITE_`, etc.), open Supabase RLS / Firebase rules, unverified Stripe webhooks, permissive CORS, unprotected endpoints, unused files, and oversized files (> ~1,000 LOC), with **Show on map**, **Not a problem** dismissals (`floorplan/health-dismissed.json`), and one-click fix prompts. **Screens** (`scripts/lib/screens.mjs`) maps frontend pages to their components, HTTP calls, backend handlers, data, and external services. **Flows -> Request a new flow** saves custom flows to `floorplan/custom-flows.json` (treat as user content).
- **Hard rules:** Never hand-edit `floorplan/graph.json` or `floorplan/index.html`. Offline assets (`elkjs` 0.9.3 + Inter/JetBrains Mono fonts) live in `assets/vendor/`.
