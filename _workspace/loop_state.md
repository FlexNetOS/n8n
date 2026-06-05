# Loop state — n8n-loop
session_started: 2026-06-05T07:20:40Z   # supplied at write time (agents/scripts can't read the clock at runtime); RESUMED from HANDOFF 06baa94b39
loop: n8n-loop
branch: master
worktree: /home/drdave/Desktop/meta/n8n
cycle_budget: 3            # completed cycles per session before handoff (override via /n8n-loop budget=N)
cycles_this_session: 3     # reset to 0 on RESUME; this session: cy1=B-3(blocked), cy2=C-1, cy3=C-2
cycles_total: 10           # carried across sessions
apply_mode: 0              # 0=SAFE (no push/PR/shared-deploy); 1=APPLY (set via N8N_APPLY=1)
last_item: C-2 (3 master viz workflows generated + validated → _workspace/viz/0{1,2,3}-*.json — PASS)
status: budget reached (3/3) → HAND OFF; only C-3 (APPLY) remains — will block in SAFE → DONE-with-blocked
last_update: 2026-06-05T06:37:55Z
