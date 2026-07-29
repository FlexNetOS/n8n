@AGENTS.md

## Harness: autonomous / resumable operation (n8n-loop)

**Goal:** Work a durable on-disk backlog **autonomously** — one item per cycle, commit per cycle,
hand off to a fresh session at a cycle budget, with optional fully-unattended self-restart (a clean
context each cycle, the "/new" effect). Truth lives on disk (`_workspace/` backlog + checkpoints +
commits) so any restart resumes **cold with zero loss**.

**Trigger:** For any request to work a backlog/roadmap autonomously, "keep building", "loop on the
backlog", run "until done"/"unattended", or "resume/pick up the loop", use the **`n8n-loop`** skill.
For handing a loop off to a fresh session or resuming from a handoff, it drives **`session-relay`**
(+ the `continuity-steward` agent). Each cycle reuses the existing harness — `spec-driven-development`
(design), `run-n8n` + the n8n MCP server (verify), `workflow-ops` (build n8n workflows),
`mutant-score` (test strength), `create-pr` (APPLY only). Unattended runner:
`.claude/plugins/n8n/skills/n8n-loop/scripts/ralph-n8n.sh` (SAFE by default; `N8N_APPLY=1` to act;
`touch _workspace/STOP` to halt). Simple one-off changes use the relevant skill directly, not the loop.

**Kit references:** generic `$META_ROOT/HARNESS-UPGRADE-KIT.md` · tailored
`$META_ROOT/harness_hub/upgrade-kits/n8n.md`.

**Change history:**
| Date | Change | Target | Reason |
|------|--------|--------|--------|
| 2026-06-05 | Build autonomous loop | skills/{n8n-loop,session-relay}, agents/continuity-steward, n8n-loop/scripts/ralph-n8n.sh, `_workspace/{backlog,loop_state}.md`, `.gitignore` carve-out | Upgrade harness to the envctl-proven Ralph pattern (resumable, self-restarting); backlog seeded with epics: map meta codebase, Claude-CLI↔n8n-chat bridge, n8n data-flow visualization |
