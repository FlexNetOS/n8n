---
name: verification-gate
description: "Run multi-toolchain verification gates in dependency order. Triggers: 'run verification gates', 'multi-toolchain verify', 'bun test harness scripts'."
---

# Verification Gate

Runs cross-cutting quality verification across the meta workspace in safe dependency order. Bun-first toolchain (all harness scripts use bun, not pnpm).

## Trigger phrases

- "run verification gates"
- "multi-toolchain verify"
- "bun test harness scripts"
- "check all gates for this cycle"

## Gates (strict order)

| # | Gate | Command | Target |
|---|------|---------|--------|
| 1 | cargo check | `cargo check --workspace --all-targets` | All Rust workspace members in topo order |
| 2 | bun test | `bun test _workspace/handoff/scripts/` | Harness script tests |
| 3 | biome lint | `bunx biome check packages/cli --write` | n8n TypeScript source (if touched) |
| 4 | run-n8n smoke | HTTP check to `/healthz` + workflow deploy | Runtime-affecting changes only |
| 5 | mutant score | `bunx mutant-score <changed-file>` | Changed test files (optional) |

## Failure handling

- Gates fail → mark item `- [!] blocked: <gate-name>`, log detailed output, continue to next gate if possible
- Gates pass → tick item `- [x]`, commit, proceed to docs-scribe
- run-n8n smoke fails after boot attempt → NEEDS-HUMAN wall (cannot proceed without runtime)

## Output

`_workspace/verify_<cycle>_report.md` with per-gate status table and overall PASS/FAIL verdict.

## Automation trigger

Triggers `multi-toolchain-verify.n8n.json` workflow for automated multi-repo verification orchestration via n8n DataTables.
