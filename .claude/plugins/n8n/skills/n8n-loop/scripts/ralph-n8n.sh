#!/usr/bin/env bash
# ralph-n8n.sh — the external "Ralph" loop that self-restarts n8n-loop with a FRESH context every
# iteration (each `claude -p` process is a clean session = the `/new` effect), until the backlog is
# done. This is the real, executable form of "run /new then /n8n-loop and hand off to yourself":
# the agent cannot type /new, but a new process can.
#
# Each iteration spawns one fresh headless agent that runs one cycle-budget of work (design ->
# implement -> verify), commits per cycle, then writes EXACTLY ONE sentinel + exits:
#   _workspace/HANDOFF.md  -> more work remains; this script spawns the next fresh process
#   _workspace/DONE        -> backlog clear + all gates green (evidence inside); this script exits 0
#   _workspace/NEEDS-HUMAN -> hit a sudo/auth/missing-key/decision wall; this script halts for you
#   _workspace/STOP        -> kill switch (you `touch` it); this script halts
#
# SAFETY: default is SAFE — headless agents cannot answer permission prompts, so without an explicit
# opt-in they will NOT perform outward/irreversible actions (git push, opening PRs, deploying to a
# shared n8n). To run truly unattended with those allowed you must opt in with N8N_APPLY=1, which
# adds --dangerously-skip-permissions AND tells the loop apply_mode is on. Do that only when you
# accept that the loop may push / open PRs / deploy on its own. A bounded max-iterations backstop and
# an always-checked STOP kill switch apply in both modes.
set -euo pipefail

# --- config (env-overridable) ---
WORKTREE="${RALPH_WORKTREE:-$(pwd)}"            # repo/worktree to run in
BUDGET="${RALPH_BUDGET:-3}"                      # cycles per fresh process before it hands off
MAX_ITERS="${RALPH_MAX_ITERS:-50}"              # hard backstop on process restarts
SLEEP_BETWEEN="${RALPH_SLEEP:-5}"               # seconds between iterations
MODEL="${RALPH_MODEL:-opus}"
WS="$WORKTREE/_workspace"

log() { printf '[ralph-n8n %s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }
die() { log "FATAL: $*"; exit 1; }

command -v claude >/dev/null || die "claude CLI not on PATH"
# .git is a file in a worktree, a dir in a primary checkout — accept both.
[ -e "$WORKTREE/.git" ] || die "WORKTREE is not a git repo: $WORKTREE"
mkdir -p "$WS"

# Apply-mode opt-in. SAFE by default: no permission bypass, so outward steps are refused.
APPLY_ARGS=()
APPLY_NOTE="SAFE mode (default): git push / PRs / shared-deploy refused. Set N8N_APPLY=1 to allow."
if [ "${N8N_APPLY:-0}" = "1" ]; then
  APPLY_ARGS=(--dangerously-skip-permissions)
  APPLY_NOTE="N8N_APPLY=1 — UNATTENDED APPLY MODE: the loop MAY push / open PRs / deploy on its own."
fi
log "$APPLY_NOTE"

# The per-iteration prompt. Resume from the committed checkpoint; do one budget of work; then write
# exactly one sentinel and exit so this script decides whether to respawn.
read -r -d '' PROMPT <<EOF || true
/n8n-loop resume (external Ralph runner, fresh context). Repo/worktree: $WORKTREE. apply_mode=${N8N_APPLY:-0}.
1. If _workspace/HANDOFF.md exists, follow n8n:session-relay RESUME from it (the authoritative
   signal): read the committed checkpoint, run its Verify-on-resume baseline, reset the per-session
   cycle counter; else DISCOVER the backlog (open issues / specs / _workspace state) and seed
   _workspace/backlog.md.
2. Run up to $BUDGET cycles, one backlog item each: design (spec-driven-development) -> implement
   -> VERIFY across the boundary in a FRESH shell (scoped pnpm build + affected test + lint; run-n8n
   smoke via the n8n MCP server for runtime changes) -> commit per cycle. Outward/irreversible steps
   (push, PRs via create-pr, deploy to a shared n8n) are fail-closed: dry-run only unless apply_mode=1.
   Never weaken a guard to make a step pass.
3. Then write EXACTLY ONE sentinel under _workspace/ and stop (do NOT ScheduleWakeup):
   - backlog clear AND all gates green -> _workspace/DONE (with evidence: build/test/lint/smoke)
   - hit a sudo / interactive-auth / missing-key / product-decision wall -> _workspace/NEEDS-HUMAN
     (reason inside)
   - otherwise -> _workspace/HANDOFF.md (spawn n8n:continuity-steward) and exit.
Commit every cycle so the next fresh process resumes cold from committed state alone.
EOF

cd "$WORKTREE"
i=0
while :; do
  i=$((i + 1))
  if [ "$i" -gt "$MAX_ITERS" ]; then
    log "reached MAX_ITERS=$MAX_ITERS without DONE — halting (backstop). Inspect _workspace/."
    exit 3
  fi
  # Pre-flight sentinel checks (kill switch + terminal states win before spawning).
  [ -f "$WS/STOP" ]        && { log "STOP sentinel present — halting for human."; exit 2; }
  [ -f "$WS/DONE" ]        && { log "DONE — backlog complete."; exit 0; }
  [ -f "$WS/NEEDS-HUMAN" ] && { log "NEEDS-HUMAN: $(cat "$WS/NEEDS-HUMAN" 2>/dev/null) — halting."; exit 2; }

  log "iteration $i/$MAX_ITERS — spawning fresh agent (budget=$BUDGET, model=$MODEL)"
  # Fresh process => clean context (the /new effect). -p = headless. Don't abort the loop on a single
  # failed run; let the next iteration re-read durable state and continue.
  claude -p "$PROMPT" --model "$MODEL" --add-dir "$WORKTREE" "${APPLY_ARGS[@]}" \
    >>"$WS/ralph-run-$i.log" 2>&1 || log "iteration $i exited nonzero (continuing from durable state)"

  # Post-run terminal sentinels.
  [ -f "$WS/DONE" ]        && { log "DONE — backlog complete."; exit 0; }
  [ -f "$WS/NEEDS-HUMAN" ] && { log "NEEDS-HUMAN: $(cat "$WS/NEEDS-HUMAN" 2>/dev/null) — halting."; exit 2; }
  [ -f "$WS/STOP" ]        && { log "STOP sentinel present — halting for human."; exit 2; }

  sleep "$SLEEP_BETWEEN"
done
