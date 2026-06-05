# n8n-loop HANDOFF — 2026-06-05T06:58:02Z

Cold-start resume package. A successor that has read **only** this file plus the committed
backlog (`_workspace/backlog.md`) can continue the loop correctly with zero prior context.
This file is "latest truth," not a log — it overwrites any prior handoff.

## Resume command
```
/n8n-loop resume from _workspace/HANDOFF.md (branch master) — read the committed handoff checkpoint, run its Verify-on-resume baseline, then continue at backlog item A-4
```

## Repo & branch
- Path: `~/Desktop/meta/n8n` (`/home/drdave/Desktop/meta/n8n`)
- Branch: `master` · HEAD: `8a66b817dc`
- `git status`: **clean** (verified at handoff)
- Loop: **n8n-loop** (Ralph pattern), **SAFE mode** (`apply_mode=0` — no push / no PR / no shared-deploy).
  Items tagged **(APPLY)** are produced-but-not-acted in SAFE; run with `N8N_APPLY=1` to act.
- Deliverables survive cold resume via a `.gitignore` carve-out: the ledger + sentinels and the
  three map artifacts (`meta-inventory.md`, `meta-codemap.md`, `meta-dataflow.md`) are force-tracked
  (`!`-negation in `.gitignore`). The rest of `_workspace/` (logs, scratch JSON) stays ignored.

## Backlog (epics + items — current item starred)
Source of truth is `_workspace/backlog.md`; this mirrors it exactly.

- **Epic 0 — harness self-test**
  - [x] 0-1: dry-run one full cycle on a no-op slice (proved loop body + sentinels + carve-out)
- **Epic A — map the entire meta codebase**
  - [x] A-1: inventory all 51 meta repos → `_workspace/meta-inventory.md` (commit f86cfaf535)
  - [x] A-2: code-intel index of all 51 repos → A-2 table in `meta-inventory.md` (commit f3befae71f)
  - [x] A-3: automation surfaces → `_workspace/meta-codemap.md` (commit 8a66b817dc)
  - [ ] ⭐ **A-4 (NEXT): synthesize cross-repo data-flow map as a mermaid diagram → `_workspace/meta-dataflow.md`**
        (how repos connect: meta CLI ↔ plugins ↔ loop_lib, the weave mesh, n8n, harness_hub).
        Completing A-4 finishes Epic A.
- **Epic B — Claude Code CLI ↔ n8n chat bridge** (all pending)
  - [ ] B-1: spec the bridge workflow (`Chat Trigger → guard → Execute Command claude -p → Respond`),
        security guardrails first → `.claude/specs/claude-n8n-chat-bridge.md`
  - [ ] B-2: author + validate bridge JSON → `_workspace/wf/claude-n8n-chat-bridge.json` (no deploy)
  - [ ] B-3: **(APPLY)** deploy bridge to local n8n + smoke a chat round-trip
- **Epic C — add all code to n8n to visualize data flow & automations** (all pending)
  - [ ] C-1: define code→n8n visualization mapping → `_workspace/viz/MAPPING.md`
  - [ ] C-2: generate one validated viz workflow per repo (or master) from A-4 → `_workspace/viz/*.json`
  - [ ] C-3: **(APPLY)** deploy viz workflows to local n8n; verify each renders

## Cycle ledger (`_workspace/loop_state.md`)
- `cycles_this_session` = **3** · `cycles_total` = **4** · `cycle_budget` = **3** · `apply_mode` = **0**
- This session ran: cy1=A-1, cy2=A-2, cy3=A-3. **Budget tripped the handoff (3/3).**
- **RESUME-reset (successor MUST do this on resume):** set `cycles_this_session=0`, **keep**
  `cycles_total=4` (it carries across sessions; the next completed cycle makes it 5).

