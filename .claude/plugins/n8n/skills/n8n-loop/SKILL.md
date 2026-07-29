---
name: n8n-loop
description: "Run the n8n harness CONTINUOUSLY over a durable backlog — the autonomous, resumable Ralph loop. ALWAYS use when asked to: work a backlog/roadmap of n8n work autonomously, 'keep building', 'loop on the backlog', run 'until done' / 'on repeat' / 'unattended', or 'resume the loop' / 'pick up the loop' / 'continue in a new session' from a handoff. Each cycle does the next undone backlog item via design→implement→verify, checkpoints to disk, commits, and self-paces; at the per-session cycle budget it hands off to a fresh session via session-relay. Drives the existing n8n skills (spec-driven-development, run-n8n, workflow-ops, mutant-score, create-pr) and the n8n MCP server for verification. Do NOT use for a single one-off change (use the relevant skill directly) or for merely *running* n8n (use run-n8n)."
---

# n8n-loop (autonomous Ralph loop)

You run the n8n harness as a **self-perpetuating loop** over a durable backlog, one item per cycle,
instead of holding the whole plan in one long session. The design is the *Ralph* pattern: durable
state on disk, each iteration reads it, does the next undone thing, **verifies across the boundary**,
writes the result back, commits, and re-fires. The loop's intelligence lives in the **backlog file
and checkpoints**, not in conversation memory — that is exactly what lets a fresh session pick it up
with zero loss (see `n8n:session-relay`).

## Why this shape
Conversation context rots and token cost climbs the longer a session runs. A loop that keeps all its
truth in durable files can be carried across many short, cheap sessions instead of one long,
degrading one. **Never hold loop state only in your head — write it down every cycle.**

## Durable state (the loop's memory)
All under the repo-root `_workspace/` (git-tracked ledger; logs gitignored):
- **`_workspace/backlog.md`** — the source of truth. Ordered checklist grouped into **epics**. Item
  legend: `- [ ]` todo · `- [x]` done+verified · `- [!] blocked: <reason>`. One slice per item,
  small enough that a cycle fits under budget.
- **`_workspace/loop_state.md`** — the ledger: `cycles_this_session`, `cycles_total`, `cycle_budget`,
  `session_started` (UTC, you supply it — never call Date.now), `last_item`, `status`, `apply_mode`.
- **Per-cycle artifacts** — `NN_<stage>_<item>.md` for the item in flight (design notes, verify
  output). These are gitignored scratch; the *ledger* is what gets committed.
- **DataTable ledger** (`handoff_packets` via `@n8n-nodes-langchain.n8nDataTable`) — authoritative machine-readable state at `_workspace/handoff/`. Every cycle writes a row here validated against `packet-n8n.schema.json`. Read first; fall back to HANDOFF.md file if DataTable queries fail.
- **Handoff schemas** (`_workspace/handoff/schemas/`) — reference JSON schemas copied from `weave/sessions-handoff`, adapted for n8n contexts.

## Pillar Coordination

The harness has four automated pillars that extend the core Ralph loop with meta workspace awareness. Each pillar has an **agent spec** (orchestration decisions) and an **n8n workflow** (automated execution):

| Pillar | Agent Spec | n8n Workflow | Purpose |
|--------|-----------|-------------|---------|
| **Backlog-Curator** | `_workspace/pillars/backlog-curator/backlog-curators.md` | `meta-discovery.n8n.json` | Discovers work from `.meta.yaml`, Cargo deps, Linear/GitHub; produces prioritized backlog |
| **Feature-Architect** | `_workspace/pillars/feature-architect/feature-architect-n8n.md` | `blast-radius-analyzer.n8n.json` | Blast radius via meta dependency chains; topo-sorted execution order; risk assessment |
| **Verification-Gate** | `_workspace/pillars/verification-gate/verification-gate-n8n.md` | `multi-toolchain-verify.n8n.json` | Multi-toolchain gates: cargo check → bun test → bunx lint → run-n8n smoke in dep order |
| **Docs-Scribe** | `_workspace/pillars/docs-scribe/docs-scribe-n8n.md` | `meta-doc-sync.n8n.json` | Changelog/ADR/AGENTS.md sync across all 51 meta repos; ADR generation for architecture decisions |

