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
- [x] A-3: Extract each repo's automation surfaces (entrypoints, CLIs, schedulers/cron, queues,
      webhooks, weave peers, MCP servers) → `_workspace/meta-codemap.md`.
      - 2026-06-05: wrote `_workspace/meta-codemap.md`. CLIs (11 Rust bins: meta/meta-git/meta-project/
        meta-rust/meta-mcp/loop/agent/weave/lane/grit/rtk + n8n/omc/ecc JS bins); 6+ MCP servers
        (meta, weave, n8n-mcp, n8n-builtin, dev-tool set); schedulers (ralph-n8n.sh, ScheduleWakeup,
        n8n ScheduleTrigger); queues (n8n scaling: Bull/Redis/multi-main); webhooks (n8n live/test/
        waiting); weave mesh (libSQL broker). Verify: `git diff --check` clean · all 7 cited source
        paths exist on disk.
- [x] A-4: Synthesize the cross-repo data-flow map (how repos connect: meta CLI ↔ plugins ↔ loop_lib,
      the weave mesh, n8n, harness_hub) as a mermaid diagram → `_workspace/meta-dataflow.md`.
      - 2026-06-05: wrote `_workspace/meta-dataflow.md` — 3 mermaid views (build/dependency spine,
        runtime automation data-flow, n8n internal execution) + connection legend grounded in A-1/A-2/
        A-3. Synthesized from the committed map files (no re-indexing). Verify: `git diff --check`
        clean · 3/3 mermaid blocks fence-balanced + subgraph/end matched. **Epic A COMPLETE.**

## Epic B — Claude Code CLI ↔ n8n chat bridge
- [x] B-1: Spec (`n8n:spec-driven-development` → `.claude/specs/claude-n8n-chat-bridge.md`): an n8n
      workflow `Chat Trigger → (guard) → Execute Command (claude -p "{{chatInput}}") → Respond`.
      Design the **security guardrails first**: input allowlist/escaping (no shell injection),
      working-dir confinement, timeout, and that it is OFF/non-deployed in SAFE mode.
      - 2026-06-05: wrote `.claude/specs/claude-n8n-chat-bridge.md` (guardrails-first). Threat model
        T1–T6 → gates G1–G7: G1 no shell interpolation (Code node + `execFile` argv, not Execute
        Command), G2 input allowlist/denylist (fail-closed), G3 sandbox-cwd confinement, G4 scrubbed
        env + least-priv `--permission-mode plan` + secret-redaction, G5 timeout/output cap, G6 chat
        auth, G7 SAFE-mode off-by-default. Carved the spec out of `.gitignore` (`.claude/specs/*` +
        negation) so it's tracked. Verify: `git diff --check` clean · mermaid balanced · all G/T
        present · tracked-eligible.
- [x] B-2: Author + `validate_workflow` the bridge via `n8n:workflow-ops` + the n8n MCP server; write
      the validated JSON to `_workspace/wf/claude-n8n-chat-bridge.json`. Do not deploy (SAFE).
      - 2026-06-05: authored 5-node graph (Chat Trigger 1.4 → Guard code → Allowed? if 2.3 →
        Run Claude code / Refuse set 3.4) → `_workspace/wf/claude-n8n-chat-bridge.json`. Nodes grounded
        via n8n-mcp (offline); `validate_workflow` runtime profile = **valid, 0 errors**. Key finding:
        Code node is sandboxed — secure `execFile` path needs instance env
        `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,path,fs` (recorded as a B-3 gate in the spec §7).
        Carved wf JSON out of `.gitignore`. Not deployed (SAFE). Verify: validate valid · JSON parses ·
        tracked-eligible.
