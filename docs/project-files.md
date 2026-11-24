# What's in your project

Floorplan writes to `floorplan/` in your project, and (only if you say yes) a short rule or notes file: `.agents/rules/floorplan.md` in Antigravity, or `CLAUDE.local.md` in Claude Code. Neither is committed to git, and nothing else in your project is touched. Run in [unattended mode](unattended.md) (from CI or your own scripts), it writes only the `floorplan/` folder.

## The `floorplan/` folder

| File | What it is | Edit it? |
|---|---|---|
| `index.html` | The map: one self-contained page | No. Rebuilt every time |
| `graph.json` | Everything the map shows, as data | No. Rebuilt every time |
| `architecture.json` | The parts of your app, outside services, extra connections, flows and the tour | **Yes** |
| `descriptions/*.json` | The name and description of every file and endpoint, one file per part | **Yes** |
| `plan.json` | Blueprints only: the planned files, endpoints and screens, who may use each endpoint, the stack, assumptions and open questions. Names and descriptions live here instead of `descriptions/` | **Yes** |
| `recent-work.json` | What was just worked on, and why. Replaced on every update | Rarely. The AI writes it |
| `custom-flows.json` | Flows requested from the map | Only to delete one |
| `health-dismissed.json` | Health issues you marked **Not a problem**, with your reasons | Only to undo one. **Show again** on the map does it too |
| `serve.mjs` | Serves the map locally and answers questions through `agy`, `claude`, or `codex` | No |
| `query.mjs` | Looks things up in the map from the command line; the Ask engine and `floorplan-analyst` use it too | No |
| `page-safety.mjs` | How `serve.mjs` puts data into the page it serves and exports, and those pages' Content-Security-Policy | No |
| `artifact.html` | A copy for opening in the Claude app, only if you asked for one | No |
| `<project>-map.html` | An exported copy to share, only if you exported one from Claude or Codex (the map's Export button downloads it instead) | No |
| `.cache/` | The scan, the description worksheets, the last update's changes, the running server's address, and, for a blueprint, the last 20 versions of the plan that **Undo** goes back to | No. Safe to delete, though Undo then has nothing to go back to |
| `.gitignore` | Keeps this whole folder out of git | No |

### Editing names and structure

Your edits to `architecture.json` and `descriptions/` are kept on every update. You can:
- rename a part, or reword a description;
- move files between parts by changing the `paths` patterns;
- add a connection the scan missed;
- pin a note to a file;
- add or change flows and the tour.

Or just ask Claude or Codex ("rename 'Main server' to 'Shop API' on the floorplan").

A blueprint is edited the same way, through `plan.json` and `architecture.json`, or from the map with the Ask bar's **Change** switch. The plan's format is in [`blueprint.md`](../skills/floorplan/references/blueprint.md).

The full format is in [`skills/floorplan/references/schema.md`](../skills/floorplan/references/schema.md), and the style guide for names and descriptions is in [`writing-descriptions.md`](../skills/floorplan/references/writing-descriptions.md).

## `.agents/rules/floorplan.md` and `CLAUDE.local.md`

In **Antigravity**, after the first map, Floorplan offers to add a `model_decision` rule at `.agents/rules/floorplan.md`, telling future sessions that the map exists and how to query it with `floorplan/query.mjs`. In **Claude Code**, it offers the same block in `CLAUDE.local.md`. Both follow the same safety rules:
- created only when you opt in (`--agy-rule` or `--claude-md`), then refreshed in place between `<!-- floorplan:start -->` and `<!-- floorplan:end -->`;
- added to your clone's private ignore list, `.git/info/exclude`, never `.gitignore`;
- ignored permanently if you add `<!-- floorplan:off -->` to the file.

A blueprint adds no rule/notes file, since there's no code to look up yet. Once the map switches to real code, Floorplan offers it. In Codex, no notes file is touched.

## Staying out of git

- **`floorplan/`** contains its own `.gitignore` that ignores everything in the folder, including itself. Your `.gitignore` isn't changed, and the folder never appears in `git status`.
- **`.agents/rules/floorplan.md`** / **`CLAUDE.local.md`** is listed in `.git/info/exclude`, the per-clone ignore list that is never committed. If your project already ignores it, nothing is added.

The map is personal to each clone. Teammates who install Floorplan make their own.

If you committed a `floorplan/` folder before, ignoring it doesn't untrack those files. The build tells you the command that does, which keeps the files on disk:

```bash
git rm -r --cached floorplan
```
