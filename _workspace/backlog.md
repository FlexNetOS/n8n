# n8n-loop backlog — autonomous harness work

Source of truth for the `n8n-loop`. One item per slice. Legend:
`- [ ]` todo · `- [x]` done+verified · `- [!] blocked: <reason>`.
Items run top-to-bottom; an epic's items are sequential (later items depend on earlier).
Seeded 2026-06-05 from the `/harness:harness` upgrade (build everything 1–5, loop-first).

> APPLY note: items tagged **(APPLY)** are outward/irreversible (deploy to a shared n8n, push, PR).
> In SAFE mode the loop produces the validated artifact and marks the item
> `- [!] blocked: needs APPLY` rather than acting. Run with `N8N_APPLY=1` to let it act.

## Epic 0 — harness self-test (prove the loop machinery first)
- [x] 0-1: Dry-run one full cycle end-to-end on a trivial no-op slice (touch a doc), exercising
      design→implement→verify(scoped build/lint)→commit→ledger-tick, to confirm the loop body,
      sentinels, and gitignore carve-out all work before real work starts.
      - 2026-06-05: slice = added `skills/n8n-loop/README.md` (launch/SAFE-APPLY/state quickref).
        Verify (doc-only: no compile target): `git diff --check` clean · runner `bash -n` clean ·
        skill frontmatter intact. Committed; ledger ticked. Loop machinery proven live.

## Epic A — map the entire meta codebase
- [x] A-1: Inventory every meta repo from `~/Desktop/meta/.meta.yaml` (name, path, remote, language,
      `meta:true` nesting) → write `_workspace/meta-inventory.md`.
      - 2026-06-05: wrote `_workspace/meta-inventory.md` — 51 projects, all cloned as independent
        repos. 21 Rust / 5 JS-TS / 2 Python / ~23 docs-hub; 1 nested (`mcp_hub` meta:true); 1 path
        override (`github_org`→`.github_org`). Verify: `git diff --check` clean · 51/51 repo names
        present (0 missing) · count reconciled (no-digit regex had missed `n8n`).
- [x] A-2: Index each repo with code intelligence (`git-kb code index` / `kb_index`); record symbol
      counts + health per repo → append to `_workspace/meta-inventory.md`.
      - 2026-06-05: indexed all 51 repos (git-kb 0.2.10), all rc 0. Appended A-2 table to
        meta-inventory.md: 207,954 symbols / 18,597 files / 326,955 call edges across 42 code repos;
        9 empty + 8 stub hubs. Verify: `git diff --check` clean · live `git-kb code symbols` queryable
        post-index. Health flag: `hermes-agent` 0 call edges despite 54.8k symbols (resolution gap).
- [ ] A-3: Extract each repo's automation surfaces (entrypoints, CLIs, schedulers/cron, queues,
      webhooks, weave peers, MCP servers) → `_workspace/meta-codemap.md`.
- [ ] A-4: Synthesize the cross-repo data-flow map (how repos connect: meta CLI ↔ plugins ↔ loop_lib,
      the weave mesh, n8n, harness_hub) as a mermaid diagram → `_workspace/meta-dataflow.md`.

## Epic B — Claude Code CLI ↔ n8n chat bridge
- [ ] B-1: Spec (`n8n:spec-driven-development` → `.claude/specs/claude-n8n-chat-bridge.md`): an n8n
      workflow `Chat Trigger → (guard) → Execute Command (claude -p "{{chatInput}}") → Respond`.
      Design the **security guardrails first**: input allowlist/escaping (no shell injection),
      working-dir confinement, timeout, and that it is OFF/non-deployed in SAFE mode.
- [ ] B-2: Author + `validate_workflow` the bridge via `n8n:workflow-ops` + the n8n MCP server; write
      the validated JSON to `_workspace/wf/claude-n8n-chat-bridge.json`. Do not deploy (SAFE).
- [ ] B-3: **(APPLY)** Deploy the bridge to the local n8n and smoke a chat round-trip
      (chat in → claude responds) via the n8n MCP server.

## Epic C — add all code to n8n to visualize data flow & automations
- [ ] C-1: Define the code→n8n visualization mapping (repo/module → nodes; data edges → connections;
      use NoOp + Sticky Note nodes for pure diagram workflows) → `_workspace/viz/MAPPING.md`.
- [ ] C-2: Generate one validated n8n visualization workflow per meta repo (or a master) from the A-4
      data-flow map via `n8n:workflow-ops` → `_workspace/viz/*.json` (validated, not deployed).
- [ ] C-3: **(APPLY)** Deploy the visualization workflows to the local n8n; verify each renders and
      reflects the real data flow.

## Notes / dependencies
- Item 2 ("use the MCP server") is satisfied structurally: every runtime-affecting cycle verifies via
  `n8n:run-n8n` + the n8n MCP server, and Epics B/C author workflows through `n8n:workflow-ops`.
- Item "connect to Claude Code CLI" is satisfied two ways: the external runner `ralph-n8n.sh` spawns
  `claude -p` (the CLI driving the loop), and Epic B bridges n8n chat → the CLI.
- Epics B/C depend on the n8n runtime being up (container profile) with the MCP surfaces wired —
  see memory `n8n-runtime-operational`. A down runtime → mark the (APPLY) item NEEDS-HUMAN, not failed.
