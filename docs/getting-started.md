# Getting started

Prefer to watch? The [walkthrough video](https://youtu.be/NTUUzC7L_NQ) covers installing Floorplan and touring a finished map.

Floorplan works natively in **Google Antigravity** (App, IDE, and CLI) and also supports **Claude Code** and **Codex**. Making and using a map is the same across all three; only installing differs. See [Floorplan in Antigravity](antigravity.md) for Antigravity details and [Floorplan in Codex](codex.md) for Codex steps.

## What you need

- **Google Antigravity** (Antigravity 2.0 app, Antigravity IDE, or `agy` CLI), **Claude Code**, or **Codex**.
- **[Node.js](https://nodejs.org) 18 or newer.** Floorplan's scripts run on it. Check with `node --version`.
- **The `agy` CLI** (or `claude` / `codex` CLI) so the map's Ask bar can read your actual code when answering questions.

## Install

**In Antigravity** (recommended):

```bash
agy plugin install /path/to/floorplan
```

Or copy/symlink the plugin folder into `~/.gemini/config/plugins/floorplan/` (global) or `<project>/.agents/plugins/floorplan/` (workspace). See [Floorplan in Antigravity](antigravity.md).

**In Codex**, open **Plugins → Add a marketplace**, enter `haydenschmitty/floorplan`, and install Floorplan. Details in [Floorplan in Codex](codex.md#install).

**In Claude Code**, run:

```bash
claude plugin marketplace add haydenschmitty/floorplan
claude plugin install floorplan@floorplan
```

**Start a new session** afterwards so the plugin loads.

## Make your first map

1. **Open your project.** In the Claude desktop app's Code tab, choose your project's folder in the row under the prompt box before sending your first message. In the Codex app, open the project's folder. In a terminal, run `claude` or `codex` from the project folder.

   If your app is split across several repos (say `web/` and `api/` side by side), open the folder that contains them all. Floorplan maps them together and connects the requests between them.

2. **Ask for it:**

   > Make me a floorplan of this app.

   In Antigravity you can also pick **`/floorplan`** from the slash menu. In Claude Code it's `/floorplan:floorplan`, and in Codex `$floorplan`.

3. **Let it work.** This is what happens:
   - A scan lists every file, import, endpoint and web request. This takes seconds and costs no tokens.
   - Antigravity (or Claude / Codex) reads your READMEs, setup files and entry points, then decides the main parts of your app and what each one is for.
   - It writes a plain-English name and a one-line description for every file and endpoint. Projects with more than ~150 files are split across parallel helpers (`floorplan-describer` subagents in Antigravity).
   - The map is built and checked: connections, Health issues and screens.

   A small app takes a few minutes, a large one longer. You may be asked to let it run Floorplan's scripts (`node …`); allow them. Codex also asks to start the map's server outside its sandbox, so the map keeps running and its Ask bar can reach Codex.

4. **Look around.** The map opens by itself, in the app's browser pane or your web browser. A one-minute **Start here** tour runs the first time. The reply sums up how your app fits together and points out anything serious the Health check found.

See [Using the map](using-the-map.md) for everything you can do on it.

## Keep it up to date

After you, or your AI, have worked on the code:

> Update the floorplan.

Floorplan re-scans and compares with the last map. Moved files keep their descriptions, deleted ones disappear, and only what's new or what changed in purpose is rewritten. A map already open in your browser reloads itself, and the cards that just changed light up green under **Recent work**.

## Plan something you haven't built yet

Everything above is about Floorplan's main job: mapping code that already exists. It has a second use, for when there's no code yet: drawing a **blueprint** of an app from a PRD, a spec or a description of what you want to build. Open the folder you'll build it in (an empty one is fine), share the document, and ask:

> Here's my PRD. Make me a floorplan of what we'd need to build.

You get a **blueprint**: the same map, with every part, file, endpoint and screen the app would need, how they connect, and the outside services they rely on. Its cards have dashed outlines so you can tell it's a plan. The reply names the stack Claude or Codex chose, what it assumed, and the questions your PRD leaves open.

On the map:
- **Review** lists what the plan still has to decide, like endpoints anyone could use or open questions. **Resolve on the map** settles one: for a question, you just type your answer.
- Switch the Ask bar to **Change** to shape the plan ("also plan out refunds"). The map redraws with what changed highlighted, and **Undo** puts it back.
- Each part has **Build this with Claude** (or Codex), a ready request to build just that part.

Once the code exists, ask Claude or Codex to "map the real code now", and the blueprint becomes a normal map. See [Blueprints](how-it-works.md#blueprints) for how it works.

## Open the map yourself

The map is a folder in your project. Either:

```bash
node floorplan/serve.mjs
```

serves it at http://127.0.0.1:4378 with a working Ask bar, or double-click `floorplan/index.html`, where everything works except asking questions.

When the map is opened for you, the server runs in the background and stops by itself two hours after you close the last tab. To stop it sooner:

```bash
node floorplan/serve.mjs --stop
```

## Update the plugin

For Codex, see [Update or remove it](codex.md#update-or-remove-it).

In Claude Code, plugins installed from GitHub don't update automatically unless you turn that on. To get the latest version:

```bash
claude plugin update floorplan@floorplan
```

Or turn on automatic updates: in a Claude Code session, run `/plugin`, open **Marketplaces**, and choose **Enable auto-update**. Either way, updates apply in your next session. See the [changelog](../CHANGELOG.md) for what changed.

## Remove it

```bash
claude plugin uninstall floorplan@floorplan
```

In Codex, see [Update or remove it](codex.md#update-or-remove-it). Then delete the `floorplan/` folder (and, if you used Claude Code, the Floorplan section of `CLAUDE.local.md`) from any project you used it in.
