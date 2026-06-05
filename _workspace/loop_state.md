# Loop state — n8n-loop
session_started: 2026-06-05T17:13:00Z   # APPLY session (user authorized N8N_APPLY=1) to finish B-3 + C-3 deploys; n8n already up
loop: n8n-loop
branch: master
worktree: /home/drdave/Desktop/meta/n8n
cycle_budget: 3            # completed cycles per session before handoff (override via /n8n-loop budget=N)
cycles_this_session: 2     # APPLY session; cy1=C-3 (viz deploy), cy2=B-3 (deploy+guard-smoke; claude-exec blocked)
cycles_total: 13           # carried across sessions
apply_mode: 1              # 1=APPLY (user authorized N8N_APPLY=1) — deploy to LOCAL n8n permitted this session
last_item: B-3 (bridge deployed ggvV5wItgjsRnwFk + guard-rejection smoke PASSED live; claude-exec round-trip blocked on auth decision)
status: APPLY — C-3 done; B-3 deploy+guard verified, full round-trip blocked on AUTH DECISION (api-key vs creds-passthrough) → asking user
last_update: 2026-06-05T06:37:55Z
