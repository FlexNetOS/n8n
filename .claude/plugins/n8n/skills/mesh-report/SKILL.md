---
name: n8n:mesh-report
description: How to report n8n runtime status and hand off the n8n API key over the meta weave mesh. ALWAYS use when announcing n8n lifecycle events (booting/ready/degraded/down), broadcasting health, or cataloging an n8n API key through weave. Shared by the runtime-operator, runtime-monitor, and workflow-engineer agents. Triggers on "report status to the mesh", "tell the mesh", "broadcast n8n health", "catalog the api key through weave".
---

# n8n Mesh Report — weave coordination

This skill is the harness's link to the **meta weave mesh**. The n8n runtime agents run as independent sessions; the mesh is how they (and peer sessions) share state. Reporting through weave IS the "connect through meta weave" requirement — treat it as a first-class step, not an afterthought.

## Transport: two tools, two jobs

| Need | Tool | Form |
|------|------|------|
| **Directed** message to one peer | `weave_send` (MCP) or `weave send` (CLI) | `weave send --to <peer> --subject <s> --body <text>` |
| **Reply** in an existing thread | `weave_reply` / `weave reply` | auto-addresses the original sender |
| **Fan-out** announcement to the circle | repowire `broadcast` (MCP) | one message to all peers in the circle |
| **Discover peers** | `weave peers` / `weave_peers` | lists known peers + last-seen |

This session is registered on the mesh as **`@n8n-claude-code`** (peer_id `repow-default-9f7d5216`, circle `default`). There is also a long-lived `n8n` peer. Prefer **`weave send`** for directed status to a known coordinator/peer, and **repowire `broadcast`** when the whole circle should know (e.g. "n8n is READY").

> weave `send` is point-to-point — there is no weave broadcast. For mesh-wide announcements use repowire `broadcast`. A failed live injection is not an error: weave persists the message and delivers on the recipient's next inbox drain.

## Status event format

Keep messages short, structured, and parseable. One line of state + the essentials:

```
[n8n] <STATE> | url=http://localhost:5678 | ready=<liveness>/<readiness> | t=<when> | note=<short>
```

States: `BOOTING` · `READY` · `LIVE-NOT-READY` · `DEGRADED` · `DOWN` · `RECOVERED`.

Examples:
- `[n8n] BOOTING | containers=up | note=starting dev server`
- `[n8n] READY | url=http://localhost:5678 | ready=200/200 | note=editor reachable`
- `[n8n] DEGRADED | ready=200/503 | note=readiness stuck — migrations re-running`
- `[n8n] DOWN | note=connection refused on :5678`

## When to emit (report on change, not on a timer)

| Emitter | Emit on |
|---------|---------|
| `runtime-operator` | `BOOTING` at start, `READY` when healthz+readiness both 200 (with URL), `DEGRADED`/`DOWN` on failed boot (with log tail cause), `DOWN` after teardown |
| `runtime-monitor` | state **transitions** only, plus one periodic summary; never a per-poll heartbeat |
| `workflow-engineer` | significant deploys: `[n8n-wf] DEPLOYED id=<id> name=<name> validated=ok` |

## API key handoff (the key flow)

The n8n-mcp management tools need an n8n API key. Per this workspace, **keys are created and cataloged through weave**, obtained from the UI on first launch. Procedure:

1. When n8n is `READY`, prompt the user: *Settings → n8n API → Create an API key* (shown once).
2. Catalog it through weave — send a directed, clearly-subjected message to the cataloging peer (do **not** broadcast a secret to the whole circle):
   ```
   weave send --to <catalog-peer> --subject "n8n-api-key" --body "<key> url=http://localhost:5678 scope=local-dev"
   ```
3. Make it usable by n8n-mcp **without committing it**: set `N8N_API_KEY` in user-scope config (`~/.claude/settings.json` → `mcpServers.n8n-mcp.env`) or a local env. Never write it into the committed `.mcp.json` (public repo).
4. Notify `workflow-engineer` over the mesh that management tools are now unlocked.

> Treat the key as a secret end-to-end: directed message only, never broadcast, never committed, never echoed into a shared log.

## Verify delivery

Use `weave receipts <message-id>` (or `weave thread`) to confirm a critical report (like a key handoff) was read. If a peer is offline, the message still queues — note that delivery is pending rather than retrying in a loop.
