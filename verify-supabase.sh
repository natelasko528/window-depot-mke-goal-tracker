#!/bin/bash
# Supabase Connection Verification Script
# Usage: ./verify-supabase.sh

set -e

SUPABASE_URL="https://jzxmmtaloiglvclrmfjb.supabase.co"
API_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp6eG1tdGFsb2lnbHZjbHJtZmpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODA5NjgsImV4cCI6MjA4NDE1Njk2OH0.fOTkZJsVODkyw5rNyA-bc61TlcWjwvfx7zQM-eOg-zg"

echo "🔍 Supabase Connection Verification"
echo "===================================="
echo ""
echo "Project: Window Depot Goal Tracker"
echo "URL: $SUPABASE_URL"
echo ""

TABLES=("users" "daily_logs" "appointments" "feed_posts" "feed_likes" "feed_comments")
SUCCESS_COUNT=0
FAILED_COUNT=0

for table in "${TABLES[@]}"; do
  echo -n "Testing table '$table'... "

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    "$SUPABASE_URL/rest/v1/$table?limit=1" \
    -H "apikey: $API_KEY" \
    -H "Authorization: Bearer $API_KEY")

  if [ "$HTTP_CODE" == "200" ]; then
    COUNT=$(curl -s "$SUPABASE_URL/rest/v1/$table?select=count" \
      -H "apikey: $API_KEY" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Prefer: count=exact" | grep -o '"count":[0-9]*' | cut -d':' -f2)

    if [ -z "$COUNT" ]; then
      COUNT="?"
    fi

    echo "✅ OK (HTTP $HTTP_CODE, ~$COUNT records)"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  else
    echo "❌ FAILED (HTTP $HTTP_CODE)"
    FAILED_COUNT=$((FAILED_COUNT + 1))
  fi
done

echo ""
echo "===================================="
echo "Results: $SUCCESS_COUNT passed, $FAILED_COUNT failed"
echo ""

if [ $SUCCESS_COUNT -eq ${#TABLES[@]} ]; then
  echo "🎉 SUCCESS! All tables are accessible!"
  echo ""
  echo "Next steps:"
  echo "1. Verify environment variables in Vercel"
  echo "2. Create a test user in production"
  echo "3. Check Supabase dashboard for data"
  echo ""
  exit 0
else
  echo "⚠️  Some tables failed the connection test."
  echo "Check your Supabase project status and API key."
  echo ""
  exit 1
fi
