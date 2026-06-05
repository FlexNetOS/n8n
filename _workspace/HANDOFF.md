# n8n-loop HANDOFF — 2026-06-05T07:14:41Z

> Cold-start resume package. A successor that has read **only** this file + the committed
> `_workspace/backlog.md` can continue the loop correctly. Latest-truth, not a log.

## Resume command
```
/n8n-loop resume from _workspace/HANDOFF.md (branch master) — read the committed handoff checkpoint,
run its Verify-on-resume baseline, then continue at the backlog's next item — B-3 is (APPLY): in SAFE
mark it blocked and proceed to C-1
```
On RESUME: reset `cycles_this_session=0`, keep `cycles_total=7`, keep `apply_mode=0` (SAFE).

## Repo & branch
- Path: `~/Desktop/meta/n8n` @ `master`
- HEAD: `8237f8aabd`
- `git status`: clean **except** one untracked transient `.claude/scheduled_tasks.lock`
  (cron-scheduler lock — NOT loop state; ignore it, do not commit it).
- This is a **meta-repo member** (the n8n repo is its own git repo). Use plain `git` here, not `meta git`.

## Backlog (epics — current item starred ★)
Source of truth = `_workspace/backlog.md`. Mirror exactly:

- **Epic 0 — harness self-test:** ✅ 0-1 done.
- **Epic A — map the meta codebase:** ✅ **COMPLETE** (A-1, A-2, A-3, A-4 all `[x]`).
  - A-1 → `_workspace/meta-inventory.md` (51 repos inventory)
  - A-2 → indexed all 51 repos, symbol table appended to meta-inventory.md
  - A-3 → `_workspace/meta-codemap.md` (automation surfaces)
  - A-4 → `_workspace/meta-dataflow.md` (3 mermaid views: build spine / runtime data-flow / n8n exec)
- **Epic B — Claude CLI ↔ n8n chat bridge:**
  - B-1 ✅ → `.claude/specs/claude-n8n-chat-bridge.md` (guardrails-first spec; threats T1–T6 → gates G1–G7)
  - B-2 ✅ → `_workspace/wf/claude-n8n-chat-bridge.json` (5 nodes, validate_workflow = valid/0 errors; NOT deployed)
  - ★ **B-3 (APPLY)** `- [ ]` → deploy bridge to local n8n + smoke a chat round-trip. **Top unchecked item.**
- **Epic C — visualize code/data-flow in n8n:**
  - C-1 `- [ ]` → define code→n8n viz mapping → `_workspace/viz/MAPPING.md` (doc-only, **SAFE-doable**)
  - C-2 `- [ ]` → generate one validated viz workflow per repo from A-4 map → `_workspace/viz/*.json`
        (author+validate only, **SAFE-doable**)
  - C-3 (APPLY) `- [ ]` → deploy viz workflows + verify render (blocks like B-3)

## Cycle ledger (`_workspace/loop_state.md`)
- cycles_this_session = **3** (budget tripped the handoff) · cycle_budget = 3
- cycles_total = **7** · apply_mode = **0 (SAFE)**
- This session was itself a RESUME (from prior HANDOFF `cf9578e7bc`). Cycles this session: cy1=A-4, cy2=B-1, cy3=B-2.

## In-flight cycle
**None — clean boundary.** Cycle 3 (B-2) completed, verified, and committed. No partial artifacts;
`_workspace/viz/` does not exist yet (C-1 untouched). Tree is clean.

