# n8n-loop HANDOFF — 2026-06-21T00:00:00Z

**Status: Epic D COMPLETE. Harness upgrade merged to `develop` (PR #12). D-1 docker bring-up executed by the agent (n8n :5678 healthz 200, 4 workflows render). No autonomous work left.**

Cold-start resume package. A successor that has read **only** this file + the committed
`_workspace/backlog.md` can continue with zero prior context.

## Resume command
```
/n8n-loop resume from _workspace/HANDOFF.md — read the committed handoff, run the Verify-on-resume
baseline, confirm the harness upgrade delivered green and merged to develop, then STAND DOWN unless
new backlog items exist.
```
**There is no remaining autonomous work.** The successor should:
1. Run the Verify-on-resume baseline (below) and confirm harness upgrade green + merged to develop.
2. **Stand down** — do NOT activate the bridge (D-4 keeps it INACTIVE).
3. Only resume real work if the user adds **new backlog items** to `_workspace/backlog.md`.
   (D-1 is done; `scripts/n8n-up.sh` / `scripts/n8n-down.sh` manage the dockerized instance.)

## Repo, branch & policy  ⚠️ READ THIS
- Path: `$META_ROOT/n8n`. Remote `FlexNetOS/n8n`. Memory: `n8n-branching-workflow`.
- **`master` = production, NO direct pushes** (classifier denies — DESIRED; don't add an allow rule).
  Dev work = feature branch off `develop` → `gh pr create --base develop` → **auto-merge on green**.
- Current HEAD branch: **`harness/epic-d`** (merged up to current `develop`).
- **Earlier Epic D phase (D-0..D-4) was MERGED to `develop` via PR #5** (~2026-06-05T21:05Z). The
  **harness-upgrade tail** (four pillars + DataTable handoff layer + bun swap, commits below) was
  committed afterward and is being merged via the `harness/epic-d` → `develop` PR.

## State
Epics **A / B / C complete + APPLY-deployed** (prior sessions: bridge `ggvV5wItgjsRnwFk` deployed
inactive; 3 viz workflows deployed). Epic D:
- **D-0** ✅ persisted 4 workflows into `~/.n8n` (`scripts/n8n-import-workflows.sh`).
- **D-1** ✅ done 2026-06-21 — `scripts/n8n-up.sh` brought up dockerized n8n on :5678 (`/healthz` 200);
  the 4 source-of-truth workflows imported + render (bridge INACTIVE per D-4, 3 viz do-not-run).
- **D-2** ✅ Dependabot resolved — relanded as **PR #8** (`deps/uv-bump-reland`, corrected title) and
  **MERGED** (~2026-06-05T21:19Z).
- **D-3** ✅ workflow-validate CI: `scripts/validate-harness-workflows.mjs` (structural lint + cycle
  detection) + `.github/workflows/harness-workflows-validate.yml`.
- **D-4** ✅ bridge activation policy decided — **keep INACTIVE** (safe default);
  `_workspace/D-4-bridge-activation-policy.md`. The loop does NOT auto-enable.

### Harness upgrade (2026-06-07): delivered + merging via PR

3 commits, 32 new files + 5 modified + gitignore carve-outs, all verified green:

| Commit | Description |
|--------|-------------|
| `524ab23` | feat(harness): four pillars (backlog-curator, feature-architect, verification-gate, docs-scribe) each with agent spec + n8n workflow; DataTable handoff schemas |
| `be3889ae` | chore(gitignore): carve-outs for `_workspace/handoff/` and `_workspace/pillars/` |
| `90d8962` | feat(harness): integrate upgrade into existing skills (continuity-steward, session-relay, n8n-loop SKILL.md/README, ralph-n8n.sh) |

Verification: 13/13 smoke test checks PASS, golden packet validates against schema, all JSON valid, all bash syntax clean.

### New harness architecture
- **4 pillars** (agent spec + n8n workflow each): backlog-curator, feature-architect, verification-gate, docs-scribe
- **DataTable ledger**: `handoff_packets` + `session_events` DataTables as authoritative state (schema in `_workspace/handoff/schemas/`)
- **Bun swap**: all harness scripts use bun; n8n source stays pnpm/node for CI/build (see `BUN-MIGRATION.md`)

## Remaining work
- **None.** Epic D is complete. D-1 was executed by the agent 2026-06-21 — dockerized n8n is managed via:
  ```
  scripts/n8n-up.sh      # bring up (image n8nio/n8n:local already built)
  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5678/healthz   # 200
  # 4 workflows render (bridge INACTIVE per D-4, 3 viz do-not-run); re-import via scripts/n8n-import-workflows.sh
  scripts/n8n-down.sh    # to stop (~/.n8n kept)
  ```
- **Optional future (NOT scheduled):** bridge activation. Security decision is already documented as
  **"keep inactive"** (D-4). Any activation is APPLY + requires explicit user sign-off and the 5-item
  precondition checklist in `_workspace/D-4-bridge-activation-policy.md`.

## Ledger (`_workspace/loop_state.md`)
- `cycles_this_session=0` (reset by this handoff), `cycles_total=19`, `cycle_budget=3`, `apply_mode=1`.

## Verify-on-resume baseline
```bash
git -C $META_ROOT/n8n branch --show-current          # harness/epic-d (or develop if merged)
git -C $META_ROOT/n8n log --oneline -5               # 90d8962 / be3889ae / 524ab23 (harness upgrade)
git -C $META_ROOT/n8n status --short                 # clean after handoff commit
node $META_ROOT/n8n/scripts/validate-harness-workflows.mjs   # 4/4 valid, exit 0
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5678/healthz   # 200 if n8n up
docker info >/dev/null 2>&1 && echo docker-OK || echo docker-DENIED      # docker available
docker exec n8n n8n list:workflow                                        # 4 harness wf render + 2 smoke
```
Expected: validator **4/4 exit 0** · healthz **200** · docker **OK** · workflows render (D-1 done).
If all match → confirm Epic D complete and stand down.

## Runtime watch
- n8n is **UP on :5678 in docker** (`n8nio/n8n:local`, container `n8n`, mounts `~/.n8n`); managed via
  `scripts/n8n-up.sh` / `scripts/n8n-down.sh`.
- **Docker:** available to the agent (`docker-OK`); the agent performs the D-1 bring-up directly —
  the design replaces human-in-the-loop with the agent.

## Handoff architecture reference
See `_workspace/handoff/README.md` for full harness architecture (4 pillars, DataTable ledger, bun swap notes).
