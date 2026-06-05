# Loop state — n8n-loop
session_started: 2026-06-05T17:13:00Z   # APPLY session (user authorized N8N_APPLY=1) to finish B-3 + C-3 deploys; n8n already up
loop: n8n-loop
branch: master
worktree: /home/drdave/Desktop/meta/n8n
cycle_budget: 3            # completed cycles per session before handoff (override via /n8n-loop budget=N)
session_started: 2026-06-05T19:50:42Z   # RESUMED (Epic D) on branch harness/epic-d; SAFE (no N8N_APPLY)
cycles_this_session: 3     # reset on RESUME; cy1=D-1(blocked), cy2=D-2(triaged), cy3=D-3(CI authored)
cycles_total: 18           # carried across sessions
apply_mode: 0              # SAFE — this resume has no N8N_APPLY (outward push/PR/deploy refused; author locally)
last_item: D-3 (workflow-validate CI authored — scripts/validate-harness-workflows.mjs + GH Actions wf)
status: budget reached (3/3) → HAND OFF. Done: D-1 blocked, D-2 triaged, D-3 CI. Remaining: D-4 (bridge activation) + APPLY actions (D-1 docker, D-2 merge, push these SAFE commits via PR)
branch_note: dev work on develop/feature branches; PRs --base develop, auto-merge on green; NEVER push master (see [[n8n-branching-workflow]])
last_update: 2026-06-05T06:37:55Z