## Landed this session (commit hashes + subjects)
- `8237f8aabd` docs(harness): n8n-loop B-2 — author + validate Claude↔n8n bridge workflow
- `3fed901409` docs(harness): n8n-loop B-1 — Claude↔n8n chat-bridge spec (guardrails-first)
- `a7d54f0313` docs(harness): n8n-loop A-4 — cross-repo data-flow map (Epic A complete)
- (`cf9578e7bc` was the *prior* session's handoff checkpoint — already landed before this session.)
- A relay commit (this HANDOFF) will land on top after this agent returns — do not re-do it.

## ★ NEXT ITEM — IMPORTANT NUANCE (do not stall on B-3, do not deploy)
The top unchecked item is **B-3**, but it is **(APPLY)** and CANNOT run now. Two hard prerequisites
are unmet plus the runtime is down:
1. **APPLY mode** — needs `N8N_APPLY=1`; currently SAFE (apply_mode=0). The loop must NOT deploy/push in SAFE.
2. **Instance env `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,path,fs`** — the bridge's secure
   `execFile` Code-node path needs it (Code node is sandboxed). See spec §7.
3. **n8n runtime UP** (container profile, both MCP surfaces) — currently DOWN.

**Correct successor action (the loop's SAFE error-path):**
1. Mark B-3 in `_workspace/backlog.md`:
   `- [!] blocked: needs APPLY (N8N_APPLY=1) + instance env NODE_FUNCTION_ALLOW_BUILTIN + running n8n`
   (do **not** force, do **not** deploy).
2. Commit that backlog update (counts as the cycle's work).
3. **Proceed to C-1** — the next reversible, SAFE-doable item: define the code→n8n visualization
   mapping → `_workspace/viz/MAPPING.md`. Doc-only; input is the committed A-4 map
   (`_workspace/meta-dataflow.md`). Fully doable in SAFE mode.

In SAFE mode the successor can keep going through **C-1 and C-2** (reversible author/validate).
**B-3 and C-3 are the APPLY gates** that block until `N8N_APPLY=1` + runtime up + env prereq.

## Open findings / blockers
- **B-3 (APPLY) will block** on resume — see NEXT ITEM. Not a failure; it's the SAFE design.
  Becomes NEEDS-HUMAN only when someone wants it live: requires `N8N_APPLY=1`, a booted container-profile
  n8n, and the `NODE_FUNCTION_ALLOW_BUILTIN` env set before deploy.
- No failing gates. No contradiction between backlog and commits (both agree: A-1..B-2 done, B-3 pending).
- The untracked `.claude/scheduled_tasks.lock` is the only non-clean status entry — transient, ignore.

## Decisions & dead ends
- **Bridge uses a Code node + `execFile` argv path, NOT an Execute Command node** (spec gate G1) — avoids
  shell interpolation / injection entirely. Consequence: needs `NODE_FUNCTION_ALLOW_BUILTIN` (the B-3 gate).
- **Guardrails were specced before authoring** (B-1 before B-2): threat model T1–T6 → gates G1–G7
  (no-shell, allowlist fail-closed, cwd confinement, scrubbed env + `--permission-mode plan` + secret
  redaction, timeout/output cap, chat auth, SAFE-off-by-default).
- **`.gitignore` carve-out** un-ignores the durable deliverables so they survive cold resume: the
  ledger/sentinels, the three map files, `.claude/specs/claude-n8n-chat-bridge.md`, and `_workspace/wf/*.json`.
  Verified: `git check-ignore` returns nonzero (= un-ignored) and all 5 are committed.
- A-4 was synthesized **from the committed A-1/A-2/A-3 map files**, NOT by re-indexing — cheaper, deterministic.
- SAFE-mode rule (backlog Notes): a down runtime → mark the (APPLY) item blocked/NEEDS-HUMAN, never "failed".

## Runtime watch
- **n8n is DOWN** at handoff. It is **not needed for C-1/C-2** (doc + offline author/validate via n8n-mcp).
- Needed only for the APPLY items (B-3, C-3). To enable those: boot via **`n8n:run-n8n`** (container
  profile, per `n8n:runtime`), confirm `/healthz` 200, re-confirm both MCP surfaces (n8n-mcp + n8n-builtin
  Bearer token valid), AND set `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,path,fs` on the instance
  **before** any bridge deploy.
- B-2's `validate_workflow` ran against the runtime profile offline (n8n-mcp) and passed — no live instance
  was required for authoring/validation.

## Verify-on-resume (cheapest gate that proves a sane baseline — run these FIRST)
```bash
git -C /home/drdave/Desktop/meta/n8n status --short          # clean (ignore .claude/scheduled_tasks.lock)
git -C /home/drdave/Desktop/meta/n8n log --oneline -4        # expect: <relay handoff> / 8237f8aabd B-2 / 3fed901409 B-1 / a7d54f0313 A-4
# durable deliverables present + un-ignored (check-ignore returns nonzero = correct, carve-out un-ignores them):
git -C /home/drdave/Desktop/meta/n8n check-ignore _workspace/meta-dataflow.md \
  .claude/specs/claude-n8n-chat-bridge.md _workspace/wf/claude-n8n-chat-bridge.json
```
Then re-read state before mutating anything:
```bash
cat _workspace/backlog.md        # A-1..B-2 are [x]; B-3 is the top [ ] and is (APPLY)
cat _workspace/loop_state.md     # confirm apply_mode=0, cycles_total=7
```
No build/test gate is needed to resume — this session produced **doc/spec/JSON artifacts only**
(no compiled source touched), so a clean tree + correct git log + present-and-tracked deliverables
is a sufficient baseline. Do NOT run a full monorepo build to gate the resume.
Apply the RESUME-reset (cycles_this_session=0, keep cycles_total=7), then continue per NEXT ITEM.