## In-flight cycle
**None — clean cycle boundary.** A-3 was fully verified and committed (HEAD 8a66b817dc); the tree is
clean. No partial spec/implementation/verify artifacts are mid-flight. A-4 has not been started.
Source material for A-4 already exists on disk: `_workspace/meta-inventory.md` (A-1/A-2) and
`_workspace/meta-codemap.md` (A-3 — especially its §7 "Cross-repo automation spine" preview block).

## Landed this session
- `8a66b817dc` docs(harness): n8n-loop A-3 — meta workspace automation surfaces
- `f3befae71f` docs(harness): n8n-loop A-2 — code-intel index of all 51 meta repos
- `f86cfaf535` docs(harness): n8n-loop A-1 — inventory all 51 meta repos
- (prior session, for context): `b7ace30d32` self-test cycle (0-1) · `b3a0f86b6d` add the loop

## Open findings
**No blockers, no failing gates, no NEEDS-HUMAN walls.** All three session cycles verified clean
(`git diff --check` clean; cited source paths exist; live code-intel queryable post-index).

Two non-blocking data-quality flags surfaced during mapping (carry forward, do not block A-4):
- `hermes-agent`: 0 call edges despite ~54.8k symbols (code-intel call-graph resolution gap, not a loop fault).
- Meta-repo census: 51 projects total → 42 code repos indexed, 9 empty + 8 stub hubs (these counts are
  the basis for A-4; do not re-derive — read them from `meta-inventory.md`).

## Decisions & dead ends
- **SAFE-mode discipline:** the loop produces validated artifacts only; (APPLY) items are deferred,
  never silently deployed. Epics B-3 and C-3 are the APPLY gates — leave them until `N8N_APPLY=1`.
- **Disk is the source of truth:** every cross-repo number (51 repos, 207,954 symbols, 326,955 call
  edges, MCP/scheduler/queue inventory) is already recorded in the two map files. A-4 should
  *synthesize from those files*, not re-run indexing or re-walk `.meta.yaml` — that work is done.
- **Carve-out tested live in 0-1** before any real work — the tracked-deliverable mechanism is proven,
  so committing `meta-dataflow.md` for A-4 will persist correctly across the next handoff.

## Runtime watch
**n8n not needed for A-4.** A-4 is a docs/diagram synthesis cycle (mermaid markdown) with no runtime
or MCP dependency; verify is doc-only (`git diff --check`).
- For later epics: B-3 and C-3 require the local n8n **up on the container profile** with both MCP
  surfaces wired (`n8n-mcp` + `n8n-builtin`); see memory `n8n-runtime-operational` and the
  `n8n:run-n8n` / `n8n:runtime` skills. n8n was **not running** at this handoff and is not expected
  up for the next cycle. When B-3/C-3 arrive: boot via `n8n:run-n8n`, confirm `/healthz` 200, and
  re-confirm the `n8n-builtin` Bearer token + n8n API key before any deploy. A down runtime →
  mark the (APPLY) item NEEDS-HUMAN, not failed.

## Verify-on-resume
Run these first to confirm a clean baseline before mutating anything (all cheap — A-4 is doc-only,
so no monorepo build is gated):
```bash
git -C /home/drdave/Desktop/meta/n8n status --short          # expect: clean (no output)
git -C /home/drdave/Desktop/meta/n8n log --oneline -3        # expect: 8a66b817dc A-3 / f3befae71f A-2 / f86cfaf535 A-1
ls _workspace/meta-inventory.md _workspace/meta-codemap.md   # both must exist (A-4 source material)
git -C /home/drdave/Desktop/meta/n8n ls-files _workspace/    # confirm meta-inventory.md + meta-codemap.md are TRACKED
# (git check-ignore returns nonzero for these — that's correct, the carve-out un-ignores them)
```
Then re-read `_workspace/backlog.md` (A-1/A-2/A-3 are `- [x]`, **A-4 is the top `- [ ]`**) and
`_workspace/loop_state.md`. Apply the RESUME-reset (cycles_this_session=0, cycles_total stays 4),
then continue at **A-4**.
