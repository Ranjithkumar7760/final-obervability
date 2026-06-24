#!/bin/bash
set -u

# E-commerce POC Traffic Generator
# Generates the current single-request checkout flow:
# frontend proxy -> auth -> order -> payment -> notification -> user.

BASE_URL="${BASE_URL:-http://localhost:3000}"
SLEEP_MIN="${SLEEP_MIN:-1}"
SLEEP_MAX="${SLEEP_MAX:-3}"
USERS=("demo" "user1")
PASSWORDS=("demo123" "pass123")
PRODUCTS=("Laptop" "Phone" "Headphones" "Watch" "Tablet" "Camera")

json_get() {
  python3 -c 'import json,sys; print(json.load(sys.stdin).get(sys.argv[1], ""))' "$1" 2>/dev/null
}

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required"
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required"
  exit 1
fi

if [ "$SLEEP_MAX" -lt "$SLEEP_MIN" ]; then
  echo "SLEEP_MAX must be greater than or equal to SLEEP_MIN"
  exit 1
fi

echo "Starting traffic generator... Press [CTRL+C] to stop."
echo "Base URL: $BASE_URL"
echo "Flow: /api/auth/login -> /api/auth/place-order"

while true; do
  IDX=$((RANDOM % ${#USERS[@]}))
  USER=${USERS[$IDX]}
  PASS=${PASSWORDS[$IDX]}

  ITEM_COUNT=$((RANDOM % 3 + 1))
  ITEMS=()
  TOTAL=0
  for ((i = 0; i < ITEM_COUNT; i++)); do
    PRODUCT=${PRODUCTS[$((RANDOM % ${#PRODUCTS[@]}))]}
    ITEMS+=("$PRODUCT")
    TOTAL=$((TOTAL + RANDOM % 900 + 100))
  done

  ITEMS_JSON=$(printf '%s\n' "${ITEMS[@]}" | python3 -c 'import json,sys; print(json.dumps([line.strip() for line in sys.stdin if line.strip()]))')

  echo "-----------------------------------"
  echo "User '$USER' is logging in..."

  LOGIN_RESP=$(curl -sS --max-time 10 -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$USER\", \"password\": \"$PASS\"}")

  TOKEN=$(printf '%s' "$LOGIN_RESP" | json_get token)

  if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "Login failed for '$USER'. Response: $LOGIN_RESP"
    sleep 3
    continue
  fi

  echo "Login successful. Placing order for $ITEMS_JSON total=$TOTAL..."

  ORDER_RESP=$(curl -sS --max-time 15 -X POST "$BASE_URL/api/auth/place-order" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"items\": $ITEMS_JSON, \"total\": $TOTAL}")

  STATUS=$(printf '%s' "$ORDER_RESP" | json_get status)
  ORDER_ID=$(printf '%s' "$ORDER_RESP" | json_get order_id)
  TXN_ID=$(printf '%s' "$ORDER_RESP" | json_get transaction_id)

  if [ "$STATUS" = "success" ]; then
    echo "Order completed. order_id=$ORDER_ID transaction_id=$TXN_ID"
  else
    echo "Order failed. Response: $ORDER_RESP"
  fi

  RANGE=$((SLEEP_MAX - SLEEP_MIN + 1))
  SLEEP_TIME=$((RANDOM % RANGE + SLEEP_MIN))
  echo "Sleeping for ${SLEEP_TIME}s..."
  sleep "$SLEEP_TIME"
done
