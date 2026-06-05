---
name: n8n:run-n8n
description: Orchestrates running a local n8n instance end-to-end — boot service containers + dev server, verify health, report status over the weave mesh, and (optionally) build/deploy workflows via n8n-mcp. ALWAYS use to run, start, boot, launch, stand up, restart, stop, or check a local n8n. Also handles follow-ups - "run it again", "restart n8n", "redo just the boot", "n8n is down bring it back", "now build a workflow on it", "update the running instance", "report n8n status to the mesh". Do NOT use for editing n8n's own source code (use the developer agent) or for unrelated tasks.
---

# Run n8n — Orchestrator

Stands up and operates a local **dev** n8n instance, coordinated through the **weave mesh** with all shell routed through **rtk**, and exposes workflow build/deploy through **n8n-mcp**. This is the entry point for "run n8n" — it drives three specialist agents and the four runtime skills.

**Execution mode: Hybrid — sub-agent orchestration with the weave mesh as the coordination bus.** `TeamCreate`/`SendMessage` teams aren't available in this harness; the realized "team" is independent agent sessions sharing state over weave (see `n8n:mesh-report`). Spawn agents with the `Agent` tool; long-lived watchers use `run_in_background: true`.

## Roster (3 agents + 4 skills)

| Agent | Role | Skills it reads |
|-------|------|-----------------|
| `runtime-operator` | boot/stop the stack, manage the dev process | `n8n:runtime`, `n8n:mesh-report` |
| `runtime-monitor` | health/readiness polling, status broadcast | `n8n:runtime`, `n8n:mesh-report` |
| `workflow-engineer` | build/validate/deploy workflows via n8n-mcp | `n8n:workflow-ops`, `n8n:mesh-report` |

Spawn each via the `Agent` tool with `model: "opus"` and the matching `subagent_type` (`n8n:runtime-operator`, `n8n:runtime-monitor`, `n8n:workflow-engineer`). If a plugin agent isn't resolvable in-session, fall back to `subagent_type: "general-purpose"` and inline that agent's `.md` role.

## Phase 0: Context check (initial / follow-up / partial)

Decide the run mode before doing anything:

- **`_workspace/` absent** → **Initial run**. Create `_workspace/`, run all phases.
- **`_workspace/` present + user asks for a partial change** (e.g. "redo just the boot", "rebuild the workflow") → **Partial re-run**. Re-invoke only the relevant agent; reuse prior artifacts.
- **`_workspace/` present + new/distinct request** → **New run**. Move existing `_workspace/` to `_workspace_prev/`, then start fresh.
- **Already running?** Before booting, check health (`rtk curl .../healthz/readiness`) or the latest mesh status. If `READY`, skip the boot and report current state — don't double-boot a live instance.

Intermediate artifacts live in `_workspace/` named `{phase}_{agent}_{artifact}` (e.g. `01_operator_boot.log`, `02_monitor_status.json`, `03_engineer_workflow.json`). Surface only final results to the user; keep `_workspace/` for audit.

## Phase 1: Boot — `runtime-operator`

1. Spawn `runtime-operator`: read `n8n:runtime`, verify prereqs, boot service containers (postgres/redis/mailpit/proxy), start `pnpm dev` **backgrounded** to `_workspace/01_operator_boot.log`, emit `BOOTING` to the mesh.
2. The operator records the dev process handle/port and writes a short `_workspace/01_operator_state.json` (url, pid/task, started-at).
3. Operator emits `READY` (with editor URL) once it confirms initial health, or `DEGRADED`/`DOWN` + log tail on failure.

## Phase 2: Verify — `runtime-monitor`

1. Spawn `runtime-monitor` (optionally `run_in_background: true` to keep watching while the user works): poll `/healthz` + `/healthz/readiness`, classify `ready` / `live-not-ready` / `down`, triage the boot log on trouble.
2. Monitor writes `_workspace/02_monitor_status.json` and broadcasts transitions over weave.
3. **Gate:** workflow work proceeds only after `READY`. If `DEGRADED`/`DOWN`, route back to `runtime-operator` (one retry) before giving up.

## Phase 3 (optional): Workflows — `workflow-engineer`

Only if the user asked to build/deploy a workflow. Requires `READY` + (for deploy) the API key.

1. Spawn `workflow-engineer`: read `n8n:workflow-ops`, ground nodes (`search_nodes`/`get_node`), author + `validate_workflow`.
2. If the API key isn't set, trigger the **API-key handoff** (`n8n:mesh-report`): prompt the user to create a key in *Settings → n8n API*, catalog via weave, set `N8N_API_KEY` in user-scope config. Until then, deliver a validated, deploy-ready JSON.
3. With the key: deploy (`n8n_create_workflow`/`n8n_update_partial_workflow`), verify (`n8n_get_workflow`/`n8n_test_workflow`/`n8n_executions`), write `_workspace/03_engineer_workflow.json`, emit a `DEPLOYED` mesh note.

## Data transfer

- **File-based** (`_workspace/`) — boot state, status snapshots, workflow JSON; the audit trail.
- **Mesh-based** (weave / repowire) — live status + API-key handoff between agents and peers (`n8n:mesh-report`).
- **Return-value** — each spawned agent returns a one-line verdict to this orchestrator (`READY` / `DEGRADED: …` / `DEPLOYED id=…`).

## Error handling

Retry a failed phase **once**; if it fails again, stop and report the omission with the cause (log tail + `n8n:runtime` troubleshooting row). Never loop a boot. Never discard conflicting signals — record them with their source in `_workspace/`. Treat the API key as a secret: directed weave message only, never broadcast, never committed.

## Final report

Summarize: run mode (initial/follow-up/partial), instance state + editor URL, whether the API key is wired, and any workflow deployed (id + execution outcome). Point to `_workspace/` for detail.

## Test Scenarios

**Executable smoke test (end-to-end):** `scripts/smoke-test.mjs` proves the full author → validate → deploy → execute → verify loop against a running instance via the **`n8n-builtin`** MCP server. Run it after `READY`:
```bash
node .claude/plugins/n8n/skills/run-n8n/scripts/smoke-test.mjs --cleanup
```
Exit 0 = pass. Needs n8n up + MCP access enabled + `N8N_MCP_SERVER_TOKEN` in `.claude/settings.local.json`. Omit `--cleanup` to leave the workflow in place. This is the harness's happy-path regression check — a permanent `Harness Smoke Test` workflow (`Manual Trigger → Set`) was first deployed this way (id `B8kko6gh1wBf7qcu`).

**Happy path — "start n8n":** Phase 0 finds no `_workspace/` → initial run. `runtime-operator` boots containers + dev server, emits `BOOTING`. `runtime-monitor` polls, both healthz 200 → `READY`, broadcasts to mesh. Orchestrator reports "n8n ready at http://localhost:5678" and the API-key handoff offer. No workflow phase (not requested).

**Error path — "n8n won't come up":** `runtime-operator` boots; `runtime-monitor` sees healthz 200 but readiness stuck at 503. Monitor triages `_workspace/01_operator_boot.log`, finds containers unhealthy → emits `DEGRADED: readiness 503, postgres container unhealthy`. Orchestrator routes back to `runtime-operator` once (`services:clean` + reboot). Still failing → stop, report `DOWN` with the log tail and the matching `n8n:runtime` troubleshooting row, do not loop.

**Follow-up — "now build a workflow that pings Slack on new rows":** Phase 0 finds `_workspace/` + live instance → skip boot, confirm `READY` via mesh/health. Run Phase 3 only: `workflow-engineer` grounds nodes, validates, and (key present) deploys + tests, returning the workflow id and execution result.
