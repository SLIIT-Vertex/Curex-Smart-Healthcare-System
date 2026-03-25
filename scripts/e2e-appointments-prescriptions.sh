#!/usr/bin/env bash
#
# End-to-end checks: all Appointment + Prescription HTTP endpoints via API Gateway.
# Prerequisites: stack running (e.g. make docker-up-bg), gateway on BASE_URL (default http://localhost:8080).
# Uses seed admin (admin@curex.com / Admin@Curex2024) to approve a freshly registered doctor.
#
# shellcheck disable=SC2312

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:8080}"
ADMIN_EMAIL="${E2E_ADMIN_EMAIL:-admin@curex.com}"
ADMIN_PASSWORD="${E2E_ADMIN_PASSWORD:-Admin@Curex2024}"

PASS=0
FAIL=0

pass() { echo "  OK  $1"; PASS=$((PASS + 1)); }
fail() { echo "  FAIL $1 (expected HTTP $2, got $3) body: $4"; FAIL=$((FAIL + 1)); }

# $1 name $2 expected http $3 actual http $4 body snippet
check_http() {
  local name="$1" exp="$2" got="$3" body="${4:-}"
  if [[ "$got" == "$exp" ]]; then
    pass "$name → HTTP $got"
  else
    fail "$name" "$exp" "$got" "$body"
  fi
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { echo "Missing command: $1"; exit 1; }
}

require_cmd curl
require_cmd python3

STAMP="$(date +%s)"
PATIENT_EMAIL="e2e.patient.${STAMP}@curex.test"
DOCTOR_EMAIL="e2e.doctor.${STAMP}@curex.test"
USER_PASSWORD='E2E_Test_Pass_1!'

echo "=============================================="
echo "Curex E2E — Appointments & Prescriptions"
echo "BASE_URL=$BASE_URL"
echo "STAMP=$STAMP"
echo "=============================================="

# --- Login admin ---
echo ""
echo "--- Auth: admin login ---"
ADMIN_RAW="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${ADMIN_EMAIL}\",\"password\":\"${ADMIN_PASSWORD}\"}")"
ADMIN_CODE="${ADMIN_RAW##*$'\n'}"
ADMIN_BODY="${ADMIN_RAW%$'\n'*}"
if [[ "$ADMIN_CODE" != "200" ]]; then
  echo "Admin login failed HTTP $ADMIN_CODE — is the stack up? $ADMIN_BODY"
  exit 1
fi
ADMIN_TOKEN="$(echo "$ADMIN_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")"
ADMIN_ID="$(echo "$ADMIN_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")"
check_http "POST /api/auth/login (admin)" "200" "$ADMIN_CODE" "$ADMIN_BODY"

# --- Register patient (auto-approved) ---
echo ""
echo "--- Register patient ---"
REG_P_RAW="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${PATIENT_EMAIL}\",
    \"password\": \"${USER_PASSWORD}\",
    \"firstName\": \"E2E\",
    \"lastName\": \"Patient\",
    \"phoneNumber\": \"+94111222${STAMP:(-3)}\",
    \"role\": \"PATIENT\"
  }")"
REG_P_CODE="${REG_P_RAW##*$'\n'}"
REG_P_BODY="${REG_P_RAW%$'\n'*}"
check_http "POST /api/auth/register (patient)" "200" "$REG_P_CODE" "$REG_P_BODY"
PATIENT_TOKEN="$(echo "$REG_P_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")"
PATIENT_ID="$(echo "$REG_P_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")"

# --- Register doctor (pending) ---
echo ""
echo "--- Register doctor ---"
REG_D_RAW="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${DOCTOR_EMAIL}\",
    \"password\": \"${USER_PASSWORD}\",
    \"firstName\": \"E2E\",
    \"lastName\": \"Doctor\",
    \"phoneNumber\": \"+94111333${STAMP:(-3)}\",
    \"role\": \"DOCTOR\",
    \"specialty\": \"General Practice\"
  }")"
