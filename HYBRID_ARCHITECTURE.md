# Bible Nova Architecture

Bible Nova is currently a local-first app with one serverless AI endpoint.

## Local App

- The user profile is stored locally.
- Bookmarks, prayer journal entries, settings, usage counters, and reading progress are stored on the device.
- The bundled KJV Bible supports offline reading and fallback behavior.
- Search runs against the local Bible data after it is loaded.

## Online Features

- Father AI chat calls `/api/chat`, which uses the server-side `GROQ_API_KEY`.
- Daily verse and chapter loading can use `bible-api.com` when online, with local KJV fallback.
- AdMob, notifications, speech recognition, text-to-speech, and sharing are native integrations.

## Not Included Yet

- Premium subscriptions
- Real user authentication
- Cloud sync
- Supabase database or edge functions
- Server-side usage quota enforcement
