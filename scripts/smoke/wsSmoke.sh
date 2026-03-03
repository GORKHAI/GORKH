#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SMOKE_ENV_FILE="${SMOKE_ENV_FILE:-/tmp/ai-operator-smoke.env}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/ai-operator-smoke.cookies.txt}"
TOKEN_PATH="${TOKEN_PATH:-/tmp/ai-operator-smoke.device_token}"
API_BASE="${API_BASE:-http://localhost:3001}"
DEVICE_ID_VALUE="${DEVICE_ID_VALUE:-smoke-device-$(date +%s)}"
MOCK_LOG="${MOCK_LOG:-/tmp/ai-operator-mock-device.log}"
MOCK_PID_FILE="${MOCK_PID_FILE:-/tmp/ai-operator-mock-device.pid}"

cleanup_mock() {
  if [[ -f "$MOCK_PID_FILE" ]]; then
    local pid
    pid="$(cat "$MOCK_PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" >/dev/null 2>&1; then
      kill "$pid" >/dev/null 2>&1 || true
      wait "$pid" 2>/dev/null || true
    fi
    rm -f "$MOCK_PID_FILE"
  fi
}

start_mock() {
  local log_path="$1"
  shift
  cleanup_mock
  rm -f "$log_path"
  (
    cd "$ROOT_DIR"
    env DEVICE_ID="$DEVICE_ID_VALUE" "$@" node scripts/smoke/mockDevice.js >"$log_path" 2>&1 &
    echo $! >"$MOCK_PID_FILE"
  )
}

wait_for_log_line() {
  local pattern="$1"
  local log_path="$2"
  local timeout_seconds="${3:-30}"
  local started_at
  started_at="$(date +%s)"
  while true; do
    if [[ -f "$log_path" ]] && grep -a -q "$pattern" "$log_path"; then
      return 0
    fi
    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      echo "Timed out waiting for $pattern in $log_path" >&2
      [[ -f "$log_path" ]] && cat "$log_path" >&2
      return 1
    fi
    sleep 1
  done
}

wait_for_run_status() {
  local run_id="$1"
  local expected_status="$2"
  local timeout_seconds="${3:-30}"
  local started_at
  started_at="$(date +%s)"
  while true; do
    local payload
    payload="$(curl -fsS -b "$COOKIE_JAR" "$API_BASE/runs/$run_id")"
    local status
    status="$(printf '%s' "$payload" | node -pe "JSON.parse(require('fs').readFileSync(0, 'utf8')).run.status")"
    if [[ "$status" == "$expected_status" ]]; then
      return 0
    fi
    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      echo "Timed out waiting for run $run_id to reach $expected_status (last status: $status)" >&2
      printf '%s\n' "$payload" >&2
      return 1
    fi
    sleep 1
  done
}

wait_for_tools() {
  local run_id="$1"
  local timeout_seconds="${3:-30}"
  local started_at
  started_at="$(date +%s)"
  while true; do
    local payload
    payload="$(curl -fsS -b "$COOKIE_JAR" "$API_BASE/runs/$run_id/tools")"
    local count
    count="$(printf '%s' "$payload" | node -pe "JSON.parse(require('fs').readFileSync(0, 'utf8')).tools.length")"
    if [[ "$count" != "0" ]]; then
      printf '%s\n' "$payload"
      return 0
    fi
    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      echo "Timed out waiting for tool events on run $run_id" >&2
      printf '%s\n' "$payload" >&2
      return 1
    fi
    sleep 1
  done
}

wait_for_action_status() {
  local action_id="$1"
  local expected_status="$2"
  local timeout_seconds="${3:-30}"
  local started_at
  started_at="$(date +%s)"
  while true; do
    local payload
    payload="$(curl -fsS -b "$COOKIE_JAR" "$API_BASE/devices/$DEVICE_ID_VALUE/actions")"
    local status
    status="$(printf '%s' "$payload" | node -pe "const actions = JSON.parse(require('fs').readFileSync(0, 'utf8')).actions; const action = actions.find((entry) => entry.actionId === '$action_id'); action ? action.status : ''")"
    if [[ "$status" == "$expected_status" ]]; then
      return 0
    fi
    if (( "$(date +%s)" - started_at >= timeout_seconds )); then
      echo "Timed out waiting for action $action_id to reach $expected_status (last status: $status)" >&2
      printf '%s\n' "$payload" >&2
      return 1
    fi
    sleep 1
  done
}

if [[ ! -f "$SMOKE_ENV_FILE" ]]; then
  bash "$ROOT_DIR/scripts/smoke/httpSmoke.sh"
fi

# shellcheck disable=SC1090
source "$SMOKE_ENV_FILE"

rm -f "$TOKEN_PATH"

start_mock "$MOCK_LOG"
wait_for_log_line '^PAIRING_CODE=' "$MOCK_LOG" 30

PAIRING_CODE="$(grep -a '^PAIRING_CODE=' "$MOCK_LOG" | tail -n 1 | cut -d= -f2)"

curl -fsS -b "$COOKIE_JAR" \
  -X POST "$API_BASE/devices/$DEVICE_ID_VALUE/pair" \
  -H 'Content-Type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{\"pairingCode\":\"$PAIRING_CODE\"}" >/tmp/ai-operator-ws-pair.json

if [[ ! -s "$TOKEN_PATH" ]]; then
  echo "Device token was not captured after pairing" >&2
  exit 1
fi

DEVICE_TOKEN_VALUE="$(cat "$TOKEN_PATH")"
echo "PAIRING_FLOW=OK"