REG_D_CODE="${REG_D_RAW##*$'\n'}"
REG_D_BODY="${REG_D_RAW%$'\n'*}"
check_http "POST /api/auth/register (doctor)" "200" "$REG_D_CODE" "$REG_D_BODY"
DOCTOR_USER_ID="$(echo "$REG_D_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['user']['id'])")"

# --- Admin approves doctor ---
echo ""
echo "--- Admin approves doctor ---"
APR_RAW="$(curl -sS -w "\n%{http_code}" -X PUT "${BASE_URL}/api/admin/users/${DOCTOR_USER_ID}/status" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "X-Admin-Id: ${ADMIN_ID}" \
  -H "Content-Type: application/json" \
  -d '{"action":"APPROVE","notes":"e2e script"}')"
APR_CODE="${APR_RAW##*$'\n'}"
APR_BODY="${APR_RAW%$'\n'*}"
check_http "PUT /api/admin/users/{id}/status APPROVE" "200" "$APR_CODE" "$APR_BODY"

# --- Doctor login ---
echo ""
echo "--- Doctor login ---"
DOC_LOGIN_RAW="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${DOCTOR_EMAIL}\",\"password\":\"${USER_PASSWORD}\"}")"
DOC_LOGIN_CODE="${DOC_LOGIN_RAW##*$'\n'}"
DOC_LOGIN_BODY="${DOC_LOGIN_RAW%$'\n'*}"
check_http "POST /api/auth/login (doctor)" "200" "$DOC_LOGIN_CODE" "$DOC_LOGIN_BODY"
DOCTOR_TOKEN="$(echo "$DOC_LOGIN_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['accessToken'])")"

# --- Create doctor profile ---
echo ""
echo "--- POST /api/doctors (profile) ---"
CREATE_DOC_RAW="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/doctors" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"${DOCTOR_USER_ID}\",
    \"firstName\": \"E2E\",
    \"lastName\": \"Doctor\",
    \"email\": \"${DOCTOR_EMAIL}\",
    \"phone\": \"+94111333${STAMP:(-3)}\",
    \"specialization\": \"General Practice\",
    \"qualifications\": \"MBBS\",
    \"experience\": 5,
    \"consultationFee\": 2500.00,
    \"bio\": \"E2E test doctor\"
  }")"
CREATE_DOC_CODE="${CREATE_DOC_RAW##*$'\n'}"
CREATE_DOC_BODY="${CREATE_DOC_RAW%$'\n'*}"
check_http "POST /api/doctors" "201" "$CREATE_DOC_CODE" "$CREATE_DOC_BODY"
DOCTOR_PROFILE_ID="$(echo "$CREATE_DOC_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"

# --- Future appointment time (ISO local, no Z) ---
APPT_TIME="$(python3 - <<'PY'
from datetime import datetime, timedelta
print((datetime.now() + timedelta(days=3)).replace(microsecond=0).isoformat())
PY
)"

echo ""
echo "--- POST /api/appointments (book) ---"
BOOK_RAW="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/appointments" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"${PATIENT_ID}\",
    \"patientName\": \"E2E Patient\",
    \"patientEmail\": \"${PATIENT_EMAIL}\",
    \"doctorId\": \"${DOCTOR_PROFILE_ID}\",
    \"doctorName\": \"E2E Doctor\",
    \"doctorSpecialty\": \"General Practice\",
    \"appointmentTime\": \"${APPT_TIME}\",
    \"type\": \"IN_PERSON\",
    \"notes\": \"E2E booking\"
  }")"
BOOK_CODE="${BOOK_RAW##*$'\n'}"
BOOK_BODY="${BOOK_RAW%$'\n'*}"
check_http "POST /api/appointments (book)" "201" "$BOOK_CODE" "$BOOK_BODY"
APPT_ID="$(echo "$BOOK_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"

