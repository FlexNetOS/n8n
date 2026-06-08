# Bun Migration Notes — n8n-loop Harness

This documents the migration from pnpm/node to bun for harness tooling in the n8n-loop autonomous loop.

## What Changed

### Harness Scripts → bun
All harness-level scripts, test runners, and helper utilities now use bun:

| Old (pnpm/node) | New (bun) |
|-----------------|-----------|
| `pnpm install` | `bun install` |
| `pnpm -F <pkg> build` | `bun run --cwd packages/<pkg> build` |
| `pnpm -F <pkg> test` | `bun test --cwd packages/<pkg>` |
| `pnpm lint` | `bunx biome check .` |
| `npx <pkg>` | `bunx <pkg>` |
| `node script.mjs` | `bun run script.mjs` |

### Files Updated
- `.claude/plugins/n8n/skills/n8n-loop/scripts/ralph-n8n.sh` — bun PATH detection, updated verify commands in prompt
- `_workspace/handoff/bun-config.json` — central config mapping pnpm→bun equivalents
- `_workspace/handoff/scripts/ledger.sh` — uses `$BUN` variable for JS helpers
- All `.mjs` harness scripts → run via `bun run`

### n8n Repo Itself — UNCHANGED
The n8n source repository continues to use **pnpm + Node.js 22** for:
- CI/CD builds (github actions still require pnpm)
- Development server (`pnpm start`)
- Test suites using Jest (n8n source uses jest, not bun test)
- TypeScript compilation

Bun is ONLY used for harness-level tooling. The n8n platform itself is untouched.

## What Must Stay on Node/pnpm

These are n8n platform requirements that cannot be replaced by bun:
1. **CI pipeline** — GitHub Actions matrix runs `pnpm install` and `pnpm build`
2. **Jest test runner** — n8n source tests use Jest; bun's built-in test runner is different
3. **TypeORM** — requires Node.js native addons (sqlite3, pg) that may not work with bun's SQLite support yet
4. **pnpm workspace resolution** — monorepo dependency graph uses pnpm's lockfile semantics

## Workflow JSON Artifacts — Unchanged
n8n workflow JSON files (`*.n8n.json`) are pure data — no runtime dependency on bun or pnpm. They work identically regardless of the harness toolchain.

## Verification

To verify the migration is working:
```bash
# Check bun is available
bun --version  # should be >= 1.0

# Run harness smoke test (Phase 5)
bash _workspace/handoff/scripts/harness-smoke-test.sh

# Verify a cycle end-to-end
N8N_APPLY=0 bash .claude/plugins/n8n/skills/n8n-loop/scripts/ralph-n8n.sh
```

## Rollback

If bun causes issues, the rollback is minimal:
1. Revert `ralph-n8n.sh` changes (bun detection + verify commands)
2. Delete `_workspace/handoff/bun-config.json` — it's advisory only
3. All n8n source tooling was never touched
