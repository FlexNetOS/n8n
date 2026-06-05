<!-- markdownlint-disable -->
# Meta workspace inventory

> Backlog item **A-1** (`n8n-loop`, Epic A — map the entire meta codebase).
> Source of truth: `~/Desktop/meta/.meta.yaml`. Generated 2026-06-05.
> Columns: **name** · **path** (relative to `~/Desktop/meta/`; default = name) · **remote**
> (all `git@github.com:FlexNetOS/<name>.git` unless noted) · **language** (best-effort marker-file
> detect: `Cargo.toml`→Rust, `package.json`→JS/TS, `pyproject.toml`/`setup.py`→Python, `—`=docs/data) ·
> **nested** (`meta:true` = has its own `.meta.yaml`) · **tags / deps** (from config).
> All 51 projects are cloned and are independent git repos (meta-repo, NOT a monorepo).

## Foundation crates (no workspace deps)
| name | path | language | remote | provides / deps |
|------|------|----------|--------|-----------------|
| loop_lib | loop_lib | Rust | FlexNetOS/loop_lib | provides: loop-lib |
| meta_plugin_protocol | meta_plugin_protocol | Rust | FlexNetOS/meta_plugin_protocol | provides: plugin-protocol |
| meta_plugin_api | meta_plugin_api | Rust | FlexNetOS/meta_plugin_api | provides: plugin-api |
| meta_core | meta_core | Rust | FlexNetOS/meta_core | provides: meta-core |
| meta_git_lib | meta_git_lib | Rust | FlexNetOS/meta_git_lib | provides: meta-git-lib |

## Mid-level crates
| name | path | language | remote | provides / deps |
|------|------|----------|--------|-----------------|
| loop_cli | loop_cli | Rust | FlexNetOS/loop_cli | deps: loop-lib |
| meta_cli | meta_cli | Rust | FlexNetOS/meta_cli | provides: meta-cli · deps: meta-core, plugin-protocol, loop-lib |

## Top-level crates (depend on meta_cli and/or plugins)
| name | path | language | remote | deps |
|------|------|----------|--------|------|
| meta_git_cli | meta_git_cli | Rust | FlexNetOS/meta_git_cli | plugin-protocol, meta-git-lib, meta-cli, loop-lib |
| meta_project_cli | meta_project_cli | Rust | FlexNetOS/meta_project_cli | plugin-protocol, meta-cli, meta-git-lib |
| meta_rust_cli | meta_rust_cli | Rust | FlexNetOS/meta_rust_cli | plugin-protocol, meta-cli |
| meta_mcp | meta_mcp | Rust | FlexNetOS/meta_mcp | meta-cli |

## Standalone tools
| name | path | language | remote | tags |
|------|------|----------|--------|------|
| agent | agent | Rust | FlexNetOS/agent | — |
| envctl | envctl | Rust | FlexNetOS/envctl | tools, env |

## Non-code repos
| name | path | language | remote | notes |
|------|------|----------|--------|-------|
| claude-plugins | claude-plugins | — | FlexNetOS/claude-plugins | — |
| meta-plugins | meta-plugins | — | FlexNetOS/meta-plugins | — |
| github_org | **.github_org** | — | FlexNetOS/.github | org defaults; path override to avoid colliding with meta root's `.github/`; tags: org, ci |

## FlexNetOS workspace peers (grounded from the `.github` umbrella refactor)
> Content placement is PROVISIONAL per `.meta.yaml` (repos grounded first, content moved later).
> `[untriaged]` tags still need classification — see `tasks/github-meta-refactor`.

### Extracted operational concerns (new repos; content TBD)
| name | language | remote | tags |
|------|----------|--------|------|
| flexnetos_secrets | — | FlexNetOS/flexnetos_secrets | ops, secrets |
| flexnetos_runner | — | FlexNetOS/flexnetos_runner | ops, runner |
| flexnetos_github_app | — | FlexNetOS/flexnetos_github_app | ops, github-app |
| flexnetos_wiki | — | FlexNetOS/flexnetos_wiki | docs |
| flexnetos_brain | — | FlexNetOS/flexnetos_brain | docs, data |

### AI / agent tooling (forks + hubs)
| name | language | remote | tags |
|------|----------|--------|------|
| claude-code | — (npm dist) | FlexNetOS/claude-code | ai, forked |
| codex | JS/TS | FlexNetOS/codex | ai, forked |
| oh-my-claudecode | JS/TS | FlexNetOS/oh-my-claudecode | ai, forked |
| oh-my-pi | Rust + JS/TS | FlexNetOS/oh-my-pi | ai, forked |
| ECC | Python | FlexNetOS/ECC | ai, forked |
| Archon | JS/TS | FlexNetOS/Archon | ai, forked |
| prompt_hub | Rust | FlexNetOS/prompt_hub | ai, prompts |
| hermes-agent | Python | FlexNetOS/hermes-agent | ai, agents, untriaged |

