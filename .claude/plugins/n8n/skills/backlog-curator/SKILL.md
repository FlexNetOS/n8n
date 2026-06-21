---
name: backlog-curator
description: "Discover, prioritize, and maintain the n8n-loop harness backlog from meta workspace state sources. Triggers: 'discover backlog', 'curate work items', 'refresh roadmap', 'scan meta for new work'."
---

# Backlog Curator

Discovers real work from authoritative meta workspace sources and produces a prioritized, dependency-ordered backlog.

## Trigger phrases

- "discover backlog"
- "curate work items"
- "refresh the roadmap"
- "scan meta for new work"
- "what should we build next?"

## Steps

1. **Read data sources in parallel:** `.meta.yaml` project graph, Cargo.toml workspace members, Linear/GitHub open issues, `.claude/specs/`, existing `_workspace/backlog.md`.
2. **Extract pending items** from each source; normalize to canonical ids (`<epic>-<desc>`).
3. **Deduplicate** by normalized id — keep the version with newer source or most references.
4. **Prioritize:** P0 (foundation crates / critical path) → P1 (important) → P2 (nice-to-have) → P3 (edge case).
5. **Order within priority** using meta workspace execution order (foundation before consumers).
6. **Group into epics** with clear ownership boundaries.
7. **Write** to `_workspace/backlog.md` + DataTable `handoff_packets` row.

## Data sources

| Source | Path | What it provides |
|--------|------|-----------------|
| .meta.yaml projects | `/home/drdave/Desktop/meta/.meta.yaml` | Repo list, tags, nested meta repos |
| Cargo workspace | `/home/drdave/Desktop/meta/Cargo.toml` | Dependency graph for topo ordering |
| Linear/GitHub issues | `gh issue list --repo FlexNetOS/n8n --state open --json title,url,state,labels` | Open work items |
| Spec docs | `.claude/specs/` unimplemented specs | Pending feature proposals |
| Prior backlog state | `_workspace/backlog.md` | Carry-forward incomplete items |

## Output format

```markdown
### Epic <letter>: <description>

- [ ] <id>: <title>
  - automation_type: agent/n8n_workflow/both
  - verify_gates: cargo_check, bun_test, lint
  - depends_on: [<parent_ids>]
```

## Automation trigger

When complete, triggers `meta-discovery.n8n.json` workflow for recurring automated scanning (every 4 hours via n8n Schedule).
