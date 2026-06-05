# Loop state — n8n-loop
session_started: 2026-06-05T17:13:00Z   # APPLY session (user authorized N8N_APPLY=1) to finish B-3 + C-3 deploys; n8n already up
loop: n8n-loop
branch: master
worktree: /home/drdave/Desktop/meta/n8n
cycle_budget: 3            # completed cycles per session before handoff (override via /n8n-loop budget=N)
cycles_this_session: 1     # APPLY session; cy1=C-3 (viz deploy)
cycles_total: 12           # carried across sessions
apply_mode: 1              # 1=APPLY (user authorized N8N_APPLY=1) — deploy to LOCAL n8n permitted this session
last_item: C-3 (3 viz workflows deployed to local n8n via n8n-builtin — DONE, inactive drafts)
status: APPLY mode — C-3 done; B-3 next (bridge deployed ggvV5wItgjsRnwFk; smoke needs n8n restart w/ NODE_FUNCTION_ALLOW_BUILTIN)
last_update: 2026-06-05T06:37:55Z
