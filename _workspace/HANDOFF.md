# n8n-loop HANDOFF — 2026-06-07T12:00:00Z

**Status: Harness upgrade COMPLETE + being merged to `develop` (PR `harness/epic-d` → `develop`). Only D-1 (docker, human) remains autonomous-blocked.**

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
2. **Stand down** — do NOT push, deploy, or activate anything.
3. Only resume real work if EITHER: the user provides a **docker-enabled shell** (to finish D-1),
   OR the user adds **new backlog items** to `_workspace/backlog.md`.

## Repo, branch & policy  ⚠️ READ THIS
- Path: `~/Desktop/meta/n8n`. Remote `FlexNetOS/n8n`. Memory: `n8n-branching-workflow`.
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
- **D-1** `- [!]` blocked — docker bring-up needs a docker-enabled shell (only remaining item; see below).
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
- **D-1 only (APPLY, needs docker / human).** Bring up dockerized n8n on :5678 mounting `~/.n8n`:
  ```
  pnpm build:docker      # once, if n8nio/n8n:local not built
  scripts/n8n-up.sh      # bring up
  curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5678/healthz   # expect 200
  # confirm all 4 workflows render (~/.n8n already holds them via D-0 persistence)
  scripts/n8n-down.sh    # to stop
  ```
  Blocked because `docker info` → permission denied on `/var/run/docker.sock` for the in-IDE agent
  (not in the docker group). Unblock: run in the **user's docker-enabled shell** or the
  `ralph-n8n.sh` runner (`claude -p` in that shell).
- **Optional future (NOT scheduled):** bridge activation. Security decision is already documented as
  **"keep inactive"** (D-4). Any activation is APPLY + requires explicit user sign-off and the 5-item
  precondition checklist in `_workspace/D-4-bridge-activation-policy.md`.

## Ledger (`_workspace/loop_state.md`)
- `cycles_this_session=0` (reset by this handoff), `cycles_total=19`, `cycle_budget=3`, `apply_mode=1`.

## Verify-on-resume baseline
```bash
git -C ~/Desktop/meta/n8n branch --show-current          # harness/epic-d (or develop if merged)
git -C ~/Desktop/meta/n8n log --oneline -5               # 90d8962 / be3889ae / 524ab23 (harness upgrade)
git -C ~/Desktop/meta/n8n status --short                 # clean after handoff commit
node ~/Desktop/meta/n8n/scripts/validate-harness-workflows.mjs   # 4/4 valid, exit 0
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5678/healthz   # 200 if n8n up
docker info >/dev/null 2>&1 && echo docker-OK || echo docker-DENIED      # decides D-1
```
Expected: validator **4/4 exit 0** · healthz **200** · docker **DENIED** (D-1 stays blocked).
If all match → confirm harness upgrade green + merged to develop and stand down.

## Runtime watch
- n8n is **UP on :5678** (source profile: `node ./n8n`, env
  `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,path,fs`).
- **Docker caveat:** the in-IDE agent has NO docker access (docker.sock denied). Only the user's
  shell / the `ralph-n8n.sh` runner can perform the D-1 bring-up.

## Handoff architecture reference
See `_workspace/handoff/README.md` for full harness architecture (4 pillars, DataTable ledger, bun swap notes).
