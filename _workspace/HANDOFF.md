# n8n-loop HANDOFF — 2026-06-05T07:29:53Z

> Cold-start resume package. A successor that has read **only** this file + the committed
> `_workspace/backlog.md` can finish the loop correctly. Latest-truth, not a log.
>
> **THIS IS THE TERMINAL HANDOFF.** Exactly **one** backlog item remains (C-3), it is **(APPLY)**,
> and in SAFE mode it BLOCKS rather than deploys. The successor's entire remaining job is:
> block C-3 → write `_workspace/DONE` → commit → STOP. Do NOT deploy. Do NOT start new epics.

## Resume command
```
/n8n-loop resume from _workspace/HANDOFF.md (branch master) — block C-3 (APPLY) in SAFE, then write
_workspace/DONE; the loop terminates
```
On RESUME: reset `cycles_this_session=0`, **keep `cycles_total=10`**, keep `apply_mode=0` (SAFE).

## Repo & branch
- Path: `~/Desktop/meta/n8n` @ `master`
- HEAD: `517b02ae6b`
- `git status`: clean **except** one untracked transient `.claude/scheduled_tasks.lock`
  (cron-scheduler lock — NOT loop state; ignore it, do not commit it).
- This is a **meta-repo member** (the n8n repo is its own git repo). Use plain `git` here, not `meta git`.

## Backlog (epics — current item starred ★)
Source of truth = `_workspace/backlog.md`. Mirror exactly. **Only C-3 is `- [ ]`.**

- **Epic 0 — harness self-test:** ✅ 0-1 done.
- **Epic A — map the meta codebase:** ✅ **COMPLETE** (A-1, A-2, A-3, A-4 all `[x]`).
  - A-1 → `_workspace/meta-inventory.md` (51 repos) · A-2 → indexed all 51, symbol table appended
  - A-3 → `_workspace/meta-codemap.md` (automation surfaces) · A-4 → `_workspace/meta-dataflow.md` (3 mermaid views)
- **Epic B — Claude CLI ↔ n8n chat bridge:**
  - B-1 ✅ → `.claude/specs/claude-n8n-chat-bridge.md` (guardrails-first spec; threats T1–T6 → gates G1–G7)
  - B-2 ✅ → `_workspace/wf/claude-n8n-chat-bridge.json` (5 nodes, validate_workflow = valid/0 errors; NOT deployed)
  - B-3 **(APPLY)** `- [!] blocked` → deploy bridge + smoke chat round-trip. Blocked in SAFE (see Open findings).
- **Epic C — visualize code/data-flow in n8n:**
  - C-1 ✅ → `_workspace/viz/MAPPING.md` (deterministic code→n8n viz rules; noOp + stickyNote)
  - C-2 ✅ → `_workspace/viz/0{1,2,3}-*.json` (3 master viz workflows, all validate valid/0 errors; NOT deployed)
  - ★ **C-3 (APPLY)** `- [ ]` → deploy viz workflows + verify each renders. **LAST item — will block in SAFE.**

After C-3 is marked blocked, **no `- [ ]` remains** → the loop's DONE condition is satisfied.

## Cycle ledger (`_workspace/loop_state.md`)
- cycles_this_session = **3** (budget tripped the handoff) · cycle_budget = 3
- cycles_total = **10** · apply_mode = **0 (SAFE)**
- This session was a RESUME (from prior HANDOFF `06baa94b39`). Cycles this session: cy1=B-3(blocked), cy2=C-1, cy3=C-2.

## In-flight cycle
**None — clean boundary.** Cycle 3 (C-2) completed, verified, and committed. No partial artifacts; tree is clean.

## Landed this session (commit hashes + subjects)
- `517b02ae6b` docs(harness): n8n-loop C-2 — generate + validate 3 master viz workflows
- `22b5f6fd87` docs(harness): n8n-loop C-1 — code→n8n visualization mapping
- `dda9780acc` chore(harness): n8n-loop B-3 blocked — APPLY deploy deferred in SAFE
- (`06baa94b39` was the *prior* session's handoff checkpoint — landed before this session.)
- A relay commit (this HANDOFF) will land on top after this agent returns — do not re-do it.

## ★ NEXT ITEM — C-3, the LAST item (block it, then finish the loop)
The only unchecked item is **C-3**, and it is **(APPLY)**: "deploy the visualization workflows to the
local n8n; verify each renders." In SAFE mode the loop must NOT deploy. Unmet gates (same shape as B-3,
minus the bridge-specific env): **APPLY mode** (`N8N_APPLY=1`; currently `apply_mode=0`) + a **running n8n**
(currently DOWN). The viz deploy needs only those two — it does NOT need `NODE_FUNCTION_ALLOW_BUILTIN`
(that gate is bridge-only, for B-3).

**Correct successor action — small and TERMINAL:**
1. **Block C-3.** In `_workspace/backlog.md`, change the C-3 line to:
   `- [!] blocked: needs APPLY (N8N_APPLY=1) + running n8n (outward deploy)`
   (do **not** force, do **not** deploy). This is one cycle's work, a SAFE refusal exactly like B-3.