### Tools / automation
| name | language | remote | tags |
|------|----------|--------|------|
| rtk-tokenkill | Rust | FlexNetOS/rtk-tokenkill | tools, forked |
| n8n | JS/TS | FlexNetOS/n8n | automation, forked (**this repo**) |
| weave | Rust | FlexNetOS/weave | mcp (the meta weave mesh) |
| lane | Rust | FlexNetOS/lane | untriaged |
| icm | Rust | FlexNetOS/icm | untriaged |
| grit | Rust | FlexNetOS/grit | untriaged |
| obscura | Rust | FlexNetOS/obscura | untriaged |

### Knowledge / distro
| name | language | remote | tags |
|------|----------|--------|------|
| obsidian-mind | — | FlexNetOS/obsidian-mind | docs, knowledge |
| lifeos | Rust + JS/TS | FlexNetOS/lifeos | untriaged |

### Hubs + collections (new repos; content TBD)
| name | language | remote | tags | nested |
|------|----------|--------|------|--------|
| template_hub | — | FlexNetOS/template_hub | hub, templates | |
| assets | — | FlexNetOS/assets | assets | |
| flow_hub | — | FlexNetOS/flow_hub | hub, flow | |
| harness_hub | — | FlexNetOS/harness_hub | hub, harness | |
| network_hub | — | FlexNetOS/network_hub | hub, network | |
| my-wiki | — | FlexNetOS/my-wiki | docs, wiki | |
| tool_hub | — | FlexNetOS/tool_hub | hub, tools | |
| database_hub | — | FlexNetOS/database_hub | hub, database | |
| **mcp_hub** | — | FlexNetOS/mcp_hub | hub, mcp | **meta:true** (hosts forked external MCP servers, e.g. n8n-mcp) |
| plugin_hub | — | FlexNetOS/plugin_hub | hub, plugins | |
| hooks_hub | — | FlexNetOS/hooks_hub | hub, hooks | |
| commands | — | FlexNetOS/commands | hub, commands | |
| vault_hub | — | FlexNetOS/vault_hub | hub, vault | |

## Summary
- **51 projects** in `.meta.yaml`, all present on disk as independent git repos.
- **Rust**: 21 (the meta CLI/plugin stack + agent, envctl, weave, rtk-tokenkill, prompt_hub, lane, icm, grit, obscura).
- **JS/TS**: 5 (codex, oh-my-claudecode, Archon, n8n; oh-my-pi + lifeos are Rust+JS/TS hybrids).
- **Python**: 2 (ECC, hermes-agent).
- **Docs/data/hub (no code marker)**: ~23 (community-health, hubs, knowledge repos — many content-TBD).
- **Nested meta repos** (`meta:true`): 1 — `mcp_hub`.
- **Path overrides**: 1 — `github_org` → `.github_org/`.
- **The meta CLI dependency spine**: foundation crates → `meta_cli` → plugin CLIs (`meta_git_cli`,
  `meta_project_cli`, `meta_rust_cli`) + `meta_mcp`, all via `meta_plugin_protocol`. See A-3/A-4 for
  the runtime data-flow map.

## Epic A progress
- ✅ **A-1**: this inventory (above).
- ✅ **A-2** (done 2026-06-05): code-intel index of all 51 repos — see the **A-2** table below.
- **A-3** (next): extract automation surfaces (entrypoints, CLIs, schedulers, queues, webhooks, weave
  peers, MCP servers) → `_workspace/meta-codemap.md`.
- **A-4**: synthesize the cross-repo data-flow mermaid map → `_workspace/meta-dataflow.md`.

## A-2 — Code-intelligence index (per repo)

> Backlog item **A-2**. Indexed all 51 repos with `git-kb code index` (v0.2.10) on 2026-06-05;
> health via `git-kb code doctor --json`. `symbols`/`files`/`edges`(call-graph edges)/`unresolved`
> (external/unresolved call sites — high for repos heavy on third-party deps). gitignore excludes
> `node_modules`/build dirs. All indexes returned rc 0.

