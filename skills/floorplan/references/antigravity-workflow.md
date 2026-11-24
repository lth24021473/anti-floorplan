# Antigravity Subagent & Workflow Integration

Floorplan pairs deterministic Node.js scripts with Antigravity's native subagent and workflow orchestration so large codebases map quickly and cheaply while keeping context clean.

## 1. Parallel Worksheet Descriptions (> ~150 files)

When `node <skillDir>/scripts/describe.mjs <root>` produces multiple worksheets, split them across parallel workers so each worker only reads its own worksheets and edits its own `floorplan/descriptions/<key>.json` files.

### Option A: `invoke_subagent` with bundled `floorplan-describer`

The plugin bundles `agents/floorplan-describer.md` (`model: flash`, `inheritMcp: false`, `inheritCustomizations: false`, write access restricted to editing JSON skeletons).

1. Run `node <skillDir>/scripts/describe.mjs <root> --json` to get the list of worksheets (`key`, `worksheet`, `descriptions`, `files`, `routes`).
2. Group worksheets into batches of ~100–150 files (or ~1–3 worksheets per subagent) grouped by area (backend routes, services, UI, scripts, tests).
3. Launch one `invoke_subagent` per batch in parallel:
   - `TypeName`: `"floorplan-describer"`
   - `Model`: `"flash"`
   - `Role`: `"Worksheet Describer (<area>)"`
   - `Prompt`:
     ```text
     Codebase root: <root>
     Style guide: <skillDir>/references/writing-descriptions.md
     Assigned worksheets & output files:
     - <root>/floorplan/.cache/worksheets/<key>.md -> <root>/floorplan/descriptions/<key>.json

     Read the style guide and each assigned worksheet, open source files only when a digest is unclear, and fill in every name and description in the corresponding descriptions/<key>.json file without changing keys. Drop any "review" field once updated.
     ```
4. Once all subagents reply, run `node <skillDir>/scripts/build.mjs <root>` to verify `DESCRIPTIONS files X/X · routes Y/Y`.

### Option B: `run_workflow` script fan-out (very large monorepos)

For repositories with dozens of worksheets, use Antigravity's `run_workflow` tool to fan out every worksheet concurrently with `parallel(...)` and the `floorplan-describer` agent:

```python
import json

phase("Generate worksheets")
desc = json.loads(await call_tool(
    "run_command",
    CommandLine='node "<skillDir>/scripts/describe.mjs" "<root>" --json',
    toolSummary="Generate description worksheets",
    WaitMsBeforeAsync=10000,
))

worksheets = desc.get("worksheets", [])
if worksheets:
    phase("Describe worksheets")
    await parallel(
        worksheets,
        lambda w: agent(
            f"""Codebase root: <root>
Read <skillDir>/references/writing-descriptions.md, then read <root>/{w["worksheet"]} and update <root>/{w["descriptions"]}.
Keep all JSON keys identical, write plain-English names/descriptions matching the worksheet's Audience line, say what the code does today, and remove any "review" field once accurate.""",
            schema={"type": "string"},
            role=f"Describe {w['key']} ({w['files']} files)",
            type_name="floorplan-describer",
            model="flash",
        ),
    )

phase("Rebuild map")
log(await call_tool(
    "run_command",
    CommandLine='node "<skillDir>/scripts/build.mjs" "<root>"',
    toolSummary="Rebuild Floorplan map",
    WaitMsBeforeAsync=10000,
))
```

## 2. Read-only Map-First Q&A (`floorplan-analyst`)

The plugin also ships `agents/floorplan-analyst.md` (`mainAgent: true`, `subagent: true`, `commandExecutionPolicy: sandbox`). Users can select `floorplan-analyst` directly in Antigravity (`agy --agent floorplan-analyst` or via `/agents`), or the main agent can delegate read-only impact/architecture investigations to it via `invoke_subagent(TypeName="floorplan-analyst", ...)`.

## 3. Unattended / CI Runs (`workflow.json`)

For automated pipelines without an interactive session, use `FLOORPLAN_UNATTENDED=1` and follow `workflow.json` (`docs/unattended.md`).