### How pillars wire into the loop

```
Cycle start → Backlog-Curator DISCOVER (agent + n8n workflow)
    ↓ picks next item
design (spec-driven-development agent) → implement
    ↓
Feature-Architect blast-radius analysis (agent + n8n workflow)
    ↓ determines execution order
Verification-Gate gates in topo order (agent + n8n workflow)
    ↓ all pass?
Docs-Scribe syncs documentation across repos (agent + n8n workflow)
    ↓
tick item → commit → re-fire or handoff
```

The n8n workflows automate the scanning/computation-heavy parts; agents handle orchestration decisions. This hybrid model lets meta be mapped and automated by n8n — the platform that builds itself becomes the automation engine for everything inside it.
1. **`_workspace/HANDOFF.md` exists, or the prompt says "resume"** → **RESUME**: follow
   `n8n:session-relay` RESUME (read committed HANDOFF, run Verify-on-resume baseline, ack via weave,
   reset `cycles_this_session=0`), then run the iteration body from the backlog's current item.
2. **No `backlog.md`** → **DISCOVER** (below), seed `backlog.md` + `loop_state.md`, then start.
3. **`backlog.md` exists + user asks for a partial change** (e.g. "redo item B-2", "add an epic") →
   edit the backlog accordingly, then continue the loop.

