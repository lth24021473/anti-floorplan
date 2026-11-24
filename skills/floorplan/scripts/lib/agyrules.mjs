// Keeps a short workspace rule in .agents/rules/floorplan.md pointing future Antigravity sessions at the
// map, so "where is X / how does Y work" starts from the map instead of a fresh search of the code.
// Using trigger: model_decision leverages Antigravity's progressive disclosure without polluting always-on
// context; the file is added to the repo's local ignore list (.git/info/exclude), which leaves tracked
// files untouched. It's added only when the user asks for it (build.mjs --agy-rule); a block that's
// already there is kept current. Put <!-- floorplan:off --> in .agents/rules/floorplan.md to opt out.
import fs from 'node:fs';
import path from 'node:path';
import { git } from './common.mjs';

const START = '<!-- floorplan:start -->';
const END = '<!-- floorplan:end -->';
const REL_PATH = '.agents/rules/floorplan.md';

const FRONTMATTER = `---
trigger: model_decision
description: Codebase architecture map lookups via floorplan/query.mjs — use before searching the code for "where is X", "how does Y work", or "what uses Z".
---`;

function block(rel) {
  return `${START}
## Floorplan: map of this codebase

\`${rel}/\` holds a map of this codebase: every module, file and endpoint with a plain-English name and a one-line description, and what connects to what. For questions like "where is X", "how does Y work" or "what uses Z", look it up before searching the code (run these from the folder this rule belongs to):

- \`node ${rel}/query.mjs find "<words>"\`: modules, files and endpoints that match
- \`node ${rel}/query.mjs show <file path | module id | "GET /path">\`: what it is, what it uses, what uses it
- \`node ${rel}/query.mjs path <from> <to>\`: how two things connect
- \`node ${rel}/query.mjs overview\`: the whole system at a glance

The map can lag behind recent edits, so confirm in the code before changing anything. Open it with \`node ${rel}/serve.mjs\`. After big changes, update it with the floorplan skill (the user can just ask to "update the floorplan"; only changed files are re-read).
${END}`;
}

const read = (f) => (fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null);
const stripBlock = (text) => {
  const a = text.indexOf(START), b = text.indexOf(END);
  if (a < 0 || b < a) return null;
  return [text.slice(0, a).trimEnd(), text.slice(b + END.length).trimStart()].filter(Boolean).join('\n\n').replace(/\r\n/g, '\n');
};

/** Adds .agents/rules/floorplan.md to the enclosing repo's .git/info/exclude unless git already ignores it. */
function excludeLocally(root) {
  if (git(root, ['rev-parse', '--is-inside-work-tree']) !== 'true') return 'not in a git repo';
  if (git(root, ['ls-files', '--', REL_PATH])) return `${REL_PATH} is committed in this repo; the Floorplan rule will show up in it`;
  if (git(root, ['check-ignore', '-q', REL_PATH]) !== null) return 'already ignored';
  const prefix = git(root, ['rev-parse', '--show-prefix']) || '';
  const excl = git(root, ['rev-parse', '--git-path', 'info/exclude']);
  if (!excl) return 'could not find .git/info/exclude';
  const file = path.resolve(root, excl);
  const line = '/' + prefix + REL_PATH;
  const cur = read(file) || '';
  if (!cur.split(/\r?\n/).includes(line)) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, cur.replace(/\s*$/, cur.trim() ? '\n' : '') + `# personal Antigravity map rule (added by Floorplan)\n${line}\n`);
  }
  return 'ignored locally via .git/info/exclude';
}

/** Refreshes the rule block, or creates .agents/rules/floorplan.md when `add` (the user asked for it). */
export function writeAgyRule(root, outDir, { add = false } = {}) {
  const rel = path.relative(root, outDir).replace(/\\/g, '/');
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return 'skipped (map is outside the codebase)';
  const file = path.join(root, '.agents', 'rules', 'floorplan.md');
  const old = read(file);
  const had = stripBlock(old ?? '') != null;
  if (!add && !had) return 'not added (offer it to the user; add it with --agy-rule)';
  if (old?.includes('<!-- floorplan:off -->')) return 'skipped (opted out)';

  const eol = old?.includes('\r\n') ? '\r\n' : '\n';
  const text = block(rel).replace(/\n/g, eol);
  let next;
  if (old == null) {
    next = FRONTMATTER.replace(/\n/g, eol) + eol + eol + text + eol;
  } else {
    const a = old.indexOf(START), b = old.indexOf(END);
    next = a >= 0 && b > a
      ? old.slice(0, a) + text + old.slice(b + END.length)
      : old.replace(/\s*$/, '') + eol + eol + text + eol;
  }
  const notes = [];
  if (next !== old) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, next);
    notes.push(`${old == null ? 'created' : 'updated'} ${REL_PATH}`);
  } else {
    notes.push(`${REL_PATH} unchanged`);
  }
  notes.push(excludeLocally(root));
  return notes.join('; ');
}
