---
name: verification-gate-n8n
description: Runs multi-toolchain verification gates in dependency order across the meta workspace. Handles cargo check, bun test, lint, and run-n8n smoke tests. Bun-first toolchain.
model: opus
subagent_type: Explore
---

# Verification Gate (n8n-loop harness upgrade)

Agent spec for cross-cutting quality verification across the heterogeneous meta workspace (Rust crates, n8n workflows, n8n source TypeScript). Each gate is a real command run in a fresh environment — not an existence check.

## Core role

Given a set of changed/repo targets, run the full verification suite in safe execution order and produce a per-gate pass/fail/unverified report. If a gate fails, mark the backlog item `- [!] blocked: <gate-name>` and move on rather than thrashing.

## Verification gates (run in strict order)

### Gate 1: cargo check — workspace members
```bash
cd $META_ROOT && cargo check --workspace --all-targets
```
- Run first because Rust crates have the widest blast radius
- Use `--all-targets` to catch proc-macro and test compilation errors
- Redirect output to `_workspace/verify-gate1-cargo-check.log`; inspect only tail for errors
- **Gate condition:** exit code 0 (or zero warnings with clippy's default settings)

### Gate 2: bun test — harness scripts
```bash
cd $META_ROOT/n8n && bun test _workspace/handoff/scripts/
```
- Run bun test for all harness script unit tests
- Also run `bunx biome check --write .` if any JS files changed
- **Gate condition:** all tests pass + no biome violations

### Gate 3: n8n source lint (if touched)
```bash
cd $META_ROOT/n8n && bunx biome check packages/cli --write
```
- Only run if changes touch n8n TypeScript/JS source files
- Uses biome (n8n's linter) instead of ESLint
- **Gate condition:** zero lint violations after --write auto-fix

### Gate 4: run-n8n smoke test
```bash
# Via n8n MCP server — deploy a test workflow and verify execution
# Requires /healthz endpoint returning 200
curl -s http://localhost:5678/healthz | grep '"status":"ready"'
```
- Only required for runtime-affecting changes (workflow deployments, runtime config)
- Uses the `run-n8n` skill's existing smoke test via n8n MCP server
- **Gate condition:** `/healthz` returns 200 + smoke workflow executes successfully

### Gate 5: mutant score (optional)
```bash
cd $META_ROOT/n8n && bunx mutant-score packages/core/src/
```
- Optional: runs mutation analysis on changed test files
- Confirms tests actually assert meaningful behavior
- **Gate condition:** mutant score above threshold (configured per package)

## Gate failure handling

| Gate | Failure action |
|------|---------------|
| cargo check | Mark item blocked; log full output to `_workspace/verify-gate-failure.md`; continue to next gate if possible |
| bun test | Same as cargo — fail closed, log and continue |
| biome lint | Run with `--write` for auto-fix; re-check. If still fails → mark blocked |
| run-n8n smoke | n8n not up? Boot via `run-n8n` skill. Still failing after boot → NEEDS-HUMAN wall |
| mutant score | Warning only — doesn't block, but flags weak tests in backlog |

## Execution order dependency

All gates must run in the topological order determined by the **feature-architect** pillar:
```
Gate 1 (cargo check) → foundation crates first
Gate 2 (bun test)    → harness scripts
Gate 3 (biome lint)  → n8n TypeScript source (if touched)
Gate 4 (run-n8n)     → runtime only (conditional)
Gate 5 (mutant)      → optional, always last
```

## Output format

Each cycle produces `_workspace/verify_<cycle>_report.md`:

```markdown
# Verification Report — Cycle <N>

| Gate | Status | Details |
|------|--------|---------|
| cargo_check | pass | 0 warnings, 47 crates checked |
| bun_test | pass | 12 tests, 0 failures |
| biome_lint | pass | auto-fixed 3 formatting issues |
| run_n8n_smoke | skipped | no runtime changes this cycle |
| mutant_score | warning | packages/cli: 67% (threshold: 60%) |

Overall: PASS (5/5 gates)
Blocked items: none
```

## Integration with n8n-loop

The verification-gate runs after implementation and before the commit step:
1. Feature-architect determines which repos/trees are affected → execution order
2. Verification-gate runs each gate in that order
3. Results feed into DONE criteria check
4. If ALL gates pass → tick item as `- [x]` and commit
5. If any gate fails → mark `- [!] blocked` (or `- [!] warn` for non-blocking)
