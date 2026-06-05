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
| **Real Node.js** | `node --version` + `node -e "console.log(!!process.versions.bun)"` | `v22.x` and `false` (NOT bun) |
| pnpm present | `rtk proxy pnpm --version` | `10.32.1` (installed via bun → `~/.bun/bin/pnpm`) |
| Built? | `test -d packages/cli/dist && echo built \|\| echo NOT-built` | `built` (else build first — see below) |
| Docker | `docker ps` | optional — if absent, use the containerless/SQLite profile |
| Port free | `rtk proxy bash -c "ss -ltn \| grep 5678 \|\| echo free"` | `free` before boot |

> **Toolchain reality (this machine) — already solved, keep it solved.** The base box has **no real Node.js**: bare `node` was bun's shim, which **cannot build or run n8n** (n8n's build uses `tsx`/esbuild, which fails under bun: `Cannot find module './cjs/index.cjs'`). A genuine **Node v22.22.3 is installed at `~/.local/node`**, and `node`/`npx`/`npm` are symlinked into `~/.local/bin` — which **precedes `~/.bun/bin` on PATH**, so real Node wins everywhere (Bash *and* the n8n-mcp `npx` launch) with no `~/.bashrc` edit. If `node -e "process.versions.bun"` ever prints `true` again, re-create those symlinks: `ln -sf ~/.local/node/bin/{node,npx,npm} ~/.local/bin/`. See memory `n8n-toolchain-bun-shim`. Do **not** prepend PATH inline anymore — the symlinks make it global.

> **Build before run (fresh checkout).** n8n must be **built** before `start`/`dev` works — foundational packages (`@n8n/di`, `@n8n/constants`, `@n8n/backend-common`, `packages/cli`) need `dist/`. Run the memory-capped build first: `rtk proxy pnpm agent:setup build` (logs to `.agent-setup/`, writes `summary.json`). If it fails at `@n8n/n8n-nodes-langchain` with a missing `node_sqlite3.node`, rebuild the native addon: `pnpm rebuild sqlite3` (needs python3/make/g++ — present), then re-run the build (turbo caches the rest). Running `pnpm dev` without a build thrashes with ~1800 "Cannot find module '@n8n/di'" errors.

## Boot order

Two profiles. Pick by whether Docker is available:

**A. Full stack (Docker present)** — postgres/redis/mailpit/proxy, then n8n:
```bash
# 1. Service containers — datastores FIRST
rtk proxy pnpm --filter n8n-containers services --services postgres,redis,mailpit,proxy
# 2. then start n8n (step below)
```

**B. Containerless / SQLite (Docker absent — current default on this box)** — skip containers entirely. n8n falls back to its built-in **SQLite** DB and **regular (non-queue) mode**. No external services needed.

**Start n8n** (after a successful build — see "Build before run"):
```bash
# Stable: run the BUILT CLI (serves prebuilt editor). Preferred on low-memory boxes.
# BACKGROUND it (run_in_background: true), redirect to a log.
rtk proxy pnpm start > _workspace/01d_operator_start.log 2>&1
```

- Start with the Bash tool's `run_in_background: true`. Never foreground it — it never exits.
- **`pnpm start` (built CLI) is the stable default here** — `pnpm dev` runs ~50 parallel turbo watchers (tsc + vite) and can OOM a 6 GB box; only use `dev` when the user explicitly wants hot reload, and only after a full build.
- Default editor: **http://localhost:5678** · REST under `/rest` · health under `/healthz` · task broker on `:5679`.
- Docker image build (heaviest): `pnpm build:docker`.

## Clean HTTPS URL via `lane` (optional, nice-to-have)

`lane` (installed at `~/.local/bin/lane`) fronts the local port with a trusted HTTPS domain. A `.lane.yaml` at the repo root maps `n8n.test → localhost:5678`. **First-ever `lane` run needs a one-time privileged setup** (provisions a local CA, adds it to the OS trust store, sets up 80→10080 / 443→10443 forwarding) and **prompts for a password** — so the *user* must run it in their own shell (suggest `! lane up`). Agents cannot complete it (sudo is password-gated here). After that one-time setup, `lane up` / `lane down` need no password. Check state with `lane doctor`. Until lane is set up, just use `http://localhost:5678` directly.

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

The `n8n-mcp` server (see `.mcp.json`) works docs-only out of the box. Its 13 management tools call the n8n **public REST API** (`/api/v1`), which needs an API key. Per this workspace, keys are cataloged through weave. Flow when n8n is `ready`:

1. Prompt the user to create the key in **Settings → n8n API → Create an API key** (it only appears once).
   - **Audience matters (n8n ≥2.25):** the key must have JWT `aud: "public-api"`. A key from the *MCP* settings has `aud: "mcp-server-api"` and is **rejected by `/api/v1` with 401** (n8n enforces this). Verify by decoding the JWT payload; if `aud` isn't `public-api`, it's the wrong key — have the user create one from the **n8n API** (public API) section, not an MCP section.
2. Catalog it through weave (see `n8n:mesh-report` → "API key handoff").
3. Store it as `N8N_API_KEY` **without committing it** — put it in `.claude/settings.local.json` `env` (gitignored) so the n8n-mcp child process inherits it; never in the committed `.mcp.json` (public repo). `N8N_API_URL=http://localhost:5678` is already wired. The running MCP server picks up the new env on its **next launch** (restart Claude / reconnect). Quick pre-check the key against the live API: `curl -s -o /dev/null -w '%{http_code}' -H "X-N8N-API-KEY: <key>" http://localhost:5678/api/v1/workflows` should be `200`.

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
| build fails at `tsx`: `Cannot find module './cjs/index.cjs'` + `Bun vX` | bare `node` is the bun shim; tsx can't run under bun | ensure real Node wins: `ln -sf ~/.local/node/bin/{node,npx,npm} ~/.local/bin/`; verify `node -e "process.versions.bun"` is `false` |
| build fails at `@n8n/n8n-nodes-langchain`: missing `node_sqlite3.node` | native `sqlite3` addon not compiled (installed under bun) | `pnpm rebuild sqlite3` (python3/make/g++ present), then re-run build |
| `pnpm dev` floods ~1800 "Cannot find module '@n8n/di'" | no prior build (`dist/` missing) | stop dev; `pnpm agent:setup build` first; then `pnpm start` |
| `pnpm` not found | not on PATH | `bun install -g pnpm@10.32.1` (see memory `n8n-toolchain-bun-shim`) |
| n8n-mcp `✗ Failed to connect` | `npx` not resolving to real Node on Claude's PATH | re-create the `~/.local/bin` node symlinks; reconnect (`claude mcp list`) — may need a Claude restart |
| Port 5678 already bound | stale n8n process | find/kill the old process, then re-boot |
| healthz 200 but readiness never green | DB not reachable / migrations stuck | (full stack) check containers healthy; (SQLite) tail the start log |
| "Python task runner ... virtual environment is missing" | optional Python runner venv absent | non-fatal (JS runner works); to enable: `cd packages/@n8n/task-runner-python && uv sync`, then restart n8n |
| Docker absent / containers won't start | no Docker on this box | use the **containerless/SQLite** profile (skip the services step) |
| n8n-mcp mgmt tools 401/no auth | missing/invalid `N8N_API_KEY` | run the API-key handoff above; until then, docs/validation only |
| `lane`/`https://n8n.test` not resolving | one-time privileged lane setup not done | user runs `! lane up` (password prompt); verify `lane doctor`; meanwhile use `http://localhost:5678` |
