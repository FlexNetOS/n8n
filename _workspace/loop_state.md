# Loop state — n8n-loop
session_started: 2026-06-05T06:37:55Z   # supplied at write time (agents/scripts can't read the clock at runtime)
loop: n8n-loop
branch: master
worktree: /home/drdave/Desktop/meta/n8n
cycle_budget: 3            # completed cycles per session before handoff (override via /n8n-loop budget=N)
cycles_this_session: 1     # reset to 0 on RESUME / new session; this session: cycle 1 = A-1
cycles_total: 2            # carried across sessions
apply_mode: 0              # 0=SAFE (no push/PR/shared-deploy); 1=APPLY (set via N8N_APPLY=1)
last_item: A-1 (meta repo inventory → _workspace/meta-inventory.md — PASS)
status: A-1 done+verified (51 repos inventoried); next item A-2 (code-intel index per repo)
last_update: 2026-06-05T06:37:55Z
