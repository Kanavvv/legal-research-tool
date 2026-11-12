#!/usr/bin/env bash
# One-off setup for WhatsApp voice notes and "Law of the day".
#  1. Turns on Google Speech-to-Text (voice notes).
#  2. Submits the law_of_the_day message template to Meta (English and Hindi) for approval.
#     WhatsApp only lets a business message someone who hasn't written in 24 hours with an
#     approved template. Approval usually takes minutes to a day.
#  3. Creates a service account and a Cloud Scheduler job that calls /whatsapp/daily at 9:00 IST.
#  4. Tells the backend which account the scheduler signs in as.
set -euo pipefail
P=legal-research-tool-509320
REGION=us-central1
WABA=1021902343589464
SA=nyaya-daily-cron@${P}.iam.gserviceaccount.com

echo "1/4 Speech-to-Text"
gcloud services enable speech.googleapis.com cloudscheduler.googleapis.com --project "$P"

echo "2/4 Message templates"
TOKEN=$(gcloud secrets versions access latest --secret whatsapp-token --project "$P")
submit() {  # name, language, body, example
  python3 - "$1" "$2" "$3" "$4" > /tmp/nyaya_tpl.json <<'PY'
import json, sys
name, lang, body, example = sys.argv[1:]
print(json.dumps({"name": name, "language": lang, "category": "MARKETING",
                  "components": [{"type": "BODY", "text": body, "example": {"body_text": [[example]]}}]}))
PY
  curl -s -X POST "https://graph.facebook.com/v21.0/${WABA}/message_templates" \
    -H "Authorization: Bearer ${TOKEN}" -H "Content-Type: application/json" --data @/tmp/nyaya_tpl.json
  echo
  rm -f /tmp/nyaya_tpl.json
}
submit law_of_the_day en $'📚 *Law of the day*\n\n{{1}}\n\nGeneral legal information, not advice. Reply STOP to turn these off.' \
  "You can file an FIR at any police station, even if the crime happened somewhere else. This is called a Zero FIR, under Section 173 of the Bharatiya Nagarik Suraksha Sanhita, 2023."
submit law_of_the_day hi $'📚 *आज का कानून*\n\n{{1}}\n\nयह सामान्य कानूनी जानकारी है, सलाह नहीं। बंद करने के लिए STOP लिखें।' \
  "आप किसी भी थाने में FIR दर्ज करा सकते हैं, चाहे अपराध कहीं और हुआ हो। इसे ज़ीरो FIR कहते हैं, भारतीय नागरिक सुरक्षा संहिता, 2023 की धारा 173 के तहत।"
unset TOKEN

echo "3/4 Scheduler"
gcloud iam service-accounts describe "$SA" --project "$P" >/dev/null 2>&1 || \
  gcloud iam service-accounts create nyaya-daily-cron --display-name "Nyaya law of the day" --project "$P"
gcloud scheduler jobs describe nyaya-law-of-the-day --location "$REGION" --project "$P" >/dev/null 2>&1 || \
  gcloud scheduler jobs create http nyaya-law-of-the-day --location "$REGION" --project "$P" \
    --schedule "0 9 * * *" --time-zone "Asia/Kolkata" --http-method POST \
    --uri "https://api.asknyaya.in/whatsapp/daily" \
    --oidc-service-account-email "$SA" --oidc-token-audience "https://api.asknyaya.in/whatsapp/daily" \
    --attempt-deadline 600s

echo "4/4 Backend setting"
gcloud run services update legal-research-backend --region "$REGION" --project "$P" \
  --update-env-vars "WHATSAPP_DAILY_INVOKER=${SA}" --quiet
echo "Done. Check template status in WhatsApp Manager > Message templates."