2. **Write `_workspace/DONE`** (the loop's terminal sentinel) with evidence:
   - Full commit list: A-1..A-4, B-1..B-2, B-3(blocked), C-1..C-2, C-3(blocked) — every item resolved.
   - Gate outcomes: all builds/`git diff --check`/`validate_workflow` runs **green**; the **two (APPLY)
     items B-3 + C-3 are blocked-and-surfaced** (not failed).
   - One-line "what a human must do to finish": run with `N8N_APPLY=1` + a running n8n (container profile,
     both MCP surfaces) to unblock B-3 and C-3; **for B-3 only**, also set
     `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,path,fs` on the instance before deploy.
3. **Commit** the DONE sentinel + ledger update, report, and **STOP — do not re-fire** (terminal).
   The relay does the commit; do not commit yourself if running under the relay.

After this, the backlog is **fully resolved** (every item `- [x]` or `- [!]`) with **2 APPLY items left
for a human**. The loop is finished. Do NOT deploy, do NOT start new epics, do NOT keep cycling.

## Open findings / blockers (the two NEEDS-HUMAN items left after DONE)
- **B-3 (APPLY) — BLOCKED** (`dda9780acc`). To go live, a human needs: `N8N_APPLY=1`, a booted
  container-profile n8n (both MCP surfaces), AND `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,path,fs`
  on the instance before deploy. Validated artifact ready: `_workspace/wf/claude-n8n-chat-bridge.json`.
- **C-3 (APPLY) — WILL BLOCK** on resume (last item). To go live: `N8N_APPLY=1` + running n8n. Validated
  artifacts ready: `_workspace/viz/0{1,2,3}-*.json`. No bridge env needed.
- No failing gates. **No contradiction** between backlog and commits (both agree: 0-1, A-1..A-4, B-1..B-2,
  C-1..C-2 done; B-3 blocked; C-3 is the sole pending and is APPLY).
- The untracked `.claude/scheduled_tasks.lock` is the only non-clean status entry — transient, ignore.

## Decisions & dead ends
- **n8n rejects cyclic workflow graphs** (C-2 finding): broke the Ralph loop back-edge and the
  meta↔meta-mcp 2-cycle via node annotations rather than real `main` edges; recorded in `MAPPING.md §3`.
  A successor regenerating viz must keep graphs acyclic.
- **C-2 scope is 3 master diagrams, not per-repo** (build-spine / runtime-dataflow / n8n-execution),
  bounded explicitly in C-1's MAPPING.md (no silent truncation of the 51-repo set).
- **Bridge uses a Code node + `execFile` argv path, NOT Execute Command** (spec gate G1) — avoids shell
  injection; consequence is the `NODE_FUNCTION_ALLOW_BUILTIN` gate that blocks B-3 until set.
- **`.gitignore` carve-out** un-ignores durable deliverables so they survive cold resume: ledger/sentinels,
  the three map files, the spec, `_workspace/wf/*.json`, `_workspace/viz/MAPPING.md` + `_workspace/viz/*.json`.
- A-4 / viz were synthesized **from the committed map files**, NOT by re-indexing — cheaper, deterministic.
- SAFE-mode rule (backlog Notes): a down runtime → mark the (APPLY) item blocked/NEEDS-HUMAN, never "failed".

## Runtime watch
- **n8n is DOWN** at handoff, and **it is not needed** to finish the loop — the remaining work is
  blocking C-3 + writing `_workspace/DONE` (pure on-disk, SAFE). No `/healthz`, no MCP surface required.
- n8n is needed **only by a human** later to unblock the two APPLY items (B-3, C-3): boot via
  `n8n:run-n8n` (container profile, per `n8n:runtime`), confirm `/healthz` 200, re-confirm both MCP
  surfaces (n8n-mcp + n8n-builtin Bearer token), and (B-3 only) set `NODE_FUNCTION_ALLOW_BUILTIN`.
  That is a human task outside the loop, not a successor cycle.

## Verify-on-resume (cheapest gate that proves a sane baseline — run these FIRST)
```bash
git -C /home/drdave/Desktop/meta/n8n status --short          # clean (ignore .claude/scheduled_tasks.lock)
git -C /home/drdave/Desktop/meta/n8n log --oneline -5        # expect: <relay handoff> / 517b02ae6b C-2 / 22b5f6fd87 C-1 / dda9780acc B-3 / 06baa94b39 handoff
# durable viz/wf/spec deliverables present (the C-2 artifacts are the newest):
ls -1 _workspace/viz/0?-*.json _workspace/viz/MAPPING.md _workspace/wf/claude-n8n-chat-bridge.json
```
Then re-read state before mutating anything:
```bash
cat _workspace/backlog.md        # only C-3 is `- [ ]`, and it is (APPLY)
cat _workspace/loop_state.md     # confirm apply_mode=0, cycles_total=10
```
No build/test gate is needed to resume — this loop produced **doc/spec/JSON artifacts only** (no compiled
source touched), so a clean tree + correct git log + present deliverables is a sufficient baseline.
Do NOT run a full monorepo build to gate the resume. Apply the RESUME-reset
(cycles_this_session=0, keep cycles_total=10), then execute the terminal NEXT ITEM (block C-3 → DONE → STOP).