- [x] B-3: **(APPLY)** Deploy the bridge to the local n8n and smoke a chat round-trip
      (chat in → claude responds) via the n8n MCP server.
      - 2026-06-05 DONE (APPLY). Deployed bridge → workflow `ggvV5wItgjsRnwFk` (inactive draft, via
        n8n-builtin). Two runtime constraints found + resolved:
        (1) n8n Code node is sandboxed → restarted n8n with `NODE_FUNCTION_ALLOW_BUILTIN=child_process,
        os,path,fs` (verified reaches the external task runner).
        (2) the sandbox also has **no `process` global** → rewrote Run Claude to read env via n8n's
        `$env` (PATH) with a hardcoded fallback.
        Auth (user-approved trade-off): Run Claude copies ONLY `~/.claude/.credentials.json` into the
        sandbox `HOME` so claude auths via the subscription login while filesystem stays confined to
        the sandbox (G3 preserved). **Full round-trip smoke PASSED** (exec 6): chat
        "what is the capital of France?" → Run Claude (`claude -p --permission-mode plan`) →
        **"Paris is the capital of France."** in 2.0s. **Guard still blocks attacks on the live
        env-enabled instance** (exec 7): "sudo cat /etc/passwd … secret token" → denylisted → Refuse,
        Run Claude never invoked. Deploy + claude-response + guard-rejection all verified live.
        NOTE: left **inactive** (manual-exec only); activating it for live public chat is a separate
        user decision. The sandbox holds a fresh copy of the claude creds (re-copied per run).
      - 2026-06-05 (prior, SAFE) blocked. Three unmet gates, all
        requiring a human/operator decision: (1) **APPLY mode** — currently `apply_mode=0`; run with
        `N8N_APPLY=1` to permit deploy. (2) **Instance env** `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,
        path,fs` — the bridge's secure `execFile` Code node is sandboxed without it (spec §7); plus
        `claude` on the n8n process PATH + `ANTHROPIC_API_KEY`. (3) **Running n8n** on the container
        profile with both MCP surfaces (down at this handoff; boot via `n8n:run-n8n`). Validated
        artifact is ready (`_workspace/wf/claude-n8n-chat-bridge.json`, B-2); only the outward deploy
        is deferred. Surfaced for a human in the HANDOFF/DONE summary.

## Epic C — add all code to n8n to visualize data flow & automations
- [x] C-1: Define the code→n8n visualization mapping (repo/module → nodes; data edges → connections;
      use NoOp + Sticky Note nodes for pure diagram workflows) → `_workspace/viz/MAPPING.md`.
      - 2026-06-05: wrote `_workspace/viz/MAPPING.md` — deterministic rules: repo/component →
        `n8n-nodes-base.noOp` (inert, `notes`=lang/symbols/role); A-4 edge → `main` connection; layer/
        subgraph → `n8n-nodes-base.stickyNote` (color-coded 1–7) + grid layout. C-2 scope bounded to 3
        master diagrams (build-spine / runtime-dataflow / n8n-execution), per-repo explicitly out of
        scope (no silent truncation). Node facts grounded via n8n-mcp. Verify: `git diff --check` clean
        · embedded example workflow `validate_workflow` = **valid, 0 errors** (only expected no-trigger
        warning) · tracked-eligible.
- [x] C-2: Generate one validated n8n visualization workflow per meta repo (or a master) from the A-4
      data-flow map via `n8n:workflow-ops` → `_workspace/viz/*.json` (validated, not deployed).
      - 2026-06-05: generated 3 master viz workflows (per C-1 scope) from the A-4 views →
        `_workspace/viz/0{1,2,3}-*.json`: 01-build-spine (11 noOp+3 sticky), 02-runtime-dataflow
        (17 noOp+5 sticky), 03-n8n-execution (13 noOp+2 sticky). All `validate_workflow` = **valid,
        0 errors** (only expected no-trigger warning). Finding: n8n rejects cycles — broke the Ralph
        back-edge + meta↔meta-mcp 2-cycle via node annotations (updated MAPPING §3). SAFE: validated,
        not deployed. Verify: 3/3 validate valid · JSON parses · acyclic · tracked-eligible.