start_mock "$MOCK_LOG" DEVICE_TOKEN="$DEVICE_TOKEN_VALUE"
wait_for_log_line 'WS_RX=server.hello_ack' "$MOCK_LOG" 15
if grep -a -q '^PAIRING_CODE=' "$MOCK_LOG"; then
  echo "Reconnect unexpectedly requested a new pairing code" >&2
  cat "$MOCK_LOG" >&2
  exit 1
fi
echo "RECONNECT_FLOW=OK"

curl -fsS -b "$COOKIE_JAR" \
  -X POST "$API_BASE/runs" \
  -H 'Content-Type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{\"deviceId\":\"$DEVICE_ID_VALUE\",\"goal\":\"Manual smoke run\",\"mode\":\"manual\"}" \
  >/tmp/ai-operator-ws-manual-run.json

MANUAL_RUN_ID="$(node -pe "JSON.parse(require('fs').readFileSync('/tmp/ai-operator-ws-manual-run.json', 'utf8')).run.runId")"
wait_for_run_status "$MANUAL_RUN_ID" done 30
echo "MANUAL_RUN=OK"

curl -fsS -b "$COOKIE_JAR" \
  -X POST "$API_BASE/runs" \
  -H 'Content-Type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{\"deviceId\":\"$DEVICE_ID_VALUE\",\"goal\":\"AI assist smoke run\",\"mode\":\"ai_assist\"}" \
  >/tmp/ai-operator-ws-ai-run.json

AI_RUN_ID="$(node -pe "JSON.parse(require('fs').readFileSync('/tmp/ai-operator-ws-ai-run.json', 'utf8')).run.runId")"
wait_for_run_status "$AI_RUN_ID" done 30
AI_PROPOSAL_KIND="$(curl -fsS -b "$COOKIE_JAR" "$API_BASE/runs/$AI_RUN_ID" | node -pe "JSON.parse(require('fs').readFileSync(0, 'utf8')).run.latestProposal.kind")"
if [[ "$AI_PROPOSAL_KIND" != "ask_user" ]]; then
  echo "Expected AI proposal kind ask_user, got $AI_PROPOSAL_KIND" >&2
  exit 1
fi
echo "AI_ASSIST=OK"

curl -fsS -b "$COOKIE_JAR" \
  -X POST "$API_BASE/devices/$DEVICE_ID_VALUE/actions" \
  -H 'Content-Type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d '{"action":{"kind":"click","x":0.5,"y":0.5,"button":"left"}}' \
  >/tmp/ai-operator-ws-action.json

ACTION_ID="$(node -pe "JSON.parse(require('fs').readFileSync('/tmp/ai-operator-ws-action.json', 'utf8')).actionId")"
wait_for_action_status "$ACTION_ID" executed 30
echo "CONTROL_FLOW=OK"

start_mock "$MOCK_LOG" DEVICE_TOKEN="$DEVICE_TOKEN_VALUE" SEND_SCREEN=1
wait_for_log_line 'WS_RX=server.screen.ack' "$MOCK_LOG" 15
curl -fsS -b "$COOKIE_JAR" "$API_BASE/devices/$DEVICE_ID_VALUE/screen/meta" >/tmp/ai-operator-ws-screen-meta.json
curl -fsS -o /tmp/ai-operator-ws-screen.bin -D /tmp/ai-operator-ws-screen.headers \
  -b "$COOKIE_JAR" "$API_BASE/devices/$DEVICE_ID_VALUE/screen.png" >/dev/null
grep -ai '^content-type: image/png' /tmp/ai-operator-ws-screen.headers >/dev/null
SCREEN_BYTES="$(wc -c < /tmp/ai-operator-ws-screen.bin | tr -d ' ')"
if [[ "$SCREEN_BYTES" == "0" ]]; then
  echo "Screen endpoint returned no bytes" >&2
  exit 1
fi
echo "SCREEN_FLOW=OK"

start_mock "$MOCK_LOG" DEVICE_TOKEN="$DEVICE_TOKEN_VALUE" SEND_TOOL=1
wait_for_log_line 'WS_RX=server.hello_ack' "$MOCK_LOG" 15
curl -fsS -b "$COOKIE_JAR" \
  -X POST "$API_BASE/runs" \
  -H 'Content-Type: application/json' \
  -H "x-csrf-token: $CSRF_TOKEN" \
  -d "{\"deviceId\":\"$DEVICE_ID_VALUE\",\"goal\":\"AI assist tool smoke run\",\"mode\":\"ai_assist\"}" \
  >/tmp/ai-operator-ws-tool-run.json

TOOL_RUN_ID="$(node -pe "JSON.parse(require('fs').readFileSync('/tmp/ai-operator-ws-tool-run.json', 'utf8')).run.runId")"
wait_for_tools "$TOOL_RUN_ID" 30 >/tmp/ai-operator-ws-tools.json
echo "TOOL_FLOW=OK"

node "$ROOT_DIR/scripts/smoke/sseProbe.js" >/tmp/ai-operator-ws-sse.txt
grep -q 'SSE_OK=1' /tmp/ai-operator-ws-sse.txt
echo "SSE_FLOW=OK"

TEST_DEVICE_ID="$DEVICE_ID_VALUE" node "$ROOT_DIR/scripts/smoke/dbCheck.js" >/tmp/ai-operator-ws-dbcheck.txt
grep -q 'device.claimed' /tmp/ai-operator-ws-dbcheck.txt
grep -q 'control.requested' /tmp/ai-operator-ws-dbcheck.txt
grep -q 'tool.executed' /tmp/ai-operator-ws-dbcheck.txt
echo "DB_AUDIT=OK"

cleanup_mock
