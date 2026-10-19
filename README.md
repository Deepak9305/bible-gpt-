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
- `npm test` — validate all 66 KJV books, chapter caching, search cancellation and responsiveness
- `npm run build`

## Android and Bible assets

Android loads `https://biblenova.vercel.app` by default. Refresh its native settings with
`npx cap sync android`, then open the `android` folder in Android Studio. This sync
does not compile an APK. For a bundled build, set `CAPACITOR_USE_BUNDLED_ASSETS=true`
and generate `dist` before syncing. The hosted mode requires an internet connection.

The complete KJV data is checked into `public/bible.json` and cached in IndexedDB
for reading and search. `npm run restore:bible` regenerates it from the pinned
[upstream KJV source](https://github.com/thiagobodruk/bible/blob/0e8fd65a89727f5b73e9f88edb220da8e0d5daba/json/en_kjv.json),
validates book/chapter/verse counts, and includes its license in `public/bible.LICENSE.txt`.
