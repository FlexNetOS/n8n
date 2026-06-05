#!/usr/bin/env bash
# n8n-down — stop + remove the dockerized n8n container (the n8n-up counterpart).
# Your data in ~/.n8n is untouched. Env: N8N_CONTAINER (default n8n).
set -euo pipefail
NAME="${N8N_CONTAINER:-n8n}"
if docker rm -f "$NAME" >/dev/null 2>&1; then
  echo "n8n-down: container '$NAME' stopped + removed (data in ~/.n8n kept)"
else
  echo "n8n-down: no '$NAME' container running"
fi
