// Stand-in for `agy` in tests: answers --version, and in streaming JSON mode logs its arguments,
// parsed schema, settings file, and incoming user message to $FAKE_LOG, then emits Antigravity
// stream-json events (init, step_update, result). A prompt containing "SIGNED-OUT" fails with
// an authentication-required ERROR result. With $FAKE_CHANGES set, replies for blueprint Change tests.
import fs from 'node:fs';

const args = process.argv.slice(2);
if (args[0] === '--version') {
  console.log('1.5.15');
  process.exit(0);
}

let input = '';
process.stdin.on('data', (d) => { input += d; });
process.stdin.on('end', () => {
  const schemaIdx = args.indexOf('--json-schema');
  const schemaPath = schemaIdx >= 0 ? args[schemaIdx + 1] : null;
  const settingsIdx = args.indexOf('--settings');
  const settingsPath = settingsIdx >= 0 ? args[settingsIdx + 1] : null;
  const schema = schemaPath && fs.existsSync(schemaPath) ? JSON.parse(fs.readFileSync(schemaPath, 'utf8')) : null;
  const settings = settingsPath && fs.existsSync(settingsPath) ? JSON.parse(fs.readFileSync(settingsPath, 'utf8')) : null;

  let message = '';
  for (const line of input.split('\n')) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line);
      if (ev.event === 'user') {
        const c = ev.message?.content;
        message = typeof c === 'string' ? c : Array.isArray(c) ? c.map((b) => b.text || '').join('') : '';
      }
    } catch {}
  }

  fs.appendFileSync(process.env.FAKE_LOG, JSON.stringify({ args, input, message, schema, settings }) + '\n');
  const out = (ev) => console.log(JSON.stringify(ev));
  const convId = 'agy-conv-test-01';

  out({
    event: 'init',
    conversation_id: convId,
    init: { cwd: process.cwd(), tools: ['run_command', 'read_file', 'grep_search'], permission_mode: 'request-review' },
  });

  if (message.includes('SIGNED-OUT')) {
    out({
      event: 'result',
      result: {
        conversation_id: convId,
        status: 'ERROR',
        response: '',
        error: 'authentication required: run agy to sign in',
        duration_seconds: 0.1,
        num_turns: 1,
      },
    });
    return;
  }

  if (process.env.FAKE_CHANGES && schema?.properties?.architecture) {
    const replies = JSON.parse(fs.readFileSync(process.env.FAKE_CHANGES, 'utf8'));
    const counter = process.env.FAKE_CHANGES + '.n';
    const n = fs.existsSync(counter) ? +fs.readFileSync(counter, 'utf8') : 0;
    fs.writeFileSync(counter, String(n + 1));
    const reply = replies[Math.min(n, replies.length - 1)];
    out({
      event: 'step_update',
      step_update: {
        conversation_id: convId,
        step_index: 1,
        state: 'DONE',
        step_type: 'tool',
        tool_name: 'read_file',
        tool_info: { name: 'read_file', parameters: { Path: 'floorplan/plan.json' } },
      },
    });
    out({
      event: 'result',
      result: {
        conversation_id: convId,
        status: 'SUCCESS',
        response: JSON.stringify(reply),
        structured_output: reply,
        duration_seconds: 0.2,
        num_turns: 1,
      },
    });
    return;
  }

  out({
    event: 'step_update',
    step_update: {
      conversation_id: convId,
      step_index: 1,
      state: 'ACTIVE',
      step_type: 'tool',
      tool_name: 'run_command',
      tool_info: { name: 'run_command', parameters: { CommandLine: 'node floorplan/query.mjs overview' } },
    },
  });
  out({
    event: 'step_update',
    step_update: {
      conversation_id: convId,
      step_index: 1,
      state: 'DONE',
      step_type: 'tool',
      tool_name: 'run_command',
      tool_info: { name: 'run_command', parameters: { CommandLine: 'node floorplan/query.mjs overview' } },
    },
  });
  out({
    event: 'step_update',
    step_update: {
      conversation_id: convId,
      step_index: 2,
      state: 'DONE',
      step_type: 'tool',
      tool_name: 'read_file',
      tool_info: { name: 'read_file', parameters: { Path: 'shop-api/routes/orders.js' } },
    },
  });

  const payload = {
    title: 'Refunds',
    answer: 'Refunds go through [[f:shop-api/routes/orders.js]].',
    items: [{ id: 'f:shop-api/routes/orders.js', note: 'Holds the refund endpoint.' }],
    steps: [],
    followups: ['Who can ask for one?'],
  };
  out({
    event: 'step_update',
    step_update: {
      conversation_id: convId,
      step_index: 3,
      state: 'DONE',
      step_type: 'agent_response',
      text_delta: JSON.stringify(payload),
    },
  });
  out({
    event: 'result',
    result: {
      conversation_id: convId,
      status: 'SUCCESS',
      response: JSON.stringify(payload),
      structured_output: payload,
      duration_seconds: 0.2,
      num_turns: 1,
    },
  });
});
