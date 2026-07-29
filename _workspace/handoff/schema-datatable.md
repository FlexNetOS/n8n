# DataTable Schema for n8n-loop Handoff Ledger

The durable handoff/resume ledger is stored in two n8n DataTables that serve as the machine-readable authoritative state. The human-readable `_workspace/HANDOFF.md` remains as checkpoint for zero-loss resume.

## Table: `handoff_packets`

The active handoff packet — one row per cycle budget completion (or NEEDS-HUMAN wall).

| Column | Type | Description |
|--------|------|-------------|
| `packet_id` | string | UUID-like: `pkt-<16 hex chars>` |
| `schema` | string | Must match a schema in `_workspace/handoff/schemas/` (e.g. `handoff.packet.n8n.v1`) |
| `project_name` | string | e.g. `n8n-loop` |
| `active_objective` | string | One-line description of the current epic/item being worked on |
| `current_task_id` | string | e.g. `D-3`, `A-2`, blank if no active task |
| `task_status` | string | Discovered → Claimed → Implementing → Verifying → Done / Blocked |
| `branch` | string | Git branch the loop is running on |
| `changed_files` | string | JSON array of file paths changed this cycle |
| `drift_status` | string | `pass`, `soft_fail`, or `hard_fail` |
| `next_command` | string | The exact command/prompt for the next cycle |
| `n8n_workflows` | string | JSON array of workflow IDs deployed this cycle |
| `dataTable_id` | string | Reference DataTable ID used as ledger (the table name) |
| `execution_status` | string | `pending`, `deploying`, `deployed`, or `failed` |
| `node_types_used` | string | JSON array of n8n node types deployed/validated |
| `created_at` | date | UTC timestamp when this packet was written |
| `archived` | boolean | `false` while active, `true` after successor takes over |

## Table: `session_events`

Event log for all handoff/resume lifecycle events. Enables audit trail and replay.

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | string | UUID-like: `evt-<16 hex chars>` |
| `session_id` | string | Session identity (peer_id or weave session name) |
| `agent_id` | string | Agent that generated the event (e.g. `continuity-steward`, `ralph-n8n`) |
| `event_type` | string | `session_started`, `resumed`, `task_claimed`, `checkpoint_created`, `tests_run`, `drift_audited`, `handoff_created`, `lease_released`, `session_stopped`, `verify_complete` |
| `timestamp` | date | UTC timestamp of the event |
| `payload` | string | JSON object with event-specific data (variable per event_type) |
| `task_id` | string | Associated task ID, if applicable |

## Usage Pattern

1. **Handoff**: continuity-steward writes a row to `handoff_packets` → sets `archived=false` → broadcasts weave heartbeat
2. **Resume**: successor reads the latest unarchived `handoff_packets` row → validates against JSON schema → runs Verify-on-resume commands
3. **Successor scheduling**: Cron trigger fires → reads DataTable → spawns agent with checkpoint prompt
4. **Archival**: When successor resumes, old packet gets `archived=true`

## Relationship to Handoff Ledger Schemas

The DataTable tables are n8n's implementation of the `sessions-handoff` Rust-native ledger concept. The JSON schemas in `_workspace/handoff/schemas/` serve as validation contracts — any DataTable row must conform to its schema before being accepted as authoritative state.
