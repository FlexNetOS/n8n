<!-- markdownlint-disable -->
# Meta workspace — automation surfaces (code map)

> Backlog item **A-3** (`n8n-loop`, Epic A). Extracted the *automation surfaces* of the meta
> workspace — entrypoints/CLIs, MCP servers, schedulers/cron, queues, webhooks, and the weave mesh —
> from real sources (Cargo `[[bin]]`, `package.json`, `.mcp.json`, source dirs). Generated 2026-06-05.
> Pairs with `meta-inventory.md` (A-1/A-2). Feeds the A-4 data-flow diagram.

## 1. Command-line entrypoints (CLIs)

### Rust binaries (the meta CLI stack)
| binary | crate | role |
|--------|-------|------|
| `meta` | meta_cli | **host CLI** — orchestrates all child repos (clone, `exec`, `worktree`, `git`); loads subprocess plugins |
| `meta-git` | meta_git_cli | git plugin — `meta git status/commit/push/snapshot` across repos |
| `meta-project` | meta_project_cli | project plugin — `meta project list -r`, project coordination |
| `meta-rust` | meta_rust_cli | rust plugin — cross-repo cargo orchestration |
| `meta-mcp` | meta_mcp | **MCP server** exposing `meta` to agents (see §2) |
| `loop` | loop_cli | command-execution front-end over `loop_lib` |
| `agent` | agent | the `agent guard` / agent tooling binary (PreToolUse denials, snapshots) |
| `weave` | weave | **mesh broker CLI + MCP server** (see §2, §6) |
| `lane` | lane | HTTPS/tunnel URL provider (used by run-n8n for the `lane` URL) |
| `grit` | grit | (untriaged tool) |
| `rtk` | rtk-tokenkill | token-optimizing CLI proxy (hooks rewrite `git`→`rtk git`, etc.) |

Plugin architecture: the plugin CLIs (`meta-git`, `meta-project`, `meta-rust`) are **subprocess
plugins** spoken to over `meta_plugin_protocol`; each inherits `RUST_LOG` from the parent `meta`
process. Library crates (no bin): `loop_lib`, `meta_core`, `meta_git_lib`, `meta_plugin_protocol`,
`meta_plugin_api`.

### JS/TS binaries & dev entrypoints
| repo | bin / entrypoint | automation scripts |
|------|------------------|--------------------|
| n8n | (no `bin`; CLI in `packages/cli`) | `pnpm dev` / `dev:be` / `dev:fe` / `dev:ai`, `pnpm start`, `pnpm worker` (queue worker) |
| oh-my-claudecode | `oh-my-claudecode`, `omc`, `omc-cli` | `dev`, `dev:full`, `build:team-server`, `start` |
| ECC | `ecc`, `ecc-control-pane`, `ecc-install` | `orchestrate:worker` |
| oh-my-pi | (no bin) | `robomp:serve` / `robomp:restart` / `robomp:web:dev`, `dev` |
| Archon | (no bin) | `dev:server`, `dev:web`, `dev:docs`, `start` |
| codex | (Rust+TS; bin in Cargo) | — |

## 2. MCP servers (the agent ↔ tool glue)
Discovered `.mcp.json` wiring + native MCP server crates/modules:

| MCP server | provided by | surface (tools) | wired in |
|------------|-------------|-----------------|----------|
| **meta** | `meta_mcp` (Rust) | `meta_build`, `meta_exec`, `meta_batch_execute`, `meta_git_*` (add/commit/push/pull/diff/branch/checkout/multi_commit), `meta_snapshot_*`, `meta_analyze_impact`, `meta_execution_order`, `meta_get_config`, `meta_get_file_tree`, `meta_query_repos`, `meta_run_tests`, `meta_workspace_state` | `claude-plugin/.mcp.json` (as `meta`) |
| **weave** | `weave` (Rust, `src/mcp.rs`) | `weave_send`, `weave_reply`, `weave_inbox`, `weave_thread`, `weave_peers`, `weave_sessions`, `weave_history`, `weave_receipts`, `weave_whoami`, `weave_doctor`, `weave_clear` | session mesh (this agent = `@n8n-claude-code`) |
| **n8n-mcp** | external (mcp_hub fork) | node docs + `n8n_*` management (create/update/validate/test/deploy workflows, executions, health) | `n8n/.mcp.json`, `.github_org/.mcp.json` |
| **n8n-builtin** | n8n itself (`packages/cli/src/modules/mcp`) | 28 live workflow tools (search_nodes, create_workflow_from_code, validate_workflow, execute_workflow, data tables, …); OAuth + API-key auth services | `n8n/.mcp.json` |
| dev-tool servers | external | `context7`, `exa`, `github`, `memory`, `playwright`, `sequential-thinking` | `envctl/.mcp.json`, `ECC/.mcp.json` |
| misc | external | `t` (oh-my-claudecode), `qmd` (obsidian-mind) | per-repo `.mcp.json` |

