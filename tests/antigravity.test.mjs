// Native Antigravity support: detection, .agents/rules/floorplan.md workspace rule memory,
// read-only `agy` streaming Ask & Blueprint Change engine, antigravity:// editor links,
// and plugin.json / custom agents integrity.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { REPO, lib, shopApp, makeProject, run, readGraph, readJson, writeJson, routeKeys, cleanup } from './helpers.mjs';

const { detectAgent, cliLabel } = await lib('agent.mjs');
const FAKE_AGY = path.join(REPO, 'tests', 'fixtures', 'fake-cli', 'fake-agy.mjs');
const FIXTURE_BP = path.join(REPO, 'tests', 'fixtures', 'blueprint');

const roots = [];
const servers = [];
after(async () => {
  await Promise.all(servers.filter((s) => s.exitCode === null).map((s) => new Promise((resolve) => { s.once('exit', resolve); s.kill(); })));
  for (const r of roots) cleanup(r);
});

async function startServe(root, extraEnv = {}) {
  const log = path.join(root, `fake-agy-${servers.length}.log`);
  const port = 20000 + Math.floor(Math.random() * 20000);
  const server = spawn(process.execPath, [path.join(root, 'floorplan', 'serve.mjs'), '--port', String(port), '--no-open'], {
    cwd: root,
    env: {
      ...process.env,
      FLOORPLAN_NO_PROMPTS: '1',
      FLOORPLAN_ENGINE: '',
      FLOORPLAN_AGY: FAKE_AGY,
      FLOORPLAN_CLAUDE: path.join(root, 'no-such-cli'),
      FLOORPLAN_CODEX: path.join(root, 'no-such-cli'),
      FAKE_LOG: log,
      ...extraEnv,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  servers.push(server);
  const base = await new Promise((resolve, reject) => {
    let out = '';
    const timer = setTimeout(() => reject(new Error(`server didn't start: ${out}`)), 20000);
    server.stdout.on('data', (d) => { out += d; const m = /Floorplan: (http:\/\/\S+)/.exec(out); if (m) { clearTimeout(timer); resolve(m[1]); } });
    server.on('exit', (code) => reject(new Error(`server exited (${code}): ${out}`)));
  });
  const html = await (await fetch(base + '/')).text();
  const page = JSON.parse(/window\.FLOORPLAN_SERVER=(\{.*?\});/.exec(html)[1]);
  return {
    base,
    token: page.token,
    page,
    html,
    calls: () => fs.readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l)),
  };
}

async function ask(s, question, session, mode = 'ask') {
  const r = await fetch(s.base + '/api/ask', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-floorplan-token': s.token },
    body: JSON.stringify({ question, session, mode }),
  });
  return (await r.text()).split('\n\n').filter(Boolean).map((b) => ({ event: /^event: (\w+)/.exec(b)[1], data: JSON.parse(/^data: (.*)$/m.exec(b)[1]) }));
}
const pick = (events, name) => events.filter((e) => e.event === name).map((e) => e.data);

test('Antigravity detection covers env vars, defaults to antigravity, and honors overrides', () => {
  assert.equal(detectAgent({}, {}), 'antigravity');
  assert.equal(detectAgent({}, { ANTIGRAVITY_AGENT: '1' }), 'antigravity');
  assert.equal(detectAgent({}, { ANTIGRAVITY_CONVERSATION_ID: 'abc' }), 'antigravity');
  assert.equal(detectAgent({}, { ANTIGRAVITY_LS_ADDRESS: 'localhost:5387' }), 'antigravity');
  assert.equal(detectAgent({}, { ANTIGRAVITY_APP_DATA_DIR: 'C:/Users/x/.gemini/antigravity' }), 'antigravity');
  assert.equal(detectAgent({}, { CODEX_THREAD_ID: 't1' }), 'codex');
  assert.equal(detectAgent({}, { CLAUDECODE: '1' }), 'claude');
  assert.equal(detectAgent({ agent: 'claude' }, { ANTIGRAVITY_AGENT: '1' }), 'claude');
  assert.equal(detectAgent({}, { FLOORPLAN_AGENT: 'codex', ANTIGRAVITY_AGENT: '1' }), 'codex');
  assert.equal(detectAgent({}, { FLOORPLAN_UNATTENDED: '1', ANTIGRAVITY_AGENT: '1' }), 'none');
});

