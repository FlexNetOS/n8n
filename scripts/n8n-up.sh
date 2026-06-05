#!/usr/bin/env bash
# n8n-up — boot the dockerized n8n on :5678 (the docker-migration target).
#
# Replaces any source (`node ./n8n`) instance holding the port, and mounts your
# EXISTING ~/.n8n so your workflows/credentials carry over (shared SQLite DB —
# back up ~/.n8n first if the docker image's n8n version differs a lot). Idempotent.
#
# Env overrides: N8N_IMAGE (default n8nio/n8n:local), N8N_CONTAINER (n8n),
#                N8N_PORT (5678), N8N_DATA (~/.n8n).
set -euo pipefail
IMAGE="${N8N_IMAGE:-n8nio/n8n:local}"
NAME="${N8N_CONTAINER:-n8n}"
PORT="${N8N_PORT:-5678}"
DATA="${N8N_DATA:-$HOME/.n8n}"

command -v docker >/dev/null || { echo "n8n-up: docker not found on PATH" >&2; exit 1; }

if ! docker image inspect "$IMAGE" >/dev/null 2>&1; then
  echo "n8n-up: image '$IMAGE' isn't built yet. Build it once, then re-run n8n-up:" >&2
  echo "    ( cd ~/Desktop/meta/n8n && pnpm build:docker )" >&2
  exit 1
fi

if docker ps --format '{{.Names}}' | grep -qx "$NAME"; then
  echo "n8n already running in docker ('$NAME') → http://localhost:$PORT"
  exit 0
fi

# Free the port: stop a non-docker (source `node ./n8n`) instance bound to it.
pid="$(ss -ltnHp 2>/dev/null | awk -v p=":$PORT" 'index($4, p) {print}' \
        | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
if [ -n "${pid:-}" ]; then
  echo "n8n-up: stopping source n8n on :$PORT (pid $pid) so docker can bind it…"
  kill "$pid" 2>/dev/null || true
  for _ in $(seq 1 10); do
    ss -ltnH 2>/dev/null | grep -q ":$PORT " || break
    sleep 1
  done
fi

docker rm -f "$NAME" >/dev/null 2>&1 || true
mkdir -p "$DATA"
echo "n8n-up: booting $IMAGE  (data: $DATA)…"
docker run -d --name "$NAME" -p "$PORT:5678" \
  -v "$DATA:/home/node/.n8n" \
  -e GENERIC_TIMEZONE="${TZ:-UTC}" -e TZ="${TZ:-UTC}" \
  "$IMAGE" >/dev/null

for _ in $(seq 1 30); do
  if curl -fsS -m2 "http://localhost:$PORT/healthz" >/dev/null 2>&1; then
    echo "n8n up → http://localhost:$PORT   (https://n8n.test once 'lane up' is applied)"
    exit 0
  fi
  sleep 1
done
echo "n8n-up: container started but /healthz not ready — check: docker logs $NAME" >&2
exit 1