> Note: the live session also exposes **repowire** (`spawn_peer`, `ask`, `broadcast`, `job_*`,
> `schedule_*`) and **broker** (`broker_send/inbox/sessions`) mesh tools alongside `weave` — the same
> mesh substrate under different front-ends.

## 3. Schedulers / cron / autonomous loops
| surface | where | what it schedules |
|---------|-------|-------------------|
| **`ralph-n8n.sh`** | `n8n/.claude/plugins/n8n/skills/n8n-loop/scripts/` | autonomous self-restart loop — spawns a fresh `claude -p "/n8n-loop resume"` per iteration until a terminal sentinel (`DONE`/`NEEDS-HUMAN`/`STOP`); the harness driving *this* backlog |
| **ScheduleWakeup** | Claude harness (n8n-loop self-pacing) | re-fires the loop skill for the next cycle (dynamic interval) |
| **ScheduleTrigger** node | `n8n/packages/nodes-base/nodes/Schedule/` | n8n's cron/interval **workflow** trigger (user-facing automation) |
| repowire `schedule_self`/`schedule_cron` | mesh | cron-scheduled remote agents/peers |

## 4. Queues (async job processing)
All in **n8n** `packages/cli/src/scaling/` (queue mode):
- `scaling.service.ts` — Bull/BullMQ queue orchestration; `job-processor.ts` — job execution.
- `worker-server.ts` — the `pnpm worker` process; `redis/` + `pubsub/` — Redis transport.
- `multi-main-setup.ee.ts` + `leader-election-client.ts` — multi-main HA leader election.
- Entry path: `workflow-runner.ts` enqueues; workers dequeue and execute.

## 5. Webhooks / inbound triggers
n8n `packages/cli/src/webhooks/`:
- `live-webhooks.ts` (production), `test-webhooks.ts` + `test-webhook-registrations.service.ts` (editor testing),
- `waiting-webhooks.ts` + `waiting-forms.ts` (resume-on-callback / form triggers),
- `webhook-execution-context.ts`, `node-type-matcher.ts`. This is the planned inbound surface for the
  **Epic B** Claude↔n8n chat bridge (Chat Trigger) and **Epic C** visualization triggers.

## 6. Weave mesh (cross-agent messaging)
- **Broker**: `weave` crate — `main.rs` (CLI), `mcp.rs` (MCP server), `store.rs`/`store_libsql.rs`
  (libSQL-backed durable message store), `model.rs` (peer/message model), `inject.rs` (delivery).
- **Peers** register by `peer_id` in a circle; this session is `repow-default-31457eea`
  (`@n8n-claude-code`, circle `default`, project n8n). Used by the run-n8n harness to broadcast n8n
  lifecycle/health and hand off the n8n API key (see `mesh-report` skill).

## 7. Cross-repo automation spine (preview → A-4)
```
agent (claude -p)
  └─ meta CLI ──(meta_plugin_protocol subprocess)──> meta-git / meta-project / meta-rust plugins
  │     └─ exposed to agents as MCP server "meta" (meta_mcp)
  ├─ weave mesh (Rust broker) ←→ all agents/peers (weave_* / repowire)
  └─ n8n runtime (pnpm dev/start/worker)
        triggers: ScheduleTrigger (cron) · webhooks (live/test/waiting) · Chat Trigger (Epic B)
        engine:   workflow-runner → scaling queue (Bull/Redis) → workers
        control:  n8n-mcp + n8n-builtin MCP  ←  driven by the n8n-loop harness (ralph-n8n.sh)
```

## Epic A progress
- ✅ A-1 inventory · ✅ A-2 code-intel index (both in `meta-inventory.md`).
- ✅ **A-3** (this file): automation surfaces extracted.
- **A-4** (next): synthesize the full cross-repo data-flow **mermaid** map → `_workspace/meta-dataflow.md`.
