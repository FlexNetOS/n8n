# n8n-loop — quickref

Autonomous, resumable harness loop for the n8n repo (the envctl "Ralph" pattern). Works a durable
backlog one item per cycle, commits each cycle, hands off to a fresh session at a cycle budget, and
can self-restart unattended. Full behaviour: `SKILL.md`. Pointer + change history: repo `CLAUDE.md`.

## Launch

```bash
# In-session (Claude drives it, self-paced):
/n8n-loop                      # start at the backlog's next item, budget=3
/n8n-loop budget=1             # one cycle then hand off
/n8n-loop resume from _workspace/HANDOFF.md   # resume after a handoff / in a new session

# Unattended (fresh process per cycle — the "/new" effect), from the repo root:
bash .claude/plugins/n8n/skills/n8n-loop/scripts/ralph-n8n.sh          # SAFE (default)
N8N_APPLY=1 bash .claude/plugins/n8n/skills/n8n-loop/scripts/ralph-n8n.sh   # APPLY: may push/PR/deploy
touch _workspace/STOP          # kill switch — halts the runner at the next check
```

Runner knobs (env): `RALPH_BUDGET` (cycles/process, 3) · `RALPH_MAX_ITERS` (restart backstop, 50) ·
`RALPH_MODEL` (opus) · `RALPH_SLEEP` (secs between iters, 5) · `RALPH_WORKTREE` (repo path).

## SAFE vs APPLY

**SAFE by default.** The loop does everything reversible — design, implement in the working tree,
scoped build/test/lint, dry-run validations — but **refuses** outward/irreversible steps: `git push`,
opening PRs (`create-pr`), and deploying to a shared n8n. `N8N_APPLY=1` (runner) / `apply_mode=1`
(`_workspace/loop_state.md`) opts in. A human wall (sudo / interactive auth / missing key / a product
decision) yields `_workspace/NEEDS-HUMAN`, never a forced action or a false green.

## Durable state (`_workspace/`)

- `backlog.md` — source of truth (epics + items: `- [ ]`/`- [x]`/`- [!] blocked`).
- `loop_state.md` — ledger (cycles, budget, apply_mode, status).
- `HANDOFF.md` — cold-start resume checkpoint (committed; the authoritative resume signal).
- Sentinels the runner reads: `DONE` (finished+verified) · `NEEDS-HUMAN` (reason) · `STOP` (kill).

These are git-tracked via a `.gitignore` carve-out; per-run `*.log` files are not.

## Verify per cycle

Scoped (never a full monorepo build per cycle): `pnpm -F <touched-package> build` · affected
`pnpm test` · lint · for runtime changes, the `run-n8n` smoke (`/healthz` 200 + smoke test) through
the n8n MCP server. Optionally `mutant-score` on a changed test file to confirm it asserts.
