---
name: session-relay
description: "Hand off the long-running n8n autonomous harness loop (`n8n-loop`) to a FRESH session before context rot / token burn degrade it, and resume from a handoff. ALWAYS use when: the loop's cycle budget is reached, the user says 'hand off', 'transfer the session', 'continue in a new session', 'pass the baton', or a session needs to 'resume from handoff' / 'pick up the loop' / 'resume the n8n loop'. Coordinates the transfer over weave (cross-identity heartbeat) and schedules a best-effort successor — the committed checkpoint is the real resume signal. Do NOT use for one-off features or normal in-session work."
---

# Session Relay (n8n-loop handoff + successor)

You carry the `n8n-loop` across session boundaries with **zero loss**. A single session degrades as
context grows (rot) and gets expensive (token burn); the loop's defense is to run as a chain of
short sessions, each handing a durable checkpoint to the next. This skill is that handoff — and the
resume on the other side. Two entry points: **HAND OFF** and **RESUME**.

## Substrates (verify before using)

- **DataTable ledger** (`handoff_packets` DataTable via `@n8n-nodes-langchain.n8nDataTable`) — the authoritative machine-readable state. Every row is validated against `_workspace/handoff/schemas/packet-n8n.schema.json`. This is n8n's implementation of the Rust-native `.handoff/ledger.db` concept from `sessions-handoff`. Always read/write here first; FALL BACK to HANDOFF.md file only if DataTable queries fail.
- **Checkpoint:** `_workspace/HANDOFF.md`, produced by the `n8n:continuity-steward` agent — the
  cold-start resume package (human-readable). Validated against the packet schema BEFORE use.
- **weave** (`weave_send`/`weave_whoami`/`weave_inbox`) — the **cross-identity** heartbeat + audit
  channel. **Verified gotcha:** a message addressed to your *own* identity does **not** appear in
  your own inbox, and a same-machine successor inherits the same identity — so weave-inbox is **not**
  the resume signal for a same-identity handoff. Use weave for what it does well: a broadcast
  `to: "all"` (`n8n-relay:handoff` / `n8n-relay:resumed`) as an *observable heartbeat* so the mesh
  and operators can watch the relay. The **actual resume signal is the committed checkpoint + the
  successor prompt**.
- **successor scheduling** — `CronCreate {recurring:false}` (best-effort; `durable:true` is *not*
  honored in this runtime — session-only) OR the external `scripts/ralph-n8n.sh` runner (a fresh
  `claude -p` process per cycle = survives-restart). For unattended cloud continuation, escalate to
  `RemoteTrigger`. The prompt itself must self-describe the resume.

---

## HAND OFF (current session, at cycle budget)

Run in order; each step is durable before the next, so a crash mid-handoff is recoverable.

