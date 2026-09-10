# Bible Nova

Bible Nova is a local-first Bible companion built with React, Vite, and Capacitor.

## Current Scope

- Local onboarding profile
- Offline-capable KJV Bible reading and search
- Local bookmarks, prayer journal, and usage stats
- Father AI chat through the `/api/chat` serverless route
- Google Play premium subscription with monthly and yearly base plans
- Native text-to-speech, speech recognition, sharing, notifications, and AdMob

Premium billing is connected to the Google Play product `biblenova` and its active `monthly` and `yearly` base plans. Play purchase testing requires an Android build installed through an internal, closed, or open Play testing track with a licensed tester account. Server-side receipt validation is not configured yet.

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
