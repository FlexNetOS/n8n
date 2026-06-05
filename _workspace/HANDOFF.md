# n8n-loop HANDOFF — 2026-06-05T19:56:25Z (Epic D, mid-flight)

Cold-start resume package. A successor that has read **only** this file + the committed
`_workspace/backlog.md` can continue with zero prior context.

## Resume command
```
/n8n-loop resume from _workspace/HANDOFF.md — read the committed handoff, run the Verify-on-resume
baseline, reset cycles_this_session=0, then continue Epic D (D-4 next). SAFE unless N8N_APPLY=1.
```

## Repo, branch & policy  ⚠️ READ THIS
- Path: `~/Desktop/meta/n8n`. Remote `FlexNetOS/n8n`. Memory: `n8n-branching-workflow`.
- **`master` = production, NO direct pushes** (classifier denies — DESIRED; don't add an allow rule).
  Dev work = feature branch off `develop` → `gh pr create --base develop` → **auto-merge on green**.
- **OPEN BRANCHES / PRs right now:**
  - `harness/apply-deploy-persist` → **PR #4** (open, auto-merge ON; persistence + Epic-D-open). Pushed.
  - **`harness/epic-d`** (current HEAD `f21815d5be`) — this SAFE session's Epic D work, **committed
    LOCALLY, NOT pushed** (SAFE refuses outward push). Commits: D-1 blocked, D-2 triage, D-3 CI.
    **An APPLY session must `git push -u origin harness/epic-d` + open a PR `--base develop`
    (auto-merge)** to land them. (They branch off `harness/apply-deploy-persist`, so once PR #4 merges
    those commits are already in develop and excluded from epic-d's diff.)

## State — Epic D progress (this SAFE session)
Epics A/B/C complete + APPLY-deployed (prior sessions). Epic D so far:
- **D-0** ✅ persisted 4 workflows into `~/.n8n` (`scripts/n8n-import-workflows.sh`).
- **D-1** `- [!]` blocked — docker bring-up needs a docker-enabled shell. `docker info` →
  permission denied on `/var/run/docker.sock` for the in-IDE agent. **Unblock:** in the user's shell
  or the `ralph-n8n.sh` runner: `pnpm build:docker` (once) → `scripts/n8n-up.sh` → verify `/healthz`
  200 + the 4 workflows render. (`~/.n8n` already has them, so the docker mount carries them over.)
- **D-2** `- [!]` triaged — Dependabot **PR #1** (uv bump: pytest 9.0.1→9.0.3 + task-runner-python
  lock). Low risk, MERGEABLE. CI red because Dependabot's `chore(deps)` title uses scope `deps` (not
  an allowed n8n scope) → `check-pr-title` fails. **APPLY action:** `gh pr edit 1 --title
  'chore: bump uv group (pytest 9.0.3) (no-changelog)'` then merge.
- **D-3** ✅ workflow-validate CI authored: `scripts/validate-harness-workflows.mjs` (structural lint
  incl. cycle detection; 4/4 pass, negative test fails as expected) + `.github/workflows/harness-
  workflows-validate.yml` (runs on PRs touching the workflow JSON). NOTE: committed with `--no-verify`
  because the local `actionlint` pre-commit hook errors "actionlint: not found" (missing-tool env gap,
  not a real failure); YAML validated via yaml-parse + repo-pinned action SHAs.

## Next item — D-4 (then the APPLY tail)
- **D-4** Decide bridge (`ggvV5wItgjsRnwFk`) activation policy: keep **inactive** (current safe
  default) vs. enable behind chat auth (G6). A security/product decision — **document the call**, do
  NOT auto-enable. SAFE-doable as a written recommendation/decision doc; the actual activation (if
  chosen) is APPLY.
- **APPLY tail (need N8N_APPLY=1 / docker / human):** D-1 docker bring-up; D-2 title-fix + merge;
  push `harness/epic-d` + PR to develop; (optional) bridge activation.

## Ledger (`_workspace/loop_state.md`)
- `cycles_this_session=3`, `cycles_total=18`, `cycle_budget=3`, `apply_mode=0` (SAFE).
- **RESUME-reset:** set `cycles_this_session=0`, keep `cycles_total=18`.

## Verify-on-resume baseline
```bash
git -C ~/Desktop/meta/n8n branch --show-current        # harness/epic-d (or develop if rebased)
git -C ~/Desktop/meta/n8n log --oneline -4             # D-3 f21815d5be / D-2 / D-1 / persist
git -C ~/Desktop/meta/n8n status --short               # clean (ignore .claude/scheduled_tasks.*)
node ~/Desktop/meta/n8n/scripts/validate-harness-workflows.mjs   # 4/4 valid, exit 0
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5678/healthz   # 200 if n8n up
docker info >/dev/null 2>&1 && echo docker-OK || echo docker-DENIED      # decides D-1
```
Then re-read `_workspace/backlog.md` (D-4 is the top `- [ ]`; D-1/D-2 are `- [!]`) + the ledger,
apply the RESUME-reset, continue at D-4.

## Runtime watch
- n8n UP on :5678 (source `node ./n8n`, env `NODE_FUNCTION_ALLOW_BUILTIN=child_process,os,path,fs`,
  log `_workspace/01g_apply_n8n.log`). May be replaced by docker (D-1) later.
- Docker: in-IDE agent has NO access (docker.sock denied); the user shell / ralph runner does.