# --- Appointment: GET all (admin) ---
echo ""
echo "--- Appointment endpoints ---"
GA_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/appointments" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")"
check_http "GET /api/appointments (admin)" "200" "${GA_RAW##*$'\n'}" ""

# --- GET by id (patient) ---
G1_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/appointments/${APPT_ID}" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}")"
check_http "GET /api/appointments/{id} (patient)" "200" "${G1_RAW##*$'\n'}" ""

# --- GET by id (doctor) ---
G1D_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/appointments/${APPT_ID}" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}")"
check_http "GET /api/appointments/{id} (doctor)" "200" "${G1D_RAW##*$'\n'}" ""

# --- GET patient/{patientId} (patient) ---
GP_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/appointments/patient/${PATIENT_ID}" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}")"
check_http "GET /api/appointments/patient/{patientId}" "200" "${GP_RAW##*$'\n'}" ""

# --- GET doctor/{doctorProfileId} (doctor) ---
GD_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/appointments/doctor/${DOCTOR_PROFILE_ID}" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}")"
check_http "GET /api/appointments/doctor/{doctorProfileId}" "200" "${GD_RAW##*$'\n'}" ""

# --- GET search (no param → all, same as admin list; requires auth) ---
GSO_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/appointments/search" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")"
check_http "GET /api/appointments/search (no specialty)" "200" "${GSO_RAW##*$'\n'}" ""

# --- GET search with specialty ---
GS_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/appointments/search?specialty=General%20Practice" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}")"
check_http "GET /api/appointments/search?specialty=..." "200" "${GS_RAW##*$'\n'}" ""

# --- PATCH reschedule (patient, PENDING only) ---
RESCHED_TIME="$(python3 - <<'PY'
from datetime import datetime, timedelta
print((datetime.now() + timedelta(days=3, hours=2)).replace(microsecond=0).isoformat())
PY
)"
RESH_RAW="$(curl -sS -w "\n%{http_code}" -X PATCH "${BASE_URL}/api/appointments/${APPT_ID}" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"newAppointmentTime\":\"${RESCHED_TIME}\"}")"
check_http "PATCH /api/appointments/{id} (reschedule newAppointmentTime)" "200" "${RESH_RAW##*$'\n'}" ""

# --- PATCH status -> IN_SESSION (admin) for prescription eligibility ---
echo ""
echo "--- PATCH appointment -> IN_SESSION (admin) ---"
PATCH_RAW="$(curl -sS -w "\n%{http_code}" -X PATCH "${BASE_URL}/api/appointments/${APPT_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_SESSION"}')"
check_http "PATCH /api/appointments/{id} (status IN_SESSION)" "200" "${PATCH_RAW##*$'\n'}" ""

# --- Book second appointment for confirm + cancel tests ---
APPT_TIME2="$(python3 - <<'PY'
from datetime import datetime, timedelta
print((datetime.now() + timedelta(days=4)).replace(microsecond=0).isoformat())
PY
)"
BOOK2_RAW="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/appointments" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"${PATIENT_ID}\",
    \"patientName\": \"E2E Patient\",
    \"patientEmail\": \"${PATIENT_EMAIL}\",
    \"doctorId\": \"${DOCTOR_PROFILE_ID}\",
    \"doctorName\": \"E2E Doctor\",
    \"doctorSpecialty\": \"General Practice\",
    \"appointmentTime\": \"${APPT_TIME2}\",
    \"type\": \"IN_PERSON\"
  }")"
BOOK2_CODE="${BOOK2_RAW##*$'\n'}"
BOOK2_BODY="${BOOK2_RAW%$'\n'*}"
check_http "POST /api/appointments (second booking)" "201" "$BOOK2_CODE" "$BOOK2_BODY"
APPT2_ID="$(echo "$BOOK2_BODY" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"

