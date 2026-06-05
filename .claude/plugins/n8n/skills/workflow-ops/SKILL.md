---
name: n8n:workflow-ops
description: How to build, validate, and deploy n8n workflows through the n8n-mcp MCP server (7 core + 13 management tools). ALWAYS use when authoring a workflow, validating a workflow JSON, deploying/running a workflow on the local n8n, or searching n8n node docs. Triggers on "build a workflow", "validate this workflow", "deploy the workflow", "n8n node docs", "what nodes do X", "push workflow to n8n".
---

# n8n Workflow Ops — two MCP surfaces

The `workflow-engineer` agent uses this. There are **two** complementary n8n MCP servers wired in `.mcp.json`; pick by task:

| Server | Auth | Best for | Tool names |
|--------|------|----------|------------|
| **`n8n-mcp`** (external, `npx`, from `meta/mcp_hub`) | none for core | **authoring** — node docs, search, validation, templates | `search_nodes`, `get_node`, `validate_workflow`, `tools_documentation`, … |
| **`n8n-builtin`** (n8n's OWN MCP server at `/mcp-server/http`) | **`mcp-server-api` key** via `Bearer ${N8N_MCP_SERVER_TOKEN}` | **live management** — build/deploy/run against the running instance | `create_workflow_from_code`, `update_workflow`, `publish_workflow`, `execute_workflow`, `test_workflow`, `search_workflows`, `get_execution`, `validate_workflow`, `list_credentials`, data-tables, `get_sdk_reference`, … (28 tools) |

**Two key types — don't confuse them (n8n ≥2.25):**
- `n8n-builtin` (n8n's MCP server) takes an **`aud: mcp-server-api`** key as a Bearer token → this is what's wired and working.
- `n8n-mcp`'s 13 *management* tools (`n8n_*`) would take an **`aud: public-api`** key in `N8N_API_KEY` (public REST API). Without it, `n8n-mcp` is docs-only — which is fine, because **live management goes through `n8n-builtin`** instead.

**Default path:** author + validate with `n8n-mcp` (rich node docs), then build/deploy/run on the live instance with `n8n-builtin` (uses the SDK — start from its `get_sdk_reference` and `create_workflow_from_code`). Both require n8n running; `n8n-builtin` also needs MCP access enabled (Settings → MCP) and the token in `.claude/settings.local.json` (gitignored).

## n8n-mcp tiers (authoring server)

## Two tiers of tools

| Tier | Auth | Tools |
|------|------|-------|
| **Core (7)** | none | `tools_documentation`, `search_nodes`, `get_node`, `validate_node`, `validate_workflow`, `search_templates`, `get_template` |
| **Management (13)** | needs `N8N_API_KEY` | `n8n_create_workflow`, `n8n_get_workflow`, `n8n_update_full_workflow`, `n8n_update_partial_workflow`, `n8n_delete_workflow`, `n8n_list_workflows`, `n8n_validate_workflow`, `n8n_autofix_workflow`, `n8n_workflow_versions`, `n8n_deploy_template`, `n8n_test_workflow`, `n8n_executions`, `n8n_manage_credentials` (+ `n8n_health_check`, `n8n_audit_instance`) |

Core tools work immediately. Management tools require the API key — see "API key" below.

## The loop: author → validate → deploy → verify

Why this order: n8n nodes have hundreds of versioned, interdependent properties. Guessing a node config produces workflows that import but fail at runtime. Ground every node in real docs, validate before deploy, and confirm against the live instance.

1. **Self-document.** Call `tools_documentation` first — n8n-mcp describes its own tools and current node coverage. Don't guess tool shapes.
2. **Ground the nodes.** `search_nodes` to find the right node, then `get_node` for its exact properties/operations. Build the node config from the returned schema — never invent parameters.
3. **Validate.** `validate_node` for individual tricky nodes; `validate_workflow` on the full JSON. Use `n8n_autofix_workflow` for mechanical issues. Iterate until clean — validation failures are feedback, not blockers to bypass.
4. **Deploy** (needs key). New: `n8n_create_workflow`. Change: prefer `n8n_update_partial_workflow` (targeted) over `n8n_update_full_workflow` (whole-workflow replace).
5. **Verify** (needs key). `n8n_get_workflow` to confirm it landed, `n8n_test_workflow` to run it, `n8n_executions` to inspect the result. Report the **execution outcome**, not just "created."

## API key

Management tools need `N8N_API_KEY` (with `N8N_API_URL=http://localhost:5678`, already wired). Per this workspace the key is created in the n8n UI and cataloged through weave:

- If management tools return 401 / "no API configured": the key isn't set yet. Do **not** fabricate one.
- Trigger the handoff: see `n8n:mesh-report` → "API key handoff" (user creates key in *Settings → n8n API*, cataloged via weave, set as `N8N_API_KEY` in user-scope config — never committed).
- Until the key lands, do useful docs-only work: design + `validate_workflow` the JSON so it's deploy-ready the moment auth is available.

## Coordinate with the runtime

Deploy/run/execution tools need n8n actually **up**. Before management calls, confirm readiness (the `runtime-monitor` reports `READY` over the mesh, or run `n8n_health_check`). If the instance is down, coordinate with `runtime-operator` via `n8n:mesh-report` rather than retrying blindly.

## Report deploys

After a meaningful deploy, emit a mesh note via `n8n:mesh-report`: `[n8n-wf] DEPLOYED id=<id> name=<name> validated=ok`. Keep workflow JSON artifacts in `_workspace/` so follow-up edits are partial updates, not rebuilds.