test('cliLabel handles bare agy version, agy-named version, and wrapper binaries', () => {
  assert.equal(cliLabel('antigravity', '1.5.15'), 'the Antigravity CLI (agy)');
  assert.equal(cliLabel('antigravity', 'agy 1.5.15'), 'the Antigravity CLI (agy)');
  assert.equal(cliLabel('antigravity', ''), 'the Antigravity CLI (agy)');
  assert.equal(cliLabel('antigravity', 'othertool 1.2.0'), 'othertool, found as the agy command');
});

test('Antigravity builds record meta.agent=antigravity and manage .agents/rules/floorplan.md cleanly', () => {
  const root = shopApp();
  roots.push(root);
  const ruleFile = path.join(root, '.agents', 'rules', 'floorplan.md');
  run('scan.mjs', root);
  const firstOut = run('build.mjs', root, '--agent', 'antigravity');
  assert.match(firstOut, /AGENT {2}Antigravity/);
  assert.match(firstOut, /AGY RULE {2}not added/);
  assert.equal(readGraph(root).meta.agent, 'antigravity');
  assert.ok(!fs.existsSync(ruleFile), 'rule is not added until --agy-rule is passed');

  const addedOut = run('build.mjs', root, '--agent', 'antigravity', '--agy-rule');
  assert.match(addedOut, /AGY RULE {2}created \.agents\/rules\/floorplan\.md/);
  const ruleText = fs.readFileSync(ruleFile, 'utf8');
  assert.match(ruleText, /^---\ntrigger: model_decision\n/);
  assert.match(ruleText, /node floorplan\/query\.mjs find/);

  // subsequent build keeps the rule current without needing --agy-rule again
  fs.writeFileSync(ruleFile, ruleText.replace(/node floorplan\/query\.mjs/, 'stale'));
  const refreshOut = run('build.mjs', root, '--agent', 'antigravity');
  assert.match(refreshOut, /AGY RULE {2}updated \.agents\/rules\/floorplan\.md/);
  assert.match(fs.readFileSync(ruleFile, 'utf8'), /node floorplan\/query\.mjs/);

  // opt-out marker wins
  fs.writeFileSync(ruleFile, 'custom\n<!-- floorplan:off -->\n');
  const optOut = run('build.mjs', root, '--agent', 'antigravity', '--agy-rule');
  assert.match(optOut, /AGY RULE {2}skipped \(opted out\)/);
  assert.equal(fs.readFileSync(ruleFile, 'utf8'), 'custom\n<!-- floorplan:off -->\n');
});

test('serve.mjs runs agy read-only with strict --settings, streaming progress, and --conversation follow-ups', async () => {
  const root = shopApp();
  roots.push(root);
  run('scan.mjs', root);
  run('build.mjs', root, '--no-agy-rule', '--agent', 'antigravity');
  const s = await startServe(root);
  assert.equal(s.page.engine, 'antigravity');
  assert.equal(s.page.cli, true);
  assert.equal(s.page.change, true); // engine supports structured output
  const [refusedChange] = pick(await ask(s, 'change something', undefined, 'change'), 'failure');
  assert.match(refusedChange.message, /Only a blueprint/);

  const events = await ask(s, 'How do refunds work?');
  assert.deepEqual(pick(events, 'progress').map((p) => p.text), [
    'Reading the map overview',
    'Reading shop-api/routes/orders.js',
  ]);
  const [answer] = pick(events, 'answer');
  assert.equal(answer.title, 'Refunds');
  assert.equal(answer.session, 'agy-conv-test-01');

  await ask(s, 'What next?', answer.session);
  const [c1, c2] = s.calls();
  assert.ok(c1.args.includes('--input-format') && c1.args[c1.args.indexOf('--input-format') + 1] === 'stream-json');
  assert.ok(c1.args.includes('--output-format') && c1.args[c1.args.indexOf('--output-format') + 1] === 'stream-json');
  assert.ok(c1.args.includes('--disable-slash-commands'));
  assert.equal(c1.settings.toolPermission, 'request-review');
  assert.equal(c1.settings.allowNonWorkspaceAccess, false);
  assert.deepEqual(c1.settings.permissions.allow, ['command(node floorplan/query.mjs)']);
  for (const denied of ['write_file(*)', 'read_url(*)', 'execute_url(*)', 'download_url(*)', 'mcp(*)', 'read_file(floorplan/index.html)', 'read_file(floorplan/.cache)']) {
    assert.ok(c1.settings.permissions.deny.includes(denied), `settings denies ${denied}`);
  }
  assert.match(c1.message, /node floorplan\/query\.mjs/);
  assert.equal(c2.args[c2.args.indexOf('--conversation') + 1], 'agy-conv-test-01');
  assert.equal(c2.message, 'What next?');

  const [fail] = pick(await ask(s, 'SIGNED-OUT question'), 'failure');
  assert.equal(fail.code, 'not_logged_in');
});

