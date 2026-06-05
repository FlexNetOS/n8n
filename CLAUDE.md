@AGENTS.md

## Harness: autonomous / resumable operation (upgrade path)

This repo's harness can be upgraded to **autonomous, resumable, self-restarting** operation:
a durable on-disk backlog → one item per cycle → hand off to a fresh session at a cycle budget
→ optional fully-unattended self-restart with a clean context each cycle ("/new" effect). Truth
lives on disk (backlog + checkpoints + commits) so any restart resumes cold with zero loss.

- Generic pattern + templates: `~/Desktop/meta/HARNESS-UPGRADE-KIT.md`
- Tailored kit for THIS repo:  `~/Desktop/meta/harness_hub/upgrade-kits/n8n.md`
- Integrates with your existing harness: spec-driven-development, run-n8n, and the existing `_workspace/` (reuse it as the loop's durable state).
