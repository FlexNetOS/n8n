---
name: n8n:workflow-ops
description: How to build, validate, and deploy n8n workflows through the n8n-mcp MCP server (7 core + 13 management tools). ALWAYS use when authoring a workflow, validating a workflow JSON, deploying/running a workflow on the local n8n, or searching n8n node docs. Triggers on "build a workflow", "validate this workflow", "deploy the workflow", "n8n node docs", "what nodes do X", "push workflow to n8n".
---

# n8n Workflow Ops — via n8n-mcp

The `workflow-engineer` agent uses this. n8n-mcp is the **agent interface** to n8n; the running n8n is the **engine**. Wired in `.mcp.json` as `n8n-mcp` (stdio via `npx n8n-mcp`, canonical from `meta/mcp_hub`).

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
