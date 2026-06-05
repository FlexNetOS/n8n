#!/usr/bin/env bash
# n8n-import-workflows — persist the harness's committed workflow JSONs into n8n's DB (~/.n8n).
#
# The n8n-loop deploys workflows live via MCP, but those live in whatever DB the running
# instance uses. This script imports the COMMITTED source-of-truth JSON
# (_workspace/wf/*.json + _workspace/viz/*.json) straight into ~/.n8n/database.sqlite via the
# n8n CLI, so a dockerized n8n that mounts ~/.n8n (see scripts/n8n-up.sh) comes up WITH them.
#
# n8n's `import:workflow` requires each workflow to have an `id`; the raw harness JSONs don't,
# so we inject a stable id (the deployed workflow id where known, else a name-derived slug) into
# a temp copy before importing. All workflows are imported INACTIVE.
#
# Run this with n8n NOT actively writing ~/.n8n (stop the source instance or run before n8n-up).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# stable id map for the four harness workflows (matches the live MCP deploy ids)
python3 - "$REPO" "$TMP" <<'PY'
import json, os, sys, hashlib
repo, tmp = sys.argv[1], sys.argv[2]
ids = {
  "claude-n8n-chat-bridge.json": "ggvV5wItgjsRnwFk",
  "01-build-spine.json":         "ghqgmnJnB8zMMmAN",
  "02-runtime-dataflow.json":    "baU04FGqVHA0pntk",
  "03-n8n-execution.json":       "7z11ihYBJ7soxaik",
}
srcs = [os.path.join(repo, "_workspace/wf/claude-n8n-chat-bridge.json"),
        os.path.join(repo, "_workspace/viz/01-build-spine.json"),
        os.path.join(repo, "_workspace/viz/02-runtime-dataflow.json"),
        os.path.join(repo, "_workspace/viz/03-n8n-execution.json")]
n = 0
for s in srcs:
    if not os.path.exists(s):
        print("skip (missing):", s); continue
    wf = json.load(open(s))
    base = os.path.basename(s)
    wf["id"] = wf.get("id") or ids.get(base) or hashlib.sha1(base.encode()).hexdigest()[:16]
    wf.setdefault("active", False)
    json.dump(wf, open(os.path.join(tmp, wf["id"] + ".json"), "w"), ensure_ascii=False)
    n += 1
    print(f"prepared {wf['id']}  <- {base}")
print(f"TOTAL {n}")
PY

echo "n8n-import-workflows: importing into ~/.n8n via the n8n CLI…"
( cd "$REPO/packages/cli/bin" && ./n8n import:workflow --separate --input="$TMP/" )
echo "n8n-import-workflows: done. Verify with:  ( cd packages/cli/bin && ./n8n list:workflow )"
