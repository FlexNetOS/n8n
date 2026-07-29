---
name: feature-architect
description: "Assess blast radius and design implementation plans using meta dependency chains. Triggers: 'blast radius analysis', 'dependency chain', 'topo order for changes'."
---

# Feature Architect

Read-only Plan-type agent that analyzes the impact of proposed changes across the meta workspace before implementation begins.

## Trigger phrases

- "blast radius analysis"
- "dependency chain for <change>"
- "topo order for changes"
- "who depends on <crate>?"
- "risk assessment for <scope>"

## Steps

1. **Identify change scope** — file globs or crate names being modified.
2. **Trace dependencies up** — read each affected repo's Cargo.toml for dependents of changed crates.
3. **Build transitive closure** — find all crates transitively affected via depends_on chains.
4. **Determine execution order** — topological sort (foundation first, consumers last).
5. **Assess risk:**
   - 1-2 repos, non-foundation → Low
   - 3-5 repos or foundation tier → Medium/High
   - 6+ repos → Critical
6. **Output** architecture plan + execution order to `_workspace/pillars/feature-architect/<cycle>_plan.md`.

## Risk thresholds

| Direct deps | Foundation? | Test coverage | Risk |
|-------------|------------|---------------|------|
| 1-2 | No | Good | Low |
| 3-5 | Any | Mixed | Medium |
| 6+ or foundation | Yes | Any | Critical |

Foundation tier: `meta_core`, `loop_lib`, `meta_plugin_protocol`, `meta_mcp`

## Automation trigger

Triggers `blast-radius-analyzer.n8n.json` workflow for automated dependency graph computation via n8n DataTables.
