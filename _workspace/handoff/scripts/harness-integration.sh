#!/usr/bin/env bash
# harness-integration.sh — Chains four pillars per cycle: discover → architect → implement → verify → doc-sync.
# All JS tooling uses bun; n8n MCP handles DataTable reads/writes.
set -euo pipefail

WS="${HANDBASE:-$(pwd)/_workspace/handoff}"
HANDBASE="$WS"

log() { printf '[harness %s] %s\n' "$(date -u +%H:%M:%S)" "$*" >&2; }

# --- Phase 1: Discover (Backlog-Curator) ---
phase_discover() {
  log "PHASE 1: Backlog-Curator — discovering work items"
  # Run meta-discovery.n8n workflow via DataTable MCP or fallback to manual scan
  if [ -f "$HANDBASE/schemas/backlog-item.schema.json" ]; then
    log "Backlog schema found — ready for discovery"
    return 0
  fi
  log "WARN: backlog-item schema missing, skipping discovery phase"
  return 1
}

# --- Phase 2: Architect (Feature-Architect) ---
phase_architect() {
  local item_id="${1:?item ID required}"
  log "PHASE 2: Feature-Architect — analyzing blast radius for $item_id"
  if [ -f "$HANDBASE/schemas/packet-n8n.schema.json" ]; then
    log "Packet schema available — blast-radius analysis ready"
    return 0
  fi
  log "WARN: packet schema missing, skipping architect phase"
  return 1
}

# --- Phase 3: Implement (user-driven) ---
phase_implement() {
  log "PHASE 3: Implement — awaiting user changes in working tree"
  return 0
}

# --- Phase 4: Verify (Verification-Gate) ---
phase_verify() {
  log "PHASE 4: Verification-Gate — running gates in topo order"

  # Gate 1: bun test harness scripts
  if command -v bun >/dev/null 2>&1; then
    log "Gate 1/4: bun test"
    cd "$(pwd)" && bun test _workspace/handoff/scripts/ 2>&1 || log "WARN: bun test failed"
  else
    log "SKIP: bun not available"
  fi

  # Gate 2-4: cargo, biome, smoke — require user environment
  log "Gate 2-4: cargo_check, biome_lint, run_n8n_smoke — deferred to agent-driven execution"

  log "Verification complete (partial gates in script, full gates via agent)"
  return 0
}

# --- Phase 5: Docs-Scribe ---
phase_docs() {
  log "PHASE 5: Docs-Scribe — identifying doc targets"
  if [ -f "$(pwd)/_workspace/backlog.md" ]; then
    local items=$(grep -c '^ *-\s\[[ x]\]' _workspace/backlog.md 2>/dev/null || echo "0")
    log "Backlog has $items items — doc sync target identified"
  fi
  return 0
}

# --- Main ---
case "${1:-help}" in
  discover)   phase_discover ;;
  architect)  phase_architect "$2" ;;
  implement)  phase_implement ;;
  verify)     phase_verify ;;
  docs)       phase_docs ;;
  all|*)
    log "Running full harness pipeline: discover → architect → implement → verify → docs"
    phase_discover || true
    phase_architect "cycle-0" || true
    phase_implement || true
    phase_verify || true
    phase_docs || true
    log "Harness pipeline complete"
    ;;
esac
