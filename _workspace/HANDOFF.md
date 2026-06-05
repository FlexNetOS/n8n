# n8n-loop HANDOFF — 2026-06-05T19:40:56Z (post-APPLY, Epic D open)

Cold-start resume package. A successor that has read **only** this file + the committed
`_workspace/backlog.md` can continue with zero prior context.

## Resume command
```
/n8n-loop resume from _workspace/HANDOFF.md (branch develop) — read the committed handoff, run the
Verify-on-resume baseline, then continue at the backlog's next item (Epic D). SAFE unless N8N_APPLY=1.
```

## Repo, branch & policy  ⚠️ READ THIS
- Path: `~/Desktop/meta/n8n`. Remote `FlexNetOS/n8n`.
- **BRANCHING (hard rule, see memory `n8n-branching-workflow`):** `master` = production, **NO direct
  pushes** (the auto-mode classifier denies `git push` to master — that's DESIRED; do NOT add an
  allow rule). All dev work = a **feature branch off `develop`** → `gh pr create --base develop` →
  **auto-merge on green**. `develop` (= `origin/develop`) is the integration line.
- A feature branch **`harness/apply-deploy-persist`** carries this session's work (Epic D-0 + scripts
  + ledger); it has an open PR `--base develop` set to auto-merge. If that PR already merged, branch
  off the new `origin/develop`; if not, you may add to it.

## What this (APPLY) session did — all live + committed
- **Epics A/B/C were already complete.** The user authorized `N8N_APPLY=1`; this session deployed the
  outward items to the LOCAL n8n (http://localhost:5678) via the **n8n-builtin** MCP surface (n8n-mcp
  mgmt is SSRF-blocked on localhost):
  - **C-3** ✅ 3 viz workflows live (inactive): `ghqgmnJnB8zMMmAN`, `baU04FGqVHA0pntk`, `7z11ihYBJ7soxaik`.
  - **B-3** ✅ chat bridge `ggvV5wItgjsRnwFk` live + smoked: full round-trip green (claude answered
    "Paris is the capital of France."); guard still blocks attacks (denylisted → Refuse, claude never
    invoked). Runtime needs `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,path,fs`; the bridge reads
    env via n8n `$env` (no `process` global in the Code sandbox) and injects ONLY
    `~/.claude/.credentials.json` into its sandbox HOME (user-approved auth trade-off). Left INACTIVE.
  - **D-0** ✅ persisted all 4 workflows into `~/.n8n` (`n8n import:workflow`), so a dockerized n8n that
    mounts `~/.n8n` boots with them. Reproducible: `scripts/n8n-import-workflows.sh`. Verify with
    `( cd packages/cli/bin && ./n8n list:workflow )` → expect ≥6 incl. the 4 ids above.

## Next items — Epic D (productionization)
- **D-1 (APPLY, needs docker)** — bring up dockerized n8n on :5678 mounting `~/.n8n`:
  `pnpm build:docker` (if `n8nio/n8n:local` absent) → `scripts/n8n-up.sh`; verify `/healthz` 200 + the
  4 workflows render. **The in-IDE agent CANNOT do this** (docker.sock permission denied). The
  `ralph-n8n.sh` runner (a `claude -p` in the user's docker-enabled shell) CAN. If your session lacks
  docker, mark D-1 `- [!] blocked: needs docker-enabled shell` and continue.
- **D-2** triage Dependabot **PR #1** (`uv` bump) — merge if green / close with reason.
- **D-3** add CI to `validate_workflow` the committed `_workspace/{wf,viz}/*.json` (SAFE).
- **D-4** bridge-activation policy decision (keep inactive vs enable behind auth) — document, don't auto-enable.

## Ledger (`_workspace/loop_state.md`)
- `cycles_this_session=4`, `cycles_total=15`, `cycle_budget=3`, `apply_mode=1`.
- **RESUME-reset:** set `cycles_this_session=0`, keep `cycles_total=15`. (Budget is per-session; this
  session exceeded it during the APPLY push at the user's direction — the successor resets.)

## Verify-on-resume baseline
```bash
git -C ~/Desktop/meta/n8n branch --show-current           # develop (or the feature branch)
git -C ~/Desktop/meta/n8n status --short                  # expect clean (ignore .claude/scheduled_tasks.*)
git -C ~/Desktop/meta/n8n log --oneline -3
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5678/healthz   # 200 if n8n up
( cd ~/Desktop/meta/n8n/packages/cli/bin && ./n8n list:workflow )        # the 4 harness workflows persisted in ~/.n8n
```
Then re-read `_workspace/backlog.md` (A/B/C + D-0 are `- [x]`; D-1..D-4 are the open `- [ ]`) and
`_workspace/loop_state.md`. Apply the RESUME-reset, then continue at D-1.

## Runtime watch
- n8n was UP on :5678 (source `node ./n8n`, started with `NODE_FUNCTION_ALLOW_BUILTIN`,
  log `_workspace/01g_apply_n8n.log`). It may have been replaced by docker (D-1) by the time you read
  this. `scripts/n8n-up.sh` kills the source instance before binding docker — never run both on the
  SQLite DB at once.
- Docker access: the in-IDE agent has none (`/var/run/docker.sock` permission denied); the user's
  shell / the ralph runner does.
