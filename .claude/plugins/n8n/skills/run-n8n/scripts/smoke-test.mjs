#!/usr/bin/env node
// run-n8n harness smoke test.
// Proves the full author -> validate -> deploy -> execute -> verify loop against a
// running n8n via the BUILT-IN MCP server (n8n-builtin, /mcp-server/http).
//
// Usage:  node .claude/plugins/n8n/skills/run-n8n/scripts/smoke-test.mjs
// Requires:
//   - n8n running (default http://localhost:5678) with MCP access enabled (Settings -> MCP)
//   - an mcp-server-api token in .claude/settings.local.json -> env.N8N_MCP_SERVER_TOKEN
//     (or the N8N_MCP_SERVER_TOKEN env var, or pass --token=...)
// Exit code 0 = PASS, 1 = FAIL. Pass --keep to leave the workflow in place (default),
// or --cleanup to archive it after the run.
import { readFileSync } from 'node:fs';

const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `--${k}=${d}`).split('=').slice(1).join('=');
const has = (k) => process.argv.includes(`--${k}`);
const BASE = arg('base', 'http://localhost:5678');
const URL = `${BASE.replace(/\/$/, '')}/mcp-server/http`;

function token() {
  if (process.env.N8N_MCP_SERVER_TOKEN) return process.env.N8N_MCP_SERVER_TOKEN;
  const fromArg = process.argv.find((a) => a.startsWith('--token='));
  if (fromArg) return fromArg.split('=').slice(1).join('=');
  try {
    return JSON.parse(readFileSync('.claude/settings.local.json', 'utf8')).env.N8N_MCP_SERVER_TOKEN;
  } catch {
    throw new Error('No token: set N8N_MCP_SERVER_TOKEN, pass --token=, or add it to .claude/settings.local.json');
  }
}

const TOKEN = token();
let id = 0;
async function call(name, args) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: 'tools/call', params: { name, arguments: args } }),
  });
  const text = await res.text();
  const line = text.split('\n').filter((l) => l.startsWith('data: ')).pop() || text;
  const json = JSON.parse(line.replace(/^data: /, ''));
  if (json.error) throw new Error(`${name}: ${JSON.stringify(json.error)}`);
  const content = (json.result?.content || []).map((c) => c.text).join('\n');
  let parsed;
  try { parsed = JSON.parse(content); } catch { parsed = { raw: content }; }
  return { isError: json.result?.isError, content, parsed };
}

const code = `import { workflow, node, trigger, expr } from '@n8n/workflow-sdk';

const start = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'When clicking Test' }
});

const setHello = node({
  type: 'n8n-nodes-base.set',
  version: 3.4,
  config: {
    name: 'Set Hello',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'a1', name: 'message', value: 'Hello from the n8n runtime harness', type: 'string' },
          { id: 'a2', name: 'ranAt', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    }
  }
});

export default workflow('harness-smoke', 'Harness Smoke Test')
  .add(start)
  .to(setHello);
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fail = (msg) => { console.error(`✗ FAIL: ${msg}`); process.exit(1); };

console.log(`run-n8n smoke test -> ${URL}`);

// 1. validate
const v = await call('validate_workflow', { code });
if (v.isError || v.parsed.valid !== true) fail(`validate_workflow: ${v.content.slice(0, 300)}`);
console.log(`✓ validate: valid (${v.parsed.nodeCount} nodes)`);

// 2. create
const c = await call('create_workflow_from_code', { code, name: 'Harness Smoke Test' });
const wfId = c.parsed.workflowId;
if (!wfId) fail(`create_workflow_from_code: ${c.content.slice(0, 300)}`);
console.log(`✓ create: ${wfId} (${c.parsed.url})`);

// 3. execute
const e = await call('execute_workflow', { workflowId: wfId, executionMode: 'manual' });
const execId = e.parsed.executionId;
if (!execId) fail(`execute_workflow: ${e.content.slice(0, 300)}`);
console.log(`✓ execute: executionId ${execId} (${e.parsed.status})`);

// 4. verify success (poll briefly)
let status = e.parsed.status;
for (let i = 0; i < 10 && status !== 'success' && status !== 'error'; i++) {
  await sleep(500);
  const g = await call('get_execution', { workflowId: wfId, executionId: String(execId) });
  status = g.parsed.execution?.status ?? status;
}
if (status !== 'success') fail(`execution status = ${status} (expected success)`);
console.log(`✓ verify: execution ${execId} status=success`);

// optional cleanup
if (has('cleanup')) {
  await call('archive_workflow', { workflowId: wfId });
  console.log(`✓ cleanup: archived ${wfId}`);
}

console.log('✓ PASS: author → validate → deploy → execute → verify');
