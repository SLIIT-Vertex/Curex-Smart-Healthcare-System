#!/usr/bin/env bash
# Exercise doctor prescription cancel via API (same path as the UI).
# Usage:
#   export DOCTOR_EMAIL='you@example.com'
#   export DOCTOR_PASSWORD='your-password'
#   export API_URL='http://localhost:8080'   # optional
#   ./scripts/test-prescription-cancel.sh [prescription_id]
#
# If prescription_id is omitted, uses the first prescription returned for the doctor.

set -euo pipefail
API_URL="${API_URL:-http://localhost:8080}"
: "${DOCTOR_EMAIL:?Set DOCTOR_EMAIL}"
: "${DOCTOR_PASSWORD:?Set DOCTOR_PASSWORD}"

jq_ok() {
  command -v jq >/dev/null 2>&1 || {
    echo "This script requires jq." >&2
    exit 1
  }
}

jq_ok

LOGIN_JSON=$(curl -sS -X POST "${API_URL}/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":$(jq -n --arg e "$DOCTOR_EMAIL" '$e'),\"password\":$(jq -n --arg p "$DOCTOR_PASSWORD" '$p')}")

TOKEN=$(echo "$LOGIN_JSON" | jq -r '.accessToken // empty')
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then
  echo "Login failed:" >&2
  echo "$LOGIN_JSON" | jq . >&2
  exit 1
fi

USER_ID=$(echo "$LOGIN_JSON" | jq -r '.user.id')
ROLE=$(echo "$LOGIN_JSON" | jq -r '.user.role')
echo "Logged in as $DOCTOR_EMAIL (user id=$USER_ID, role=$ROLE)"

if [[ "$ROLE" != "DOCTOR" ]]; then
  echo "Warning: role is not DOCTOR; doctor endpoints may fail." >&2
fi

DOC_JSON=$(curl -sS "${API_URL}/api/doctors/by-user/${USER_ID}" \
  -H "Authorization: Bearer ${TOKEN}")
DOC_ID=$(echo "$DOC_JSON" | jq -r '.id // empty')
if [[ -z "$DOC_ID" || "$DOC_ID" == "null" ]]; then
  echo "Could not resolve doctor profile:" >&2
  echo "$DOC_JSON" | jq . >&2
  exit 1
fi
echo "Doctor id=$DOC_ID"

RX_JSON=$(curl -sS "${API_URL}/api/prescriptions/doctor/${DOC_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

RX_ID="${1:-}"
if [[ -z "$RX_ID" ]]; then
  RX_ID=$(echo "$RX_JSON" | jq -r '.[0].id // empty')
fi
if [[ -z "$RX_ID" || "$RX_ID" == "null" ]]; then
  echo "No prescription id. Doctor list response:" >&2
  echo "$RX_JSON" | jq . >&2
  exit 1
fi

echo "PATCH cancel status for prescription id=$RX_ID"
TMP=$(mktemp)
HTTP_CODE=$(curl -sS -o "$TMP" -w "%{http_code}" -X PATCH "${API_URL}/api/prescriptions/${RX_ID}/status" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H 'Content-Type: application/json' \
  -d '{"status":"CANCELLED"}')
HTTP_BODY=$(cat "$TMP")
rm -f "$TMP"
echo "HTTP $HTTP_CODE"
echo "$HTTP_BODY" | jq . 2>/dev/null || echo "$HTTP_BODY"

if [[ "$HTTP_CODE" != "200" ]]; then
  exit 1
fi