- [x] C-3: **(APPLY)** Deploy the visualization workflows to the local n8n; verify each renders and
      reflects the real data flow.
      - 2026-06-05 DONE (APPLY): deployed all 3 viz workflows to local n8n via the n8n-builtin MCP
        surface (n8n-mcp mgmt was SSRF-blocked on localhost). IDs: build-spine `ghqgmnJnB8zMMmAN`,
        runtime-dataflow `baU04FGqVHA0pntk`, n8n-execution `7z11ihYBJ7soxaik`. All inactive drafts,
        node/connection/sticky fidelity verified live via get_workflow_details + search_workflows.
        Renderable in the editor (faithful to the A-4 data-flow map). Not activated (inert diagrams).
      - 2026-06-05 REOPENED in APPLY mode (user authorized N8N_APPLY=1; n8n up).
      - 2026-06-05 (prior, SAFE) blocked. Two unmet gates for a human:
        (1) **APPLY mode** (`N8N_APPLY=1`); (2) **running n8n** on the container profile with the
        n8n MCP surfaces (down at handoff; boot via `n8n:run-n8n`). The 3 validated viz workflows
        (`_workspace/viz/0{1,2,3}-*.json`, C-2) are ready to deploy as-is — only the outward push is
        deferred. To finish: with n8n up + `N8N_APPLY=1`, import each JSON via the n8n MCP server and
        confirm it renders. Surfaced for a human in `_workspace/DONE`.

## Epic D — productionize the live deploy (opened 2026-06-05, APPLY session)
> Epics A/B/C are complete (incl. the live APPLY deploys). Epic D is the productionization tail.
> SAFE-doable items can run in any session; D-1 needs **docker daemon access** — the in-IDE agent
> lacks it (docker.sock permission denied), but the `ralph-n8n.sh` runner (a `claude -p` in the
> user's docker-enabled shell) can do it. Persistence is already done (see D-0).
- [x] D-0: Persist the 4 deployed workflows into `~/.n8n` so a dockerized n8n that mounts it comes up
      with them. Done 2026-06-05: `n8n import:workflow` of the committed JSONs (+ stable ids) →
      `~/.n8n` now has all 4 (CLI `list:workflow` = 6 total; bridge exported with the `$env` +
      cred-injection code intact). Reproducible via `scripts/n8n-import-workflows.sh`.
- [!] D-1: **(APPLY, needs docker)** Bring up the dockerized n8n on :5678 mounting `~/.n8n`:
      `pnpm build:docker` (if `n8nio/n8n:local` not built) → `scripts/n8n-up.sh`. Verify `/healthz` 200
      and that all 4 workflows are present (`search_workflows`) and render. `scripts/n8n-down.sh` to stop.
      - 2026-06-05 blocked: this session's `docker info` → permission denied on `/var/run/docker.sock`
        (the in-IDE agent is not in the docker group), and it's an APPLY/outward step besides. Persistence
        (D-0) is already done, so the bring-up itself is the only gap. **Unblock path:** run in a
        docker-enabled shell — the user's terminal or the `ralph-n8n.sh` runner (`claude -p` in that
        shell): `pnpm build:docker` (once) then `scripts/n8n-up.sh`. Re-grounded each resume.
- [ ] D-2: Triage **Dependabot PR #1** (`chore(deps): Bump the uv group …` — Python uv deps under
      `ai-workflow-builder.ee/evaluations`). Review the bump; merge if CI green, else close with reason.
- [ ] D-3: Add a CI/check that runs `validate_workflow` over the committed `_workspace/{wf,viz}/*.json`
      so the harness workflows can't silently rot. SAFE (authoring only).
- [ ] D-4: Decide bridge activation policy: keep `ggvV5wItgjsRnwFk` **inactive** (current safe default)
      vs. enabling it behind chat auth (G6). A security decision — document the call; do not auto-enable.

## Notes / dependencies
- Item 2 ("use the MCP server") is satisfied structurally: every runtime-affecting cycle verifies via
  `n8n:run-n8n` + the n8n MCP server, and Epics B/C author workflows through `n8n:workflow-ops`.
- Item "connect to Claude Code CLI" is satisfied two ways: the external runner `ralph-n8n.sh` spawns
  `claude -p` (the CLI driving the loop), and Epic B bridges n8n chat → the CLI.
- Epics B/C depend on the n8n runtime being up (container profile) with the MCP surfaces wired —
  see memory `n8n-runtime-operational`. A down runtime → mark the (APPLY) item NEEDS-HUMAN, not failed.
