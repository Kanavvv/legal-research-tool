#!/usr/bin/env bash
# Registers the WhatsApp number on the Cloud API so it can send and receive.
# You choose a 6-digit PIN (WhatsApp two-step verification). Keep it somewhere safe:
# Meta asks for it again if the number is ever re-registered.
set -euo pipefail
P=legal-research-tool-509320

PHONE_ID=$(gcloud secrets versions access latest --secret whatsapp-phone-id --project "$P")
TOKEN=$(gcloud secrets versions access latest --secret whatsapp-token --project "$P")

read -r -s -p "Choose a 6-digit PIN (hidden): " PIN; echo
if ! [[ "$PIN" =~ ^[0-9]{6}$ ]]; then echo "The PIN must be exactly 6 digits."; exit 1; fi

RESP=$(curl -s -X POST "https://graph.facebook.com/v25.0/${PHONE_ID}/register" \
  -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" \
  -d "{\"messaging_product\":\"whatsapp\",\"pin\":\"${PIN}\"}")
unset PIN TOKEN

if echo "$RESP" | grep -q '"success":true'; then
  echo "Registered. The number can now send and receive messages."
else
  echo "Meta said: $RESP"
fi
