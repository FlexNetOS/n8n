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

## Next (Epic A)
- **A-2**: index each repo with code intelligence, record symbol counts + health → append here.
- **A-3**: extract automation surfaces (entrypoints, CLIs, schedulers, queues, webhooks, weave peers,
  MCP servers) → `_workspace/meta-codemap.md`.
- **A-4**: synthesize the cross-repo data-flow mermaid map → `_workspace/meta-dataflow.md`.
