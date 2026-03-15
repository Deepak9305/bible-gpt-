# Bible Nova Hybrid Architecture

Bible Nova is designed with a **"Hybrid-Hybrid"** approach to ensure a seamless spiritual experience whether you are online or offline. This document outlines how the application manages local data and web-related functions.

## 🏛️ Design Philosophy: "Local for Wisdom, Web for Guidance"

The application bifurcates its logic into two primary layers:

### 1. Local Wisdom (Offline Capable)
To ensure the Word of God is always accessible, the core Bible reading experience is entirely local.
*   **Bible Storage**: The full King James Version (KJV) is stored in a compressed JSON format within the app bundle.
*   **Bible Reading**: Browsing books, chapters, and verses does not require an internet connection.
*   **Search**: A high-performance, localized search engine allows you to find scriptures offline.
*   **Bookmarks & Journal**: Your saved verses and prayer logs are stored securely on your device.
*   **Daily Verse Fallback**: If the internet is unavailable, the app automatically selects a random seed of wisdom from the local Bible.

### 2. Web Guidance (Online Enhanced)
Features that require dynamic processing or AI wisdom utilize secure web services.
*   **Onboarding**: The initial setup and spiritual alignment process is served via our [Vercel-hosted sanctuary](https://bible-gpt-ebon.vercel.app/onboarding).
*   **Father AI Chat**: Spiritual guidance, counseling, and deep theological explanations are powered by our AI proxy.
*   **Verse Reflections**: Every daily verse receives a unique, AI-generated reflection to help you apply the Word to your life.
*   **Audio (TTS)**: While the logic is local, the high-quality synthesis of "Father's Voice" often requires system-level web-connected voice modules.

## 🔌 Technical Details

*   **Framework**: Built with React, Vite, and Capacitor.
*   **Data Format**: JSON-based Bible dataset optimized for mobile memory.
*   **AI Engine**: Powered by Groq/LLaMA 3.1 for high-speed, compassionate responses.
*   **Storage**: Capacitor Preferences and IndexedDB for persistent local history.

---
*Bible Nova: Your sanctuary, always with you.*
