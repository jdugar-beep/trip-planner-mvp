# Google Places Cost Guard

This app should never call Google Places directly from React. Places search goes through the Supabase Edge Function at `supabase/functions/places-search`, which keeps the API key server-side and checks `places_usage` before each Google request.

## Required Google Cloud setup

1. Enable Places API for your Google Cloud project.
2. Create an API key for the Supabase function.
3. Restrict the key to Places API only.
4. Set a low Places API quota in Google Maps Platform > Quotas. Start with 25 or 50 requests per day while testing.
5. Add a billing budget alert as a backup reminder.

Budgets are alerts, not hard caps. The quota is the Google-side hard stop, and `PLACES_DAILY_REQUEST_LIMIT` is the app-side stop.

## Required Supabase setup

Run the migration in `supabase/migrations/202606230001_places_usage.sql`, then set Edge Function secrets:

```bash
supabase secrets set GOOGLE_PLACES_API_KEY=your_google_key
supabase secrets set PLACES_DAILY_REQUEST_LIMIT=25
```

Deploy the function:

```bash
supabase functions deploy places-search
```

## What the function returns

The function returns up to five lightweight Places results:

```json
{
  "places": [
    {
      "id": "places/...",
      "name": "Cafe Example",
      "address": "123 Main St",
      "url": "https://maps.google.com/...",
      "rating": 4.6,
      "userRatingCount": 128
    }
  ],
  "quota": {
    "allowed": true,
    "count": 3,
    "limit": 25,
    "day": "2026-06-23"
  }
}
```
