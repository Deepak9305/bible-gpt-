import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'} safe-area-top`}>
      <div className={`p-4 border-b flex items-center gap-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <Link to="/settings" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold">Privacy Policy</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24 max-w-3xl mx-auto">
        <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''}`}>
          <h2>Privacy Policy</h2>
          <p className="text-sm opacity-70">Last updated: {new Date().toLocaleDateString()}</p>

          <h3>1. Local Data</h3>
          <p>
            Bible Nova stores your profile, bookmarks, prayer journal, settings, and reading progress locally on your device.
            The app does not currently provide user accounts or cloud sync.
          </p>

          <h3>2. AI Interactions</h3>
          <p>
            When you chat with Father AI, your message and recent conversation context are sent to our AI endpoint so a response can be generated through Groq.
            Do not include passwords, financial information, or other sensitive personal details in chat messages.
          </p>

          <h3>3. Third-Party Services</h3>
          <p>We use third-party services to provide core app features:</p>
          <ul>
            <li><strong>Groq:</strong> Generates Father AI chat responses.</li>
            <li><strong>Bible API:</strong> Retrieves some scripture content when online; bundled KJV content is used for offline fallback.</li>
            <li><strong>Device services:</strong> Enable optional features such as speech recognition, text-to-speech, sharing, and notifications.</li>
          </ul>

          <h3>4. No Account Required</h3>
          <p>
            You do not need to create an account to use Bible Nova. If you delete the app or clear app data, local information may be lost.
          </p>

          <h3>5. Spiritual Guidance Disclaimer</h3>
          <p>
            Father AI is designed for spiritual guidance and reflective conversation only.
            It is not a substitute for professional medical, psychological, legal, financial, or emergency services.
          </p>

          <h3>6. Contact</h3>
          <p>If you have questions about this policy, please contact us through the app support channels.</p>
        </div>
      </div>
    </div>
  );
}