1. **Produce the DataTable row.** Call `@n8n-nodes-langchain.n8nDataTable` (via MCP) with `insertRow` to write to `handoff_packets`. Use the packet fields defined by `_workspace/handoff/schemas/packet-n8n.schema.json` — include `packet_id`, `schema: handoff.packet.n8n.v1`, `active_objective`, `current_task_id`, `task_status`, `branch`, `changed_files` (JSON array), `drift_status`, `next_command`, `created_at` (UTC ISO). Set `archived=false`. If the DataTable write fails, fall back to HANDOFF.md only.
2. **Produce the checkpoint file.** Spawn the `n8n:continuity-steward` agent (general-purpose, opus),
   passing the current UTC timestamp (you supply it — agents/scripts can't read the clock), the repo
   path + branch, and the loop ledger. It writes `_workspace/HANDOFF.md` and returns
   `HANDOFF READY` / `HANDOFF INCOMPLETE`. If INCOMPLETE, fix the gap (or flag it) before
   continuing — never hand off a checkpoint you know is wrong.
2. **Commit it.** `git add _workspace/backlog.md _workspace/loop_state.md _workspace/HANDOFF.md &&
   git commit` (subject `chore(harness): n8n-loop handoff checkpoint @ <ts>`). The successor resumes
   from committed state, so the checkpoint must be in git, not just on disk. Push only if the loop is
   in APPLY mode and runs against a shared remote.
3. **Broadcast the heartbeat over weave.** `weave_send to:"all"` (cross-identity observers — do
   **not** address your own identity):
   - `subject`: `n8n-relay:handoff`
   - `body`: the `_workspace/HANDOFF.md` path, repo path + branch, the resume command, and the
     one-line backlog status (e.g. "epic-A 2/5, resume at A-3"). Pointer-sized; detail lives in the
     committed checkpoint. This is observation/audit, not the resume signal.
4. **Schedule the successor.** `CronCreate {recurring:false}` with a near-future one-shot time and a
   `prompt` that re-enters the loop in RESUME mode and **self-describes the resume**, e.g.:
   `"/n8n-loop resume from _workspace/HANDOFF.md (branch <branch>) — read the committed handoff
   checkpoint, run its Verify-on-resume baseline, then continue at the backlog's next item"`.
   One-shot avoids double-runs; the next handoff creates the next. **Caveat (verified):** `durable`
   is not honored here — cron fires only while this session stays alive. For survives-restart
   continuation, rely on the committed `HANDOFF.md` (a human, the `scripts/ralph-n8n.sh` runner, or
   `RemoteTrigger` resumes from it).
5. **Stop this session's loop.** Do **not** issue another `ScheduleWakeup`. Report: handed off after
   N cycles, checkpoint committed (hash), heartbeat broadcast, successor scheduled (best-effort),
   backlog at X/Y.

> If the user chose **handoff-only** (no auto-spawn): do steps 1–3 and skip 4 — a human or the
> external runner picks it up from the weave announce + committed checkpoint.

## RESUME (successor session, on start / cron fire / runner spawn)

1. **Read from DataTable first.** Query `handoff_packets` via `@n8n-nodes-langchain.n8nDataTable` for the latest unarchived row. Validate against `_workspace/handoff/schemas/packet-n8n.schema.json`. If the query returns no rows, FALL BACK to reading `_workspace/HANDOFF.md` directly.
2. **Load the checkpoint file.** Read `_workspace/HANDOFF.md` fully — cross-reference with the DataTable row. Verify the repo path + branch match and the tree is clean; run its **Verify-on-resume** commands to confirm a sane baseline before
   mutating anything.
3. **Acknowledge.** Broadcast `weave_send to:"all" subject:n8n-relay:resumed` —
   `RESUMED @ <ts>, baseline verified, continuing at item <id>` (visible heartbeat for the mesh).
4. **Reset the ledger.** In `_workspace/loop_state.md` set `cycles_this_session = 0` (the budget is
   per-session); keep `cycles_total`.
5. **Continue the loop.** Re-enter `n8n-loop`'s iteration body at the backlog's current item. The
   successor is now the active session and will itself hand off at the next budget.

---

## Error handling

- **Steward INCOMPLETE / contradictory state:** do not auto-spawn a successor onto a bad checkpoint.
  Commit the partial checkpoint with its gaps flagged, weave-announce `n8n-relay:handoff-degraded`,
  and stop for a human — a clean stop beats a confident-but-wrong resume.
- **weave unavailable** (`weave_doctor` fails): the committed `HANDOFF.md` is the fallback path of
  record — the successor resumes from the file alone. Note the missing channel in the handoff body
  and proceed; weave is coordination, not the payload.
- **Duplicate/again resume:** if a successor finds `cycles_this_session` already reset and the top
  item in progress with fresh commits, another session may have resumed — re-check the latest commit;
  if so, stand down rather than double-building.

## Test Scenarios

**Happy path:** `n8n-loop` hits the budget → spawn `n8n:continuity-steward` → `HANDOFF.md` written +
committed (`chore(harness): n8n-loop handoff checkpoint`) → `weave_send to:"all"
subject=n8n-relay:handoff` (heartbeat) → `CronCreate{recurring:false}` one-shot resume whose prompt
self-describes the resume → session stops. The successor (cron prompt, the ralph-n8n.sh runner, or a
human reading the committed `HANDOFF.md`) verifies baseline green, broadcasts `n8n-relay:resumed`,
resets the session counter, and continues at the next item.

**Error path:** steward returns `HANDOFF INCOMPLETE` (backlog says item A-3 done, but no commit
exists for it). Relay does NOT schedule a successor; it commits the checkpoint with the contradiction
flagged, sends `n8n-relay:handoff-degraded` to `all`, and stops for human review — preventing a
successor from re-doing or skipping A-3.
