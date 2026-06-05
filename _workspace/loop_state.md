# Loop state — n8n-loop
session_started: 2026-06-05T07:03:30Z   # supplied at write time (agents/scripts can't read the clock at runtime); RESUMED from HANDOFF cf9578e7bc
loop: n8n-loop
branch: master
worktree: /home/drdave/Desktop/meta/n8n
cycle_budget: 3            # completed cycles per session before handoff (override via /n8n-loop budget=N)
cycles_this_session: 3     # reset to 0 on RESUME; this session: cy1=A-4, cy2=B-1, cy3=B-2
cycles_total: 7            # carried across sessions
apply_mode: 0              # 0=SAFE (no push/PR/shared-deploy); 1=APPLY (set via N8N_APPLY=1)
last_item: B-2 (bridge workflow JSON authored + validated → _workspace/wf/claude-n8n-chat-bridge.json — PASS)
status: budget reached (3/3) → HAND OFF; next item B-3 (APPLY) deploy bridge — needs N8N_APPLY=1 + env prereq
last_update: 2026-06-05T06:37:55Z