| repo | symbols | files | call edges | unresolved | languages |
|------|--------:|------:|-----------:|-----------:|-----------|
| hermes-agent | 54,834 | 2,220 | 0 | 0 | python,typescript,javascript,ruby |
| codex | 48,670 | 2,780 | 140,149 | 233,434 | rust,python,typescript,c,javascript |
| n8n | 48,574 | 9,163 | 79,612 | 86,370 | typescript,python,javascript |
| oh-my-pi | 26,142 | 2,071 | 47,327 | 54,139 | typescript,rust,python,javascript |
| oh-my-claudecode | 6,748 | 773 | 12,042 | 20,755 | typescript,javascript,python |
| ECC | 4,677 | 372 | 15,436 | 45,936 | javascript,rust,python,typescript,swift |
| rtk-tokenkill | 3,909 | 107 | 7,150 | 23,373 | rust,python,typescript,ruby |
| Archon | 2,759 | 452 | 5,963 | 6,417 | typescript,javascript,ruby |
| prompt_hub | 2,018 | 101 | 2,812 | 8,079 | rust,python |
| obscura | 1,736 | 50 | 1,965 | 5,386 | javascript,rust |
| icm | 1,625 | 56 | 3,967 | 11,820 | rust,typescript,python |
| envctl | 1,342 | 72 | 3,130 | 6,365 | rust |
| lane | 812 | 50 | 1,479 | 3,766 | rust |
| vault_hub | 741 | 68 | 1,135 | 4,208 | rust,typescript,javascript,ruby |
| lifeos | 572 | 58 | 404 | 1,415 | rust,javascript,typescript |
| grit | 477 | 38 | 904 | 2,826 | rust,typescript,python |
| meta_cli | 432 | 11 | 560 | 4,008 | rust |
| weave | 382 | 13 | 814 | 2,421 | rust |
| meta_git_lib | 279 | 11 | 353 | 1,788 | rust |
| agent | 194 | 5 | 218 | 663 | rust |
| meta_git_cli | 186 | 23 | 196 | 2,188 | rust |
| claude-code | 182 | 21 | 396 | 1,315 | python,typescript |
| .github_org | 151 | 21 | 243 | 736 | javascript,python |
| obsidian-mind | 150 | 35 | 113 | 448 | typescript,javascript |
| meta_core | 102 | 5 | 184 | 772 | rust |
| meta_mcp | 72 | 1 | 119 | 1,016 | rust |
| loop_lib | 60 | 2 | 67 | 917 | rust |
| meta_project_cli | 55 | 2 | 74 | 700 | rust |
| meta_plugin_api | 21 | 1 | 5 | 21 | rust |
| meta_plugin_protocol | 16 | 1 | 8 | 53 | rust |
| meta_rust_cli | 12 | 2 | 7 | 130 | rust |
| template_hub | 4 | 2 | 22 | 54 | python |
| loop_cli | 2 | 1 | 0 | 23 | rust |
| flow_hub | 2 | 1 | 11 | 27 | python |
| harness_hub | 2 | 1 | 11 | 27 | python |
| network_hub | 2 | 1 | 11 | 27 | python |
| tool_hub | 2 | 1 | 11 | 27 | python |
| database_hub | 2 | 1 | 11 | 27 | python |
| mcp_hub | 2 | 1 | 13 | 26 | python |
| plugin_hub | 2 | 1 | 11 | 27 | python |
| hooks_hub | 2 | 1 | 11 | 27 | python |
| commands | 2 | 1 | 11 | 27 | python |
| **TOTAL (42 code repos)** | **207,954** | **18,597** | **326,955** | — | — |

**Empty / content-TBD repos** (0 symbols — docs/hub/new repos with no source yet): `claude-plugins`, `meta-plugins`, `flexnetos_secrets`, `flexnetos_runner`, `flexnetos_github_app`, `flexnetos_wiki`, `flexnetos_brain`, `assets`, `my-wiki`.

**Health notes:**
- **207,954 symbols** across **18,597 files** and **326,955 call-graph edges** in 42 repos.
- Largest graphs: `n8n` (48.6k sym), `hermes-agent` (54.8k), `codex` (48.7k), `oh-my-pi` (26.1k) — the forked AI tools dwarf the meta-CLI crates.
- `hermes-agent` shows 0 call edges despite 54.8k symbols — symbol extraction succeeded but call-graph resolution didn't (likely mixed-language / dynamic Python+TS); flag for A-3 if call data is needed there.
- The meta-CLI spine is compact and fully resolved: `meta_cli` 432, `meta_core` 102, `meta_git_lib` 279, plugin crates <200 each — small, tractable call graphs ideal for A-3 automation-surface extraction.
- 9 repos are empty (no source); 8 hub repos have a single stub file (~2 symbols) — content-TBD per `.meta.yaml`.
