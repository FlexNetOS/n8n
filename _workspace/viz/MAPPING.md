<!-- markdownlint-disable -->
# Code → n8n visualization mapping

> Backlog item **C-1** (`n8n-loop`, Epic C — add all code to n8n to visualize data flow & automations).
> Defines the deterministic rules for turning the meta codebase map (A-1..A-4) into **n8n
> visualization workflows** — pure diagrams (no execution) made of `NoOp` + `Sticky Note` nodes.
> C-2 generates the JSON from these rules; C-3 (APPLY) deploys them. Created 2026-06-05.
> Inputs: `_workspace/meta-inventory.md` (A-1/A-2), `_workspace/meta-codemap.md` (A-3),
> `_workspace/meta-dataflow.md` (A-4 — the three mermaid views are the diagram source of truth).

## 1. Principle — diagram, not execution
These workflows **visualize** structure; they are never triggered or run. So:
- Every code element becomes an **inert `n8n-nodes-base.noOp`** node (no trigger, no credentials).
- Relationships become **`main` connections** between NoOp nodes.
- Grouping/labels become **`n8n-nodes-base.stickyNote`** background nodes.
- No trigger node is added (a triggerless workflow can't execute — exactly what we want for a diagram).
  `validate_workflow` will warn "no trigger"; that warning is **expected and acceptable** for viz
  workflows (record it, don't add a trigger).

## 2. Element → node mapping
| Source element (from A-1..A-4) | n8n node | Naming | Notes field / annotation |
|--------------------------------|----------|--------|--------------------------|
| A repo / crate / component (e.g. `meta_cli`, `weave`, `n8n`) | `n8n-nodes-base.noOp` `typeVersion:1` | node `name` = the repo/component name (exactly, for readability) | `notes` = language + symbol count (A-2) + role (A-3), e.g. `Rust · 432 sym · host CLI` |
| A subsystem inside a repo (e.g. n8n `scaling queue`, `webhooks`) | `noOp` | `name` = `<repo>: <subsystem>` | `notes` = the A-3 surface detail |
| An MCP server / CLI bin / trigger surface | `noOp` | `name` = the surface (e.g. `meta-mcp`, `ScheduleTrigger`) | `notes` = tool list / role |

## 3. Edge → connection mapping
- Each **directed data-flow edge** in A-4 (View 1 deps, View 2 runtime flow, View 3 n8n execution)
  becomes a `connections[<source name>].main[0] += { node: <target name>, type: "main", index: 0 }`.
- Edge direction follows the arrow in the mermaid source (`A --> B` ⇒ connection from A to B).
- **The graph MUST stay acyclic** — `validate_workflow` rejects any cycle (incl. a 2-cycle) with a
  hard error ("Workflow contains a cycle"). So **bidirectional / back / loop-closing edges are NOT
  drawn as connections** — keep the single forward edge and **annotate the reverse relationship on a
  node's `notes`** instead. (Learned in C-2: `agent→ledger→ralph→agent` and `meta↔meta-mcp` both had
  to be broken this way.) Pick the forward direction that yields a DAG; annotate the rest.
- Dotted/"observes" edges (e.g. `runtime -. health .-> broker`) are emitted as normal `main`
  connections **only if** they don't introduce a cycle; otherwise annotate (same rule as above).

## 4. Group → Sticky Note mapping
Each **subgraph / layer** in the A-4 views becomes one `n8n-nodes-base.stickyNote` `typeVersion:1`
sized to bound its member nodes:
- `content` = `## <Layer name>\n<one-line description>` (markdown).
- `position` = top-left of the member cluster (slightly up/left of the first member).
- `width`/`height` = cover the cluster (rule of thumb: `width = cols*220 + 80`, `height = rows*140 + 80`).
- `color` (n8n palette 1–7) by layer type:

| Layer | color | Examples |
|-------|------:|----------|
| Foundation libs | 7 (gray) | loop_lib, meta_core, meta_plugin_protocol |
| CLIs / orchestration | 4 (blue) | meta, meta-git, loop, agent |
| MCP servers | 5 (purple) | meta-mcp, weave, n8n-mcp, n8n-builtin |
| Mesh | 6 (pink) | weave broker, peers |
| n8n runtime | 3 (green) | triggers, workflow-runner, queue, workers |
| Harness / loop | 2 (orange) | ralph-n8n.sh, ScheduleWakeup, _workspace |
| External agent | 1 (yellow) | claude -p / human |

## 5. Layout (deterministic grid)
- **Left-to-right by topological layer** (mirrors the mermaid `flowchart` rank).
- Grid step: **x += 220** per layer column, **y += 140** per node within a layer.
- Layer columns (View 2 master): `col0` agent/human → `col1` meta+plugins → `col2` child-repos cluster
  + (parallel) weave mesh → `col3` n8n runtime → `col4` harness/ledger.
- Sticky Notes are emitted **first** in the `nodes` array (so they render behind the NoOp nodes).

## 6. Which workflows to generate (C-2 scope)
Default: **three master diagrams**, one per A-4 view (clean, faithful, low node-count):
1. `viz/01-build-spine.json` — A-4 **View 1** (Rust crate dependency spine): ~11 NoOp + 3 sticky groups (foundation/mid/plugins).
2. `viz/02-runtime-dataflow.json` — A-4 **View 2** (whole-workspace runtime data-flow): ~16 NoOp + 5 sticky groups. **Primary diagram.**
3. `viz/03-n8n-execution.json` — A-4 **View 3** (n8n internal execution): ~12 NoOp + 2 sticky groups.

> Per-repo diagrams (one NoOp graph per repo's internal call structure) are **out of scope for C-2**
> by default — 42 code repos would be 42 low-value near-empty graphs. If wanted later, add as a C-4.
> This bound is explicit (no silent truncation): C-2 produces the 3 masters above.

## 7. Worked example (the pattern C-2 follows)
A 2-node fragment of `02-runtime-dataflow.json` (agent → meta), with a layer sticky:
```json
{
  "name": "meta workspace — runtime data-flow (viz, do-not-run)",
  "nodes": [
    { "parameters": { "content": "## External agent\nclaude -p drives the workspace", "height": 220, "width": 200, "color": 1 },
      "id": "sticky-agent", "name": "grp: agent", "type": "n8n-nodes-base.stickyNote", "typeVersion": 1, "position": [-40, -60] },
    { "parameters": {}, "id": "n-agent", "name": "claude -p (agent)", "type": "n8n-nodes-base.noOp", "typeVersion": 1, "position": [0, 0], "notes": "Claude Code CLI — drives meta + n8n via MCP" },
    { "parameters": {}, "id": "n-meta", "name": "meta", "type": "n8n-nodes-base.noOp", "typeVersion": 1, "position": [220, 0], "notes": "Rust · 432 sym · host CLI (orchestrates 51 repos)" }
  ],
  "connections": {
    "claude -p (agent)": { "main": [[{ "node": "meta", "type": "main", "index": 0 }]] }
  },
  "settings": { "executionOrder": "v1" }
}
```
C-2 expands this with all nodes/edges/stickies from the corresponding A-4 view, then runs
`validate_workflow` (expect: valid; only the "no trigger" warning, which is acceptable here).

## 8. Grounding (node facts confirmed via n8n-mcp)
- `n8n-nodes-base.noOp` — `typeVersion: 1`, no parameters (inert). Optional `notes` for annotation.
- `n8n-nodes-base.stickyNote` — `typeVersion: 1`, required `height`(160) / `width`(240) / `color`(1),
  optional `content` (markdown). Color is a number 1–7.
- `notes` is a standard node field (shown on hover) — used here for per-node annotations.

## Epic C progress
- ✅ **C-1** (this file): mapping defined.
- **C-2** (next): generate the 3 master viz workflows → `_workspace/viz/0{1,2,3}-*.json`, each
  `validate_workflow`-clean (modulo the expected no-trigger warning). SAFE: validate, do not deploy.
- **C-3** (APPLY): deploy the viz workflows to local n8n; verify each renders. Blocks in SAFE like B-3.