# --- PATCH /confirm (doctor) ---
CONF_RAW="$(curl -sS -w "\n%{http_code}" -X PATCH "${BASE_URL}/api/appointments/${APPT2_ID}/confirm" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}")"
check_http "PATCH /api/appointments/{id}/confirm (doctor)" "200" "${CONF_RAW##*$'\n'}" ""

# --- DELETE cancel third appointment ---
APPT_TIME3="$(python3 - <<'PY'
from datetime import datetime, timedelta
print((datetime.now() + timedelta(days=5)).replace(microsecond=0).isoformat())
PY
)"
BOOK3_RAW="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/appointments" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"patientId\": \"${PATIENT_ID}\",
    \"patientName\": \"E2E Patient\",
    \"patientEmail\": \"${PATIENT_EMAIL}\",
    \"doctorId\": \"${DOCTOR_PROFILE_ID}\",
    \"doctorName\": \"E2E Doctor\",
    \"doctorSpecialty\": \"General Practice\",
    \"appointmentTime\": \"${APPT_TIME3}\",
    \"type\": \"TELEMEDICINE\"
  }")"
APPT3_ID="$(echo "${BOOK3_RAW%$'\n'*}" | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")"
DEL_RAW="$(curl -sS -w "\n%{http_code}" -X DELETE \
  "${BASE_URL}/api/appointments/${APPT3_ID}?reason=E2E+cancel" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}")"
check_http "DELETE /api/appointments/{id} (patient cancel)" "200" "${DEL_RAW##*$'\n'}" ""

# --- Prescriptions ---
echo ""
echo "--- Prescription endpoints ---"
VALID_FROM="$(python3 -c "from datetime import date; print(date.today().isoformat())")"
VALID_TO="$(python3 -c "from datetime import date,timedelta; print((date.today()+timedelta(days=30)).isoformat())")"

RX_POST_RAW="$(curl -sS -w "\n%{http_code}" -X POST "${BASE_URL}/api/prescriptions" \
  -H "Authorization: Bearer ${DOCTOR_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"doctorId\": \"${DOCTOR_PROFILE_ID}\",
    \"patientId\": \"${PATIENT_ID}\",
    \"appointmentId\": \"${APPT_ID}\",
    \"patientEmail\": \"${PATIENT_EMAIL}\",
    \"patientName\": \"E2E Patient\",
    \"diagnosis\": \"E2E tension headache\",
    \"medicines\": \"Paracetamol 500mg twice daily\",
    \"instructions\": \"Take after food\",
    \"validFrom\": \"${VALID_FROM}\",
    \"validTo\": \"${VALID_TO}\"
  }")"
check_http "POST /api/prescriptions" "201" "${RX_POST_RAW##*$'\n'}" "${RX_POST_RAW%$'\n'*}"

RX_DOC_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/prescriptions/doctor/${DOCTOR_PROFILE_ID}" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}")"
check_http "GET /api/prescriptions/doctor/{doctorId}" "200" "${RX_DOC_RAW##*$'\n'}" ""

RX_PAT_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/prescriptions/patient/${PATIENT_ID}" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}")"
check_http "GET /api/prescriptions/patient/{patientId}" "200" "${RX_PAT_RAW##*$'\n'}" ""

# --- Negative: patient cannot GET /api/appointments (admin only) ---
NEG_RAW="$(curl -sS -w "\n%{http_code}" "${BASE_URL}/api/appointments" \
  -H "Authorization: Bearer ${PATIENT_TOKEN}")"
check_http "GET /api/appointments (patient → expect 403)" "403" "${NEG_RAW##*$'\n'}" ""

echo ""
echo "=============================================="
echo "Summary: PASS=$PASS  FAIL=$FAIL"
echo "Patient: ${PATIENT_EMAIL}  id=${PATIENT_ID}"
echo "Doctor:  ${DOCTOR_EMAIL}  profile=${DOCTOR_PROFILE_ID}"
echo "Appointment (IN_SESSION + Rx): ${APPT_ID}"
echo "=============================================="
[[ "$FAIL" -eq 0 ]]
