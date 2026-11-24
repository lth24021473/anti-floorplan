// Which coding agent is running the skill: Antigravity, Claude Code, or Codex. The map records it, so
// its Ask bar and "Fix with …" prompts name the right one, and serve.mjs answers through the same CLI.
// --agent <name> (or FLOORPLAN_AGENT) decides; otherwise each agent is recognised by the variables it sets
// for every command it runs, and anything else defaults to Antigravity. Adding an agent is an entry here.
// "none" is for maps made without an agent session (in CI, in scripts, from your own tooling): the map then
// names no agent in its prompts. Unattended mode (FLOORPLAN_UNATTENDED=1) implies it unless one is named.
import { isUnattended } from './common.mjs';

const DETECT = {
  antigravity: (env) => !!(env.ANTIGRAVITY_AGENT || env.ANTIGRAVITY_CONVERSATION_ID || env.ANTIGRAVITY_LS_ADDRESS || env.ANTIGRAVITY_APP_DATA_DIR),
  codex: (env) => !!(env.CODEX_THREAD_ID || env.CODEX_SESSION_ID),
  claude: (env) => !!(env.CLAUDECODE || env.CLAUDE_CODE_SESSION_ID || env.CLAUDE_CODE_ENTRYPOINT),
  none: () => false, // only when asked for, or in unattended mode
};
export const AGENTS = Object.keys(DETECT);

export function detectAgent(args = {}, env = process.env) {
  const v = String(args.agent || env.FLOORPLAN_AGENT || '').toLowerCase();
  if (AGENTS.includes(v)) return v;
  if (isUnattended(env)) return 'none';
  return AGENTS.find((a) => DETECT[a](env)) || 'antigravity';
}

const CLI_NAMES = {
  antigravity: 'the Antigravity CLI (agy)',
  claude: 'the Claude Code CLI',
  codex: 'Codex',
};
const CMD_NAMES = { antigravity: 'agy', claude: 'claude', codex: 'codex' };
const SELF_PATTERN = { antigravity: /\b(?:agy|antigravity)\b/i, claude: /claude/i, codex: /codex/i };

/**
 * What the CLI answering the map's questions is called, for open.mjs: its usual name, or, when its --version
 * names another program (a wrapper installed under the same command, `devin 3000.11.238` answering to
 * `claude`), that program, so the label never claims Antigravity, Claude Code or Codex for something else.
 */
export function cliLabel(engine, version = '') {
  const usual = CLI_NAMES[engine] || CLI_NAMES.antigravity;
  const v = String(version || '').trim();
  const named = /^([A-Za-z][\w.-]{0,40})\s+v?\d/.exec(v)?.[1];
  const selfRe = SELF_PATTERN[engine] || SELF_PATTERN.antigravity;
  if (!named || selfRe.test(v)) return usual;
  return `${named}, found as the ${CMD_NAMES[engine] || 'agy'} command`;
}