test('Antigravity blueprint Change mode checks, retries, saves, and undoes via agy', async () => {
  const root = makeProject({});
  roots.push(root);
  fs.cpSync(FIXTURE_BP, root, { recursive: true });
  run('plan.mjs', root);
  run('build.mjs', root, '--no-agy-rule', '--agent', 'antigravity');

  const plan = readJson(path.join(root, 'floorplan', 'plan.json'));
  const brokenPlan = JSON.parse(JSON.stringify(plan));
  brokenPlan.endpoints.push({ method: 'POST', path: '/api/refunds', file: 'api/src/routes/missing.ts', name: 'Refund', access: 'signed-in' });

  const fixedPlan = JSON.parse(JSON.stringify(plan));
  fixedPlan.files.push({ path: 'api/src/routes/refunds.ts', name: 'Refund endpoints', description: 'Refunds a walk.', uses: ['api/src/services/payments.ts'] });
  fixedPlan.files.find((f) => f.path === 'web/app/bookings/page.tsx').calls.push('POST /api/refunds');
  fixedPlan.endpoints.push({ method: 'POST', path: '/api/refunds', file: 'api/src/routes/refunds.ts', name: 'Refund a walk', description: 'Refunds a walk.', access: 'signed-in' });

  const archText = fs.readFileSync(path.join(root, 'floorplan', 'architecture.json'), 'utf8');
  const changesFile = path.join(root, 'agy-changes.json');
  writeJson(changesFile, [
    { title: 'Broken', summary: 'Bad file ref.', plan: JSON.stringify(brokenPlan), architecture: archText, changes: [] },
    {
      title: 'Planned out refunds',
      summary: 'Added refund endpoint.',
      plan: JSON.stringify(fixedPlan),
      architecture: archText,
      changes: [{ ref: 'POST /api/refunds', change: 'new', note: 'Refund endpoint.' }],
      followups: ['Add email receipt'],
    },
  ]);

  const s = await startServe(root, { FAKE_CHANGES: changesFile });
  assert.equal(s.page.change, true);
  const events = await ask(s, 'also plan out refunds', undefined, 'change');
  assert.deepEqual(pick(events, 'failure'), []);
  const [answer] = pick(events, 'answer');
  assert.equal(answer.title, 'Planned out refunds');
  assert.ok(routeKeys(readGraph(root)).includes('POST /api/refunds'));

  const [, retry] = s.calls();
  assert.equal(retry.args[retry.args.indexOf('--conversation') + 1], 'agy-conv-test-01');
  assert.match(retry.message, /didn't pass the checks/);

  const undo = await (await fetch(s.base + '/api/plan/undo', {
    method: 'POST',
    headers: { 'x-floorplan-token': s.token },
  })).json();
  assert.equal(undo.ok, true);
  assert.ok(!routeKeys(readGraph(root)).includes('POST /api/refunds'));
});
