# Is it safe to install?

Plugins for Antigravity, Claude Code and Codex can run code on your computer, so it's worth asking. Some malicious plugins look harmless when you install them, then download and run something else later (a "stage two"). Floorplan is built so it can't do that, a test checks it on every change, and you can confirm all of it yourself.

## What Floorplan never does

- **No hooks.** Hooks run code automatically on events in every session, which makes them a common hiding place. Floorplan has none.
- **No MCP servers.** Floorplan has none, so it never starts a server that downloads its newest version with `npx`.
- **No dependencies, no install scripts.** Nothing comes from npm, at install time or ever. Its `package.json` exists only to run the tests.
- **Never downloads anything, and never runs code from the internet.** No `eval`, no loading code at run time, no encoded payloads.
- **Never changes your code.** It writes only its own `floorplan/` folder and, only if you say yes, a locally-ignored rule/notes file (`.agents/rules/floorplan.md` in Antigravity, or `CLAUDE.local.md` in Claude Code). See [What's in your project](project-files.md).
- **No analytics or tracking.**

## Everything it does

### The network

- **The map's server** (`floorplan/serve.mjs`) listens on `127.0.0.1` only, so other machines can't reach it. It answers only to `127.0.0.1` and `localhost` at its own port, and its API needs a token that only the map page receives.
- **One outbound request: the Floorplan Cloud waitlist,** sent only if you type your email into the card on the map and click to join. It goes to `floorplan-waitlist-690500262396.us-central1.run.app` and carries your email and "just me" or "with my team". Details in [Privacy and security](privacy-and-security.md#floorplan-cloud-waitlist).
- **The map page loads nothing from the internet.** Its layout engine and fonts are built into the file. It only links to documentation, which opens when you click.
- **The page enforces that itself.** Every map carries a Content-Security-Policy: only the page's own scripts run (each is allowed by its SHA-256 hash, computed when the page is written), and images and fonts can only come from inside the file. An **exported copy** may contact nothing at all (`connect-src 'none'`); `floorplan/index.html` and the page the map's server serves may contact only that local server (`connect-src 'self'`), for asking questions, live reload, flows and Export. So even if text from a repository ever slipped past the map's escaping and became script, it couldn't send the map anywhere. The copy made for the Claude app (`--artifact`) has no policy of its own, because the Claude app runs its own code in that page and applies its own rules.
- **Reporting a false alarm is yours to send.** If you tick the box under **Not a problem** in Health, the map opens a new GitHub issue in your browser with the text filled in, shown to you first. Nothing goes anywhere unless you submit it there.

Asking questions on the map runs Antigravity (`agy`), Claude Code or Codex, which talk to your own configured AI provider the way they always do, on your account. Floorplan itself sends nothing.

### The programs it runs

| Program | When | Why |
|---|---|---|
| `git` | scan | Read-only: which files are tracked, the current branch and commit, what changed since the last map |
| `where` (Windows) or `which` | starting the map's server | Finding the Antigravity, Claude Code or Codex CLI |
| `agy`, `claude` or `codex` | when you ask a question on the map | Answering it, read-only: `agy` with a strict read-only `--settings` file (`write_file(*)`, web URLs and MCP denied), `claude -p` limited to reading files and Floorplan's lookup script, or `codex exec --sandbox read-only` |
| `node` | throughout | Running Floorplan's own scripts |
| `cmd /c start`, `open` or `xdg-open` | opening the map | Opening the map's local address in your browser |

Each is started directly with its arguments, never as a command line for a shell to interpret. The one shell is Windows' `cmd /c start`, given only the map's own local address.

### What runs without asking

In Antigravity, the skill invokes only its fixed set of eight scripts (`scripts/build.mjs`, `describe.mjs`, `open.mjs`, `plan.mjs`, `recent.mjs`, `refresh.mjs`, `scan.mjs` and `status.mjs`) under your command execution settings, plus two scoped custom subagents with `inheritMcp: false` (`floorplan-describer`, restricted to file read/write/edit inside the workspace; and `floorplan-analyst`, restricted to `read_file` and `run_command` with `commandExecutionPolicy: sandbox`). That fixed script and subagent list is checked by `tests/supply-chain.test.mjs`. If you also run Floorplan in Claude Code or Codex, each runs the same fixed scripts under your permission or approval settings.

### The workflow file

`skills/floorplan/workflow.json` is data, not code: the same steps as SKILL.md, for people who run Floorplan from their own scripts or CI ([Running without an agent session](unattended.md)). Nothing in Floorplan reads it to decide what to run.

### Three things worth explaining

- **`skills/floorplan/assets/vendor/elk.bundled.js`** is a 1.6 MB minified file: the layout engine that arranges the map. It's [elkjs](https://github.com/kieler/elkjs) 0.9.3, byte for byte the same as the official package on npm. Its SHA-256 is `b0745abd7f23cd91690a1587e377edbe19fd7233c783300290936720546216d4`. To check it yourself:
  ```bash
  npm pack elkjs@0.9.3
  tar -xzf elkjs-0.9.3.tgz package/lib/elk.bundled.js
  ```
  Then compare `package/lib/elk.bundled.js` with Floorplan's copy, for example with `sha256sum` (macOS: `shasum -a 256`; Windows PowerShell: `Get-FileHash`).
- **One `new Function`** in `serve.mjs` loads the map's lookup code from `floorplan/query.mjs`, a file Floorplan's build wrote into your project. It never runs anything from the network.
- **Health reads the middle part of tokens it finds** (it decodes them from base64) to tell what kind of token each is, so it can skip ones that are public by design. It never stores or shows the token itself.

## Checked on every change

[`tests/supply-chain.test.mjs`](../tests/supply-chain.test.mjs) runs on every push and pull request, on Linux and Windows (and weekly on macOS). It fails if a change would:

- add a hook, an MCP server, a dependency or an install script;
- send a request anywhere other than the map's own server and the waitlist;
- start a program not in the table above, or start one through a shell;
- use `eval`, load code at run time, or hide a long encoded string in the code;
- add a script that would run without asking;
- change the bundled layout engine, or add a vendored file.

Each check was tested by planting exactly that kind of change and seeing it fail. A change to any of this has to change the test and this page together, in the open.

To run the same checks on your own copy:

```bash
node --test tests/supply-chain.test.mjs
```

## Check that your installed copy is a real release

Every release includes `CHECKSUMS.txt`: a SHA-256 fingerprint of every file the plugin runs from (`skills/`, `agents/`, `assets/`, `plugin.json`, and `package.json`). To compare your installed copy with a release:

```bash
node floorplan-check/tools/checksums.mjs --check <installed folder>
```

It prints either that all files are identical, or which ones changed, are extra or are missing.

## The honest limits

- When you install a plugin from its repository, an update brings whatever the newest release contains, for this plugin as for any other. Before you update, you can read the changes in the [changelog](../CHANGELOG.md) and verify the new version with its checksums.
- Floorplan works by having Antigravity, Claude Code or Codex read your code to describe it. That goes to your configured AI provider under your account, like any other task you give them. See [Privacy and security](privacy-and-security.md).

## Found something?

Please report it privately, as described in the [security policy](../SECURITY.md).
