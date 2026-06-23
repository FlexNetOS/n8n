#!/usr/bin/env bash
# Resolve the meta workspace root without baking in a machine-local path.
set -euo pipefail

if [ "${META_ROOT:-}" ] && [ -f "$META_ROOT/.meta.yaml" ]; then
  printf '%s\n' "$META_ROOT"
  exit 0
fi

if command -v envctl >/dev/null 2>&1; then
  env_exports="$(envctl env 2>/dev/null || true)"
  if [ "$env_exports" ]; then
    eval "$env_exports"
    if [ "${META_ROOT:-}" ] && [ -f "$META_ROOT/.meta.yaml" ]; then
      printf '%s\n' "$META_ROOT"
      exit 0
    fi
  fi
fi

cat >&2 <<'EOF'
META_ROOT is not available.
Ask the envctl peer over weave for the meta environment. If it does not respond,
search ICM for the current envctl/meta root decision, then inspect envctl
(`envctl env`, docs, and source) instead of hard-coding a workstation path.
EOF
exit 1
