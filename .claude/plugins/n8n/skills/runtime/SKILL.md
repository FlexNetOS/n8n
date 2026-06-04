---
name: n8n:runtime
description: How to boot, health-check, and tear down a local n8n instance — service containers, dev/start process, ports, env, and the known toolchain gotchas on this machine. ALWAYS read this before starting, stopping, or restarting n8n, or when n8n won't come up. Triggers on "run/start/boot/launch n8n", "n8n won't start", "is n8n up", "restart n8n", "n8n healthcheck".
---

# n8n Runtime — Boot & Operate

Authoritative procedure for running a **local dev** n8n instance. The `runtime-operator` and `runtime-monitor` agents follow this. Route every shell command through `rtk`.

## Why this exists

"Run n8n" is a multi-process boot with an ordering dependency (datastores before the app) and a few machine-specific traps. Improvised boots fail in confusing ways — silent process exits, "live but not ready", or a node-shim incompatibility. Follow the order; verify with health checks; report real state.

## Prerequisites (verify first)

| Check | Command | Expected |
|-------|---------|----------|
| pnpm present | `rtk proxy pnpm --version` | `10.32.1` (installed via bun → `~/.bun/bin/pnpm`) |
| Docker running | `rtk docker ps` | no error |
| Port free | `rtk proxy bash -c "ss -ltn | grep 5678 || echo free"` | `free` before boot |

> **Toolchain gotcha (this machine):** there is **no real Node.js** — `node` is bun's shim (reports `v24.3.0`, no REPL), and pnpm was installed through bun. Installs and `pnpm dev` run on the shim. If a step fails with zero output / silent exit, that is the shim or a lifecycle-order issue, not a missing dep — see the project memory note `n8n-toolchain-bun-shim`. A first `pnpm install` can exit 1 silently; re-running after deps land succeeds. If the dev server itself won't run on the shim, surface it clearly — a real Node ≥22.22 may be required.

## Boot order

```bash
# 1. Service containers (postgres, redis, mailpit, proxy) — datastores FIRST
rtk proxy pnpm --filter n8n-containers services --services postgres,redis,mailpit,proxy

# 2. n8n dev server (turbo, parallel, hot reload) — BACKGROUND it, log to file
#    run_in_background: true  +  redirect to a log
rtk proxy pnpm dev > /tmp/n8n-dev.log 2>&1
```

- Start step 2 with the Bash tool's `run_in_background: true`. Never foreground it — it never exits.
- Default editor: **http://localhost:5678** · REST under `/rest` · health under `/healthz`.
- Production alternative (not default): `pnpm build` then `pnpm start`. Docker: `pnpm build:docker`.

## Health checks (verify readiness — don't trust "process started")

| Endpoint | Meaning |
|----------|---------|
| `http://localhost:5678/healthz` | **liveness** — server process is up |
| `http://localhost:5678/healthz/readiness` | **readiness** — DB/migrations/queue ready to serve |

```bash
rtk curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz
rtk curl -s -o /dev/null -w "%{http_code}" http://localhost:5678/healthz/readiness
```

States to report: `ready` (both 200) · `live-not-ready` (healthz 200, readiness not) · `down` (connection refused). Poll readiness with backoff; first boot includes a build + migrations, so allow time and tail `/tmp/n8n-dev.log` if it stalls.

## Reporting to the mesh

On each transition (`booting → ready → degraded → down`), emit a status via the **`n8n:mesh-report`** skill over weave. Announce the editor URL when ready. This is how the monitor and any peer sessions learn the instance state — it is the "connect through meta weave" requirement.

## n8n-mcp API-key handoff

The `n8n-mcp` server (see `.mcp.json`) works docs-only out of the box. Its 13 management tools need an n8n **API key**, created in the running UI: **Settings → n8n API → Create an API key**. Per this workspace, keys are cataloged through weave. Flow when n8n is `ready`:

1. Prompt the user to create the API key in the browser UI (it only appears once).
2. Catalog it through weave (see `n8n:mesh-report` → "API key handoff").
3. Make it available to n8n-mcp as `N8N_API_KEY` **without committing it** — set it in user-scope config (`~/.claude/settings.json` `mcpServers.n8n-mcp.env`) or a local env, never in the committed `.mcp.json` (public repo). `N8N_API_URL=http://localhost:5678` is already wired.

## Teardown

```bash
# stop the dev server: kill the backgrounded task (preferred) or by port
rtk proxy bash -c "pkill -f 'turbo run dev' || true"
# stop + remove service containers
rtk proxy pnpm --filter n8n-containers services:clean
```

Emit a `down` mesh event after teardown so peers don't keep treating the instance as live.

## Troubleshooting

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `pnpm` not found | not on PATH | `bun install -g pnpm@10.32.1` (see memory `n8n-toolchain-bun-shim`) |
| `pnpm install`/dev exits 1, no output | lifecycle-order / bun-shim | re-run after deps land; `--ignore-scripts` to isolate, then `pnpm rebuild` |
| Port 5678 already bound | stale n8n process | find/kill the old process, then re-boot |
| healthz 200 but readiness never green | DB not reachable / migrations stuck | check containers healthy (`rtk docker ps`); tail `/tmp/n8n-dev.log` |
| Containers won't start | Docker down / leftover `n8n-svc-*` | `rtk docker ps -a`; `services:clean`; retry |
| n8n-mcp mgmt tools 401/no auth | missing/invalid `N8N_API_KEY` | run the API-key handoff above; until then, docs/validation only |
