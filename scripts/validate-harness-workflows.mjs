#!/usr/bin/env node
// validate-harness-workflows — structural lint for the committed harness workflow JSON.
//
// The n8n-loop deploys these via MCP, but the committed JSON is the source of truth and must not
// silently rot. This is a dependency-free structural check (no n8n/docker needed) that catches the
// failure modes seen while building Epics B/C: missing required fields, duplicate node names,
// connections that reference a non-existent node, and CYCLES (n8n rejects cyclic graphs).
//
// Usage:  node scripts/validate-harness-workflows.mjs [glob-dir ...]   (defaults to _workspace/{wf,viz})
// Exit 0 = all valid, 1 = at least one problem (prints a per-file report).
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirs = process.argv.slice(2).map((d) => resolve(d));
const targets = dirs.length ? dirs : [join(repo, '_workspace/wf'), join(repo, '_workspace/viz')];

function listJson(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => join(dir, f));
}

function hasCycle(nodeNames, connections) {
  const adj = new Map(nodeNames.map((n) => [n, []]));
  for (const [src, conn] of Object.entries(connections)) {
    for (const out of conn.main ?? []) {
      for (const edge of out ?? []) {
        if (edge && typeof edge.node === 'string') (adj.get(src) ?? []).push(edge.node);
      }
    }
  }
  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map(nodeNames.map((n) => [n, WHITE]));
  const stack = [];
  function dfs(u) {
    color.set(u, GRAY); stack.push(u);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === GRAY) return [...stack, v];
      if (color.get(v) === WHITE) { const c = dfs(v); if (c) return c; }
    }
    color.set(u, BLACK); stack.pop(); return null;
  }
  for (const n of nodeNames) if (color.get(n) === WHITE) { const c = dfs(n); if (c) return c; }
  return null;
}

function validate(file) {
  const errs = [];
  let wf;
  try { wf = JSON.parse(readFileSync(file, 'utf8')); }
  catch (e) { return [`JSON parse error: ${e.message}`]; }

  if (typeof wf.name !== 'string' || !wf.name) errs.push('missing/invalid "name"');
  if (!Array.isArray(wf.nodes) || wf.nodes.length === 0) errs.push('missing/empty "nodes"');
  if (wf.connections == null || typeof wf.connections !== 'object') errs.push('missing "connections" object');
  if (errs.length) return errs;

  const names = [];
  for (const [i, n] of wf.nodes.entries()) {
    const where = `node[${i}]${n?.name ? ` "${n.name}"` : ''}`;
    if (typeof n?.name !== 'string' || !n.name) errs.push(`${where}: missing "name"`);
    else { if (names.includes(n.name)) errs.push(`duplicate node name "${n.name}"`); names.push(n.name); }
    if (typeof n?.type !== 'string' || !n.type) errs.push(`${where}: missing "type"`);
    if (typeof n?.typeVersion !== 'number') errs.push(`${where}: missing/invalid "typeVersion"`);
    if (n?.parameters != null && typeof n.parameters !== 'object') errs.push(`${where}: "parameters" must be an object`);
  }

  const nameSet = new Set(names);
  for (const [src, conn] of Object.entries(wf.connections)) {
    if (!nameSet.has(src)) errs.push(`connection source "${src}" is not a node`);
    for (const out of conn?.main ?? []) {
      for (const edge of out ?? []) {
        if (!edge || typeof edge.node !== 'string') errs.push(`connection from "${src}" has a malformed target`);
        else if (!nameSet.has(edge.node)) errs.push(`connection "${src}" → "${edge.node}": target is not a node`);
      }
    }
  }

  const cycle = hasCycle(names, wf.connections);
  if (cycle) errs.push(`CYCLE detected (n8n rejects cyclic graphs): ${cycle.join(' → ')}`);

  return errs;
}

let total = 0, bad = 0;
for (const dir of targets) {
  for (const file of listJson(dir)) {
    total++;
    const errs = validate(file);
    const rel = file.replace(repo + '/', '');
    if (errs.length) { bad++; console.error(`✗ ${rel}`); for (const e of errs) console.error(`    - ${e}`); }
    else console.log(`✓ ${rel}`);
  }
}
if (total === 0) { console.error('no workflow JSON found in:', targets.join(', ')); process.exit(1); }
console.log(`\n${total - bad}/${total} workflow JSON valid`);
process.exit(bad ? 1 : 0);
