#!/bin/bash
# Switches on Nyaya's WhatsApp bot. Run it yourself in a terminal:
#   bash scripts/setup_whatsapp.sh
# It asks for the four WhatsApp values (typing is hidden), stores them in Google
# Secret Manager, and points the backend at them. The values are never printed,
# written to disk, or put in the command history.
set -euo pipefail
P=legal-research-tool-509320
REGION=us-central1
SERVICE=legal-research-backend
SA=256323345647-compute@developer.gserviceaccount.com

gcloud services enable secretmanager.googleapis.com --project "$P" --quiet

store() {  # store NAME "prompt"
  local name=$1 prompt=$2 value
  read -r -s -p "$prompt: " value; echo
  if [ -z "$value" ]; then echo "Empty, stopping."; exit 1; fi
  if gcloud secrets describe "$name" --project "$P" >/dev/null 2>&1; then
    printf '%s' "$value" | gcloud secrets versions add "$name" --data-file=- --project "$P" --quiet >/dev/null
  else
    printf '%s' "$value" | gcloud secrets create "$name" --data-file=- --replication-policy=automatic --project "$P" --quiet >/dev/null
  fi
  gcloud secrets add-iam-policy-binding "$name" --member "serviceAccount:$SA" --role roles/secretmanager.secretAccessor --project "$P" --quiet >/dev/null
  echo "  saved $name"
  value=""
}

echo "Paste each value from Meta (developers.facebook.com, your app):"
store whatsapp-token        "Permanent access token (System user token)"
store whatsapp-phone-id     "Phone number ID (WhatsApp > API Setup)"
store whatsapp-app-secret   "App secret (App settings > Basic)"
store whatsapp-verify-token "A verify token you make up (any long random phrase; you'll paste the same in Meta's webhook form)"

gcloud run services update "$SERVICE" --region "$REGION" --project "$P" --quiet \
  --update-secrets=WHATSAPP_TOKEN=whatsapp-token:latest,WHATSAPP_PHONE_ID=whatsapp-phone-id:latest,WHATSAPP_APP_SECRET=whatsapp-app-secret:latest,WHATSAPP_VERIFY_TOKEN=whatsapp-verify-token:latest

echo
echo "Done. Now in Meta: WhatsApp > Configuration > Webhook:"
echo "  Callback URL:  https://api.asknyaya.in/whatsapp/webhook"
echo "  Verify token:  the phrase you just made up"
echo "Then click Verify and save, and subscribe to the 'messages' field."
