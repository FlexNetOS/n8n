# n8n-loop Harness Upgrade — Reference

The n8n harness is an **autonomous, resumable Ralph loop** that maps and automates everything inside the meta workspace (51 repos, Rust/JS toolchains, Linear/GitHub). It uses n8n workflows as its automation engine.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                     n8n-loop Harness                      │
├──────────────────────────────────────────────────────────┤
│  Agent Layer (orchestration decisions):                  │
│  ├── backlog-curators (DISCOVER)                         │
│  ├── feature-architect (blast radius + topo order)       │
│  ├── verification-gate (multi-toolchain QA gates)        │
│  └── docs-scribe (changelog/ADR/AGENTS.md sync)          │
├──────────────────────────────────────────────────────────┤
│  n8n Workflow Layer (automated execution):                │
│  ├── meta-discovery.n8n.json (scanning + prioritization) │
│  ├── blast-radius-analyzer.n8n.json (dependency graph)   │
│  ├── multi-toolchain-verify.n8n.json (gate orchestration)│
│  ├── meta-doc-sync.n8n.json (doc target identification)  │
│  ├── resume-handoff.n8n.json (DataTable ledger ops)      │
│  └── successor-schedule.n8n.json (cron → agent spawn)    │
├──────────────────────────────────────────────────────────┤
│  Durable State (disk + DataTable):                        │
│  ├── _workspace/HANDOFF.md     (human-readable checkpoint)│
│  ├── _workspace/backlog.md       (prioritized checklist)  │
│  ├── _workspace/loop_state.md    (ledger)                 │
│  └── handoff_packets DataTable (machine-readable ledger)   │
├──────────────────────────────────────────────────────────┤
│  Handoff / Session Relay:                                  │
│  ├── continuity-steward agent  (checkpoint producer)      │
│  ├── session-relay skill       (handoff orchestrator)     │
│  └── JSON schemas (packet, session, task — validated)    │
├──────────────────────────────────────────────────────────┤
│  Runner:                                                    │
│  └── ralph-n8n.sh              (external unattended loop) │
└──────────────────────────────────────────────────────────┘
```

## Quick Start

```bash
# In-session autonomous loop:
/n8n-loop                         # start, budget=3
/n8n-loop budget=1                # one cycle then hand off
/n8n-loop resume from _workspace/HANDOFF.md   # after handoff

# Unattended (fresh process per cycle):
bash .claude/plugins/n8n/skills/n8n-loop/scripts/ralph-n8n.sh          # SAFE mode
N8N_APPLY=1 bash .../ralph-n8n.sh    # APPLY: may push/PR/deploy

touch _workspace/STOP   # kill switch
```

## Pillars

| Pillar | Agent | n8n Workflow | Purpose |
|--------|-------|-------------|---------|
| Backlog-Curator | `backlog-curators.md` | `meta-discovery.n8n.json` | Discover work from meta workspace sources |
| Feature-Architect | `feature-architect-n8n.md` | `blast-radius-analyzer.n8n.json` | Blast radius + topo-sorted execution order |
| Verification-Gate | `verification-gate-n8n.md` | `multi-toolchain-verify.n8n.json` | Multi-toolchain gates (cargo/bun/lint/smoke) |
| Docs-Scribe | `docs-scribe-n8n.md` | `meta-doc-sync.n8n.json` | Changelog/ADR/AGENTS.md sync across repos |

## Handoff Resumes

```bash
# Read checkpoint:
cat _workspace/HANDOFF.md

# DataTable-backed resume (authoritative):
# Query handoff_packets DataTable via n8n MCP server or CLI
```

## Bun Migration

All harness tooling uses bun. The n8n repo itself stays on pnpm/node for CI/build. See `BUN-MIGRATION.md` for details.

## File Layout

```
n8n/
├── _workspace/
│   ├── handoff/                    ← handoff schemas, configs, utilities
│   │   ├── schemas/                ← JSON schemas (packet, session, task, backlog-item)
│   │   ├── templates/.handoff/     ← hooks, policies, skills from sessions-handoff
│   │   ├── examples/               ← reference output
│   │   ├── scripts/                ← ledger.sh + harness-integration.sh
│   │   ├── bun-config.json         ← pnpm→bun mappings
│   │   ├── schema-datatable.md     ← DataTable table definitions
│   │   └── BUN-MIGRATION.md        ← toolchain migration notes
│   ├── pillars/                    ← pillar agent specs + n8n workflows
│   │   ├── backlog-curator/
│   │   ├── feature-architect/
│   │   ├── verification-gate/
│   │   └── docs-scribe/
│   ├── BACKLOG.md                  ← source of truth (ordered checklist)
│   ├── loop_state.md               ← ledger
│   └── HANDOFF.md                  ← human-readable checkpoint
├── .claude/plugins/n8n/skills/
│   ├── n8n-loop/SKILL.md           ← main orchestrator (updated for pillars)
│   ├── session-relay/SKILL.md      ← handoff orchestration (updated for DataTables)
│   ├── backlog-curator/SKILL.md    ← trigger phrase → skill
│   ├── feature-architect/SKILL.md
│   ├── verification-gate/SKILL.md
│   └── docs-scribe/SKILL.md
├── .claude/plugins/n8n/agents/
│   └── continuity-steward.md       ← checkpoint producer (updated for DataTables)
└── CLAUDE.md                       ← harness upgrade history
```

## Validation

Validate a handoff packet against schema:
```bash
bun run - /workspace/handoff/schemas/packet-n8n.schema.json <your-packet.json> <<'EOF'
// ajv validation script
const Ajv = require('ajv');
const ajv = new Ajv();
const schema = JSON.parse(require('fs').readFileSync(process.argv[2], 'utf8'));
const validate = ajv.compile(schema);
const valid = validate(JSON.parse(require('fs').readFileSync(process.argv[3], 'utf8')));
console.log(valid ? 'VALID' : 'INVALID');
process.exit(valid ? 0 : 1);
EOF
