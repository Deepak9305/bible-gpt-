# Bible Nova

Bible Nova is a local-first Bible companion built with React, Vite, and Capacitor.

## Current Scope

- Local onboarding profile
- Offline-capable KJV Bible reading and search
- Local bookmarks, prayer journal, and usage stats
- Father AI chat through the `/api/chat` serverless route
- Google Play premium subscription with monthly and yearly base plans
- Native text-to-speech, speech recognition, sharing, notifications, and AdMob

Premium billing is connected to the Google Play product `biblenova` and its active `monthly` and `yearly` base plans. The Android client verifies each Play purchase signature locally with the app's public licensing key. Play purchase testing requires an Android build installed through an internal, closed, or open Play testing track with a licensed tester account.

The server verification route is `POST /api/premium/verify`. To enable server-authoritative entitlement sync, add these server-only Vercel Production variables: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, and optionally `GOOGLE_PLAY_PACKAGE_NAME` (defaults to `com.biblenova.app`). The service-account JSON must have Android Publisher API access to the Bible Nova Play Console app. Never expose the service-role key or service-account JSON to the client.

## Run Locally

1. Install dependencies:
   `npm install`
2. Set `GROQ_API_KEY` in `.env` or your hosting environment.
3. Run the app:
   `npm run dev`

## Useful Commands

- `npm run dev`
- `npm run lint`
- `npm run build`
