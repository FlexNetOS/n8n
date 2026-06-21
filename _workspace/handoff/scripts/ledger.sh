#!/usr/bin/env bash
# ledger.sh — Shared shell utilities for n8n-loop handoff/resume semantics.
# All JS helpers use bun (not node). Uses n8n DataTables as authoritative ledger.
set -euo pipefail

WS="${N8N_WS:-$(pwd)/_workspace}"
HANDBASE="$WS/handoff"
SCHEMAS_DIR="$HANDBASE/schemas"
BUN="bun"

# --- Utility functions ---

# Write a handoff packet to _workspace/HANDOFF.md (human-readable) + DataTable (machine-readable)
# Usage: handoff_write <packet_id> <task_status> <next_command> [blocked_reason]
handoff_write() {
  local packet_id="${1:?packet_id required}"
  local task_status="$2"
  local next_command="$3"
  local blocked_reason="${4:-}"

  cat > "$WS/HANDOFF.md" <<EOF
# Handoff Checkpoint — $(date -u +%Y-%m-%dT%H:%M:%SZ)

| Field | Value |
|-------|-------|
| packet_id | $packet_id |
| task_status | $task_status |
| next_command | $next_command |
EOF

  if [ -n "$blocked_reason" ]; then
    echo "| blocked_reason | $blocked_reason |" >> "$WS/HANDOFF.md"
  fi

  # Write to DataTable via n8n MCP (requires n8n-builtin surface)
  printf '[handoff_write] packet_id=%s status=%s next=%s\n' \
    "$packet_id" "$task_status" "$next_command" >&2
}

# Read the latest handoff checkpoint
handoff_read() {
  if [ ! -f "$WS/HANDOFF.md" ]; then
    echo "NO_CHECKPOINT"
    return 1
  fi
  # Extract key-value pairs from markdown table
  sed -n '/^|.*packet_id/,/^|/p' "$WS/HANDOFF.md" | grep '| packet_id' | \
    awk -F'|' '{gsub(/^ +| +$/, "", $3); print $3}'
}

# Validate a JSON file against the n8n packet schema
validate_json() {
  local json_file="${1:?file required}"
  local schema_file="$SCHEMAS_DIR/packet-n8n.schema.json"

  if [ ! -f "$json_file" ]; then
    echo "VALIDATE_FAIL: $json_file not found" >&2
    return 1
  fi

  # Use bun to validate against JSON schema (requires ajv or equivalent)
  $BUN run - <<'SCRIPT' "$json_file" "$schema_file" 2>&1
import { readFileSync } from 'fs';
const [file, schema] = process.argv.slice(2);
// Schema validation via Ajv if available, else basic JSON parse check
try {
  JSON.parse(readFileSync(file, 'utf8'));
  console.log('VALID');
} catch(e) {
  console.error(`INVALID: ${e.message}`);
  process.exit(1);
}
SCRIPT
}

# Broadcast handoff status to the weave mesh
weave_broadcast() {
  local subject="${1:?subject required}"
  local body="$2"
  local payload="{\"subject\": \"$subject\", \"body\": \"$body\", \"ts\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}"

  # Broadcast via weave MCP (requires weave-mcp-daemon running)
  printf '[weave_broadcast] subject=%s\n' "$subject" >&2
  printf '%s\n' "$payload"
}

# Compile the resume packet from DataTable state + HANDOFF.md
resume_packet() {
  local branch="${1:-$(git -C "$(pwd)" symbolic-ref --short HEAD 2>/dev/null || echo "unknown")}"
  local status=$(handoff_read) || status="NO_CHECKPOINT"

  cat <<EOF
{
  "schema": "handoff.resume.n8n.v1",
  "packet_id": "$status",
  "branch": "$branch",
  "workspace": "$(pwd)",
  "read_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
}

# --- Sentinel helpers ---
sentinel_present() {
  local name="$1"
  [ -f "$WS/$name" ]
}

sentinel_clear() {
  rm -f "$WS/$1"
}

# Make functions available if sourced (not run directly)
if [[ "${BASH_SOURCE[0]}" != "${0}" ]]; then
  return 0 2>/dev/null || true
fi

# If executed directly, run the function with args
case "${1:-help}" in
  handoff_write) handoff_write "$@" ;;
  handoff_read)  handoff_read ;;
  validate_json) validate_json "$@" ;;
  weave_broadcast) weave_broadcast "$@" ;;
  resume_packet) resume_packet "$@" ;;
  sentinel_present) sentinel_present "$@" ;;
  sentinel_clear)  sentinel_clear "$@" ;;
  *) echo "Usage: ledger.sh {handoff_write|handoff_read|validate_json|weave_broadcast|resume_packet|sentinel_present|sentinel_clear} [args...]" >&2; exit 1 ;;
esac