## DISCOVER (build the backlog from real state — don't hallucinate)
Seed `backlog.md` from actual sources, in priority order:
- Open Linear tickets / GitHub issues referenced by the user.
- `spec-driven-development` specs under `.claude/specs/` not yet implemented.
- Explicit roadmap/epics the user handed in.
- The existing `_workspace/` state (a prior loop's open items).
Group into epics; keep each item to one Engine capability / one component / one workflow.

## One iteration (the loop body)
1. **Read state.** `_workspace/backlog.md` + `_workspace/loop_state.md`. Confirm `git status` is
   clean and you're on the loop branch.
2. **Stop checks (in order):**
   - No `- [ ]` items left → **DONE**: write `_workspace/DONE` with evidence (see DONE criteria),
     report, do not re-fire.
   - `cycles_this_session >= cycle_budget` → **HAND OFF**: invoke `n8n:session-relay` HAND OFF and
     stop (no re-fire). This is the cycle-budget trigger.
   - A human wall (sudo / interactive auth / a missing API key or token / a product decision the loop
     can't make) → write `_workspace/NEEDS-HUMAN` with the reason and stop. Don't spin or force.
3. **Pick** the top unchecked item (respect dependency order; an epic's items run in sequence).
4. **Do the slice the declared way:**
   - **Design** — `n8n:spec-driven-development` to design/refresh the slice's spec (skip for trivial
     items). For n8n-workflow-building epics, use `n8n:workflow-ops` + the n8n MCP server to ground
     nodes and author/validate before deploying.
   - **Implement** — make the change. For n8n *source* edits, hand to the `n8n:developer` agent; for
     *workflow* build/deploy, use `n8n:workflow-ops` / `n8n:workflow-engineer`. Destructive or
     outward-facing steps (deploy to a shared instance, push, open a PR) are **fail-closed**:
     dry-run/plan first, and only *act* when `apply_mode` is on (see APPLY).
5. **VERIFY across the boundary** (not existence-only — re-run the real check in a fresh shell):
   - Scoped build: `pnpm -F <touched-package> build` (never a full monorepo build per cycle — too
     slow to loop on). Redirect to a log; inspect the tail.
   - Affected tests: the touched package's `pnpm test` (or `pnpm test:affected`).
   - Lint per repo convention (biome/eslint) on the touched package.
   - For any runtime-affecting change: the **run-n8n smoke** via the n8n MCP server — n8n up and
     `/healthz` 200, smoke test green (`n8n:run-n8n` → `scripts/smoke-test.mjs`).
   - Optionally `n8n:mutant-score` on a changed test file to confirm the tests actually assert.
   If a gate fails and you can't route around it this cycle, mark the item `- [!] blocked: <reason>`
   and move on — don't thrash on one item.
6. **Write state back & commit:** tick the item (`- [x]`/`- [!]`), bump `cycles_this_session` and
   `cycles_total`, update `last_item`/`status`, append a one-line progress note. **Commit** the
   ledger + the slice with an area-prefixed subject (e.g. `feat(core): …`, `chore(harness): …`),
   referencing the backlog item id (and any `[[tasks/…]]` wikilink). A fresh process must be able to
   resume from committed state alone.
7. **Re-fire** to continue (see Self-pacing).

## Self-pacing (how the loop re-fires)
- Default: **dynamic** — `ScheduleWakeup` to re-enter this skill for the next iteration, passing the
  same `/n8n-loop …` prompt verbatim. Pick the delay by what you're waiting on: back-to-back build
  cycles → short warm-cache delay (≤270s); waiting on a slow external step (CI, a long build) → a
  longer delay. When you HAND OFF or finish, **omit** the wakeup to end the loop.
- A cycle counts only when work **completes** (item done/blocked) — a re-fire that only waits does
  not increment the ledger.

## Cycle budget (the handoff trigger)
Per-session budget is **cycles-only** (no token-meter guessing): default **3** completed cycles per
session unless the user overrides (`/n8n-loop budget=N …`). Record it in `loop_state.md`. When
`cycles_this_session` reaches it, do **not** start another cycle — invoke `n8n:session-relay`, which
checkpoints + announces + schedules the successor, then stop. The successor resets the per-session
counter and continues where the backlog left off. Short sessions by construction, not by measurement.

## APPLY vs SAFE (the opt-in for outward/destructive action)
**Safe by default.** Unattended *apply* is a deliberate opt-in (`apply_mode` in `loop_state.md`,
set by `N8N_APPLY=1` for the external runner). In SAFE mode the loop does everything reversible —
design, implement in the working tree, build/test/lint, dry-run validations — but **refuses** the
irreversible/outward steps: `git push`, opening PRs (`n8n:create-pr`), and deploying to a shared n8n.
In APPLY mode those are permitted. Never weaken a guard to make a step pass; a human wall yields
`NEEDS-HUMAN`, not a forced action or a false green.

## DONE criteria (all pass → write `_workspace/DONE` with evidence)
- `pnpm build` clean for every touched package · affected `pnpm test` green · lint clean ·
- `n8n:run-n8n` smoke healthy (`/healthz` 200, smoke test exit 0) for any runtime-affecting change ·
- backlog fully `- [x]`/`- [!]` with every `- [!]` surfaced for a human.
Record the evidence (commit hashes, gate outputs) inside `_workspace/DONE`.

## Stop conditions (end the loop — no re-fire)
- Backlog complete → `DONE` summary. · Cycle budget reached → hand off, then stop. · Human wall →
  `NEEDS-HUMAN`. · A hard blocker the loop can't route around (dirty/ambiguous tree, repeated gate
  FAIL on the same item) → stop and report; don't burn cycles spinning. · The user interrupts.

## External self-restart (the `/new` effect)
For fully-unattended operation, `scripts/ralph-n8n.sh` spawns a fresh `claude -p "/n8n-loop resume …"`
process per iteration (clean context each time) until a terminal sentinel (`DONE`/`NEEDS-HUMAN`/
`STOP`). SAFE by default; `N8N_APPLY=1` opts into apply (adds `--dangerously-skip-permissions`);
`RALPH_MAX_ITERS` backstops; `touch _workspace/STOP` kills it. See the script header.

## Test Scenarios
**Happy path:** `/n8n-loop budget=3` on a seeded backlog. Cycles 1–3 each complete an item
(design→implement→verify green, committed), ticking items and incrementing the ledger. After cycle 3
the budget check trips → `n8n:session-relay` writes + commits HANDOFF, weave-announces, schedules a
one-shot successor, and this session stops. The successor resets the counter and continues at item 4.

**Error path:** cycle 2's item needs a deploy to a shared n8n but the loop is in SAFE mode. The loop
does the dry-run validation, marks the item `- [!] blocked: deploy needs APPLY (outward action)`,
commits the backlog update, and proceeds to item 3 rather than forcing. The blocked item surfaces in
the DONE/HANDOFF summary for a human decision.
