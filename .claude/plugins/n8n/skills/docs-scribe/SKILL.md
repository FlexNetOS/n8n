---
name: docs-scribe
description: "Sync changelogs, ADRs, and AGENTS.md across all meta repos after each cycle. Triggers: 'sync docs across repos', 'update changelog', 'ADR propagation'."
---

# Docs Scribe

Keeps documentation artifacts fresh across the heterogeneous meta workspace (51+ repos) after every implementation cycle.

## Trigger phrases

- "sync docs across repos"
- "update changelog"
- "ADR propagation"
- "keep docs fresh"

## What it syncs

| Doc Type | Location | When Updated |
|-----------|----------|-------------|
| CHANGELOG.md [Unreleased] | Root of each affected repo | Every cycle that touches the repo |
| AGENTS.md | `.claude/` or root of each meta repo | On architecture decisions or format drift |
| ADRs | `_workspace/adr/<N>-<title>.md` | When feature-architect flags arch decision |
| Skill SKILL.md frontmatter | All skills that reference this skill | When cross-references change |

## Sync rules

1. **Changelog:** append conventional commit entries under `[Unreleased] → <section>` for each affected repo
2. **AGENTS.md drift:** compare current vs committed; auto-sync if format matches, flag if not
3. **ADR generation:** when an architecture-level decision is made, produce ISO 172 ADR format
4. **Skill cross-refs:** update SKILL.md files that reference newly-created/modified skills

## Output

`_workspace/docs-scribe/<cycle>_notes.md`:
```markdown
# Docs Scribe Report — Cycle <N>
## Changelog Updates: repo → entries added
## ADRs Generated: ADR-N | title | date
## AGENTS.md Drift: repo → status (drifted/clean)
```

## Automation trigger

Triggers `meta-doc-sync.n8n.json` workflow for automated doc target identification and entry generation.
