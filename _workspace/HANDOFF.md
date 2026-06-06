# n8n-loop HANDOFF — 2026-06-06T00:11:13Z

**Status: Epic D DONE+MERGED — only D-1 (docker, human) remains. No autonomous work left.**

Cold-start resume package. A successor that has read **only** this file + the committed
`_workspace/backlog.md` can continue with zero prior context.

## Resume command
```
/n8n-loop resume from _workspace/HANDOFF.md — read the committed handoff, run the Verify-on-resume
baseline, confirm Epic D is DONE+MERGED, then STAND DOWN. There is no autonomous work left.
```
**There is no remaining autonomous work.** The successor should:
1. Run the Verify-on-resume baseline (below) and confirm DONE+MERGED.
2. **Stand down** — do NOT push, deploy, or activate anything.
3. Only resume real work if EITHER: the user provides a **docker-enabled shell** (to finish D-1),
   OR the user adds **new backlog items** to `_workspace/backlog.md`.

## Repo, branch & policy  ⚠️ READ THIS
- Path: `~/Desktop/meta/n8n`. Remote `FlexNetOS/n8n`. Memory: `n8n-branching-workflow`.
- **`master` = production, NO direct pushes** (classifier denies — DESIRED; don't add an allow rule).
  Dev work = feature branch off `develop` → `gh pr create --base develop` → **auto-merge on green**.
- Current HEAD branch: **`harness/epic-d`** (`c3e8162598`).
- **Epic D is already MERGED to `develop` via PR #5** (~2026-06-05T21:05Z). The epic-d commits are a
  subset of develop. No open outward work — nothing to push.

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
- **This session (2026-06-06):** spec-driven verification pass on
  `.claude/specs/claude-n8n-chat-bridge.md` — re-validated the authored bridge JSON (valid, 0 errors,
  9 acknowledged warnings) and committed a doc reconciliation (**`c3e8162598`**) bringing §2 G4 in
  line with the implemented credential-copy. **No code/deploy change.**

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
- `cycles_this_session=1`, `cycles_total=19`, `cycle_budget=3`, `apply_mode=1` (APPLY was authorized
  this session for push+PR; outward steps verified already-complete — nothing left to apply).
- **RESUME-reset:** set `cycles_this_session=0`, keep `cycles_total=19`.

## Verify-on-resume baseline
```bash
git -C ~/Desktop/meta/n8n branch --show-current          # harness/epic-d (or develop if rebased)
git -C ~/Desktop/meta/n8n log --oneline -5               # c3e8162598 docs-reconcile / f10ae895ff D-4 / handoff / D-3 / D-2
git -C ~/Desktop/meta/n8n status --short                 # clean after the handoff commit (ignore .claude/scheduled_tasks.*)
node ~/Desktop/meta/n8n/scripts/validate-harness-workflows.mjs   # 4/4 valid, exit 0
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5678/healthz   # 200 if n8n up
docker info >/dev/null 2>&1 && echo docker-OK || echo docker-DENIED      # decides D-1
```
Expected this session: validator **4/4 exit 0** · healthz **200** · docker **DENIED** (so D-1 stays
blocked for the in-IDE agent). If all match → confirm DONE+MERGED and stand down.

## Runtime watch
- n8n is **UP on :5678** (source profile: `node ./n8n`, env
  `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,path,fs`, log `_workspace/01g_apply_n8n.log`).
  May be replaced by docker once D-1 runs.
- **Docker caveat:** the in-IDE agent has NO docker access (docker.sock denied). Only the user's
  shell / the `ralph-n8n.sh` runner can perform the D-1 bring-up.
```
