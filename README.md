# Bible Nova

Bible Nova is a local-first Bible companion built with React, Vite, and Capacitor.

## Current Scope

- Local onboarding profile
- Offline-capable KJV Bible reading and search
- Local bookmarks, prayer journal, and usage stats
- Father AI chat through the `/api/chat` serverless route
- Native text-to-speech, speech recognition, sharing, notifications, and AdMob

There is currently no premium subscription, no real authentication, and no Supabase/cloud-sync backend.

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
