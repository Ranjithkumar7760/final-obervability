#!/bin/bash
# E-commerce POC Traffic Generator
# Simulates login, cart checkout, payment, notification, and user history updates in a loop.

echo "Starting traffic generator... Press [CTRL+C] to stop."
echo "Endpoints: Auth (5001), Order (5002), Payment (5003)"

USERS=("demo" "user1")
PASSWORDS=("demo123" "pass123")

while true; do
  # Pick a random user
  IDX=$((RANDOM % 2))
  USER=${USERS[$IDX]}
  PASS=${PASSWORDS[$IDX]}

  echo "-----------------------------------"
  echo "User '$USER' is logging in..."
  
  # 1. Login
  LOGIN_RESP=$(curl -s -X POST http://localhost:5001/login \
    -H "Content-Type: application/json" \
    -d "{\"username\": \"$USER\", \"password\": \"$PASS\"}")
  
  TOKEN=$(echo "$LOGIN_RESP" | jq -r '.token')

  if [ -z "$TOKEN" ] || [ "$TOKEN" == "null" ]; then
    echo "Login failed for '$USER'!"
    sleep 3
    continue
  fi
  
  echo "Login successful! Token acquired."

  # 2. Place Order
  echo "Placing order..."
  TOTAL=$((RANDOM % 200 + 10))
  ORDER_RESP=$(curl -s -X POST http://localhost:5002/orders \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"items\": [{\"id\": 101, \"name\": \"Wireless Mouse\", \"quantity\": 1}], \"total\": $TOTAL}")

  ORDER_ID=$(echo "$ORDER_RESP" | jq -r '.id')
  
  if [ -z "$ORDER_ID" ] || [ "$ORDER_ID" == "null" ]; then
    echo "Order placement failed!"
    sleep 3
    continue
  fi
  
  echo "Order #$ORDER_ID created successfully for \$$TOTAL."

  # 3. Pay for Order
  echo "Processing payment for Order #$ORDER_ID..."
  PAY_RESP=$(curl -s -X POST http://localhost:5003/charge \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"amount\": $TOTAL, \"order_id\": $ORDER_ID}")
  
  TXN_ID=$(echo "$PAY_RESP" | jq -r '.transaction_id')
  
  if [ -n "$TXN_ID" ] && [ "$TXN_ID" != "null" ]; then
    echo "Payment successful! Transaction ID: $TXN_ID."
  else
    echo "Payment failed! Response: $PAY_RESP"
  fi

  # Sleep for a random interval between 1 and 3 seconds
  SLEEP_TIME=$((RANDOM % 3 + 1))
  echo "Sleeping for ${SLEEP_TIME}s..."
  sleep $SLEEP_TIME
done
