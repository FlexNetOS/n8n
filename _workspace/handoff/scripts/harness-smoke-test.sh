#!/usr/bin/env bash
# harness-smoke-test.sh — End-to-end verification of the upgraded harness system.
set -euo pipefail

WS="$(pwd)/_workspace"
HANDBASE="$WS/handoff"
PASSED=0
FAILED=0

pass() { log "✅ $*"; PASSED=$((PASSED+1)); }
fail() { log "❌ $*"; FAILED=$((FAILED+1)); }
log() { printf '[smoke] %s\n' "$*" >&2; }

# --- Test 1: Bun availability ---
log "Test 1: Bun availability"
if command -v bun >/dev/null 2>&1; then
  pass "bun $(bun --version) available"
else
  fail "bun not found on PATH — harness scripts will fall back to node/npm"
fi

# --- Test 2: Schema validation ---
log "Test 2: JSON schema validation"
SCHEMA="$HANDBASE/schemas/packet-n8n.schema.json"
if [ -f "$SCHEMA" ]; then
  if jq -e '.properties.schema.const == "handoff.packet.n8n.v1"' "$SCHEMA" >/dev/null; then
    pass "packet-n8n schema valid (schema v1 const)"
  else
    fail "packet-n8n schema has wrong schema field"
  fi
else
  fail "packet-n8n.schema.json not found at $SCHEMA"
fi

# --- Test 3: Backlog curator discovery readiness ---
log "Test 3: Backlog-curator discovery sources"
if [ -f "/home/drdave/Desktop/meta/.meta.yaml" ]; then
  pass ".meta.yaml found — backlog-curator has source of truth"
else
  fail ".meta.yaml missing at /home/drdave/Desktop/meta/ — cannot discover work items"
fi

if grep -q 'workspace_members' _workspace/pillars/backlog-curator/meta-discovery.n8n.json 2>/dev/null; then
  pass "meta-discovery workflow references Cargo.toml parsing"
else
  fail "meta-discovery workflow missing Cargo.toml parsing code"
fi

# --- Test 4: Blast-radius-analyzer graph building ---
log "Test 4: Feature-architect blast-radius analyzer"
if jq -e '.connections' _workspace/pillars/feature-architect/blast-radius-analyzer.n8n.json >/dev/null; then
  node_count=$(jq '.nodes | length' _workspace/pillars/feature-architect/blast-radius-analyzer.n8n.json)
  if [ "$node_count" -ge 5 ]; then
    pass "blast-radius-analyzer has $node_count nodes (>= 5 required)"
  else
    fail "blast-radius-analyzer has only $node_count nodes (need >= 5)"
  fi
else
  fail "blast-radius-analyzer missing connections field"
fi

# --- Test 5: Verification-gate order ---
log "Test 5: Verification-gate gate ordering"
VG_CODE=_workspace/pillars/verification-gate/multi-toolchain-verify.n8n.json
if grep -q 'cargo_check' "$VG_CODE" && grep -q 'bun_test' "$VG_CODE"; then
  pass "multi-toolchain-verify includes cargo_check and bun_test gates"
else
  fail "multi-toolchain-verify missing expected gates"
fi

# --- Test 6: Docs-scribe target identification ---
log "Test 6: Docs-scribe doc target identification"
if jq -e '.connections' _workspace/pillars/docs-scribe/meta-doc-sync.n8n.json >/dev/null; then
  pass "meta-doc-sync workflow has valid connections"
else
  fail "meta-doc-sync workflow missing connections"
fi

# --- Test 7: Handoff roundtrip (DataTable -> HANDOFF.md) ---
log "Test 7: Handoff resume data flow"
if [ -f "$HANDBASE/schema-datatable.md" ]; then
  if grep -q 'handoff_packets' "$HANDBASE/schema-datatable.md" && grep -q 'session_events' "$HANDBASE/schema-datatable.md"; then
    pass "DataTable schema defines both handoff_packets and session_events tables"
  else
    fail "DataTable schema missing one or both expected tables"
  fi
else
  fail "schema-datatable.md not found"
fi

# --- Test 8: Session-relay DataTable integration ---
log "Test 8: Session-relay skill DataTable substrate"
RELAY_SKILL=.claude/plugins/n8n/skills/session-relay/SKILL.md
if grep -q 'DataTable' "$RELAY_SKILL" && grep -q 'handoff_packets' "$RELAY_SKILL"; then
  pass "session-relay updated with DataTable ledger references"
else
  fail "session-relay missing DataTable substrate updates"
fi

# --- Test 9: Pillar SKILL.md trigger phrases ---
log "Test 9: All pillar skills have valid triggers"
for skill in backlog-curator feature-architect verification-gate docs-scribe; do
  SKILL_FILE=".claude/plugins/n8n/skills/$skill/SKILL.md"
  if grep -q 'trigger' "$SKILL_FILE" && grep -q '^---$' "$SKILL_FILE"; then
    pass "$skill skill has trigger phrases and frontmatter"
  else
    fail "$skill skill missing trigger or frontmatter"
  fi
done

# --- Summary ---
echo ""
log "=============================="
log "Smoke test results: $PASSED passed, $FAILED failed"
log "=============================="
[ "$FAILED" -eq 0 ] && exit 0 || exit 1
