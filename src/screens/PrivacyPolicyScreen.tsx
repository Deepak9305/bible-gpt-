import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PrivacyPolicyScreen() {
  const { theme } = useTheme();

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <div className={`p-4 border-b flex items-center gap-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <Link to="/settings" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold">Privacy Policy</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto">
        <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''}`}>
          <h2>Privacy Policy</h2>
          <p className="text-sm opacity-70">Last updated: {new Date().toLocaleDateString()}</p>

          <h3>1. Data Storage</h3>
          <p>
            <strong>Your data belongs to you.</strong> Bible Nova operates on a "local-first" basis.
            All your bookmarks, prayer journals, settings, and reading history are stored <strong>locally on your device</strong>.
            We do not have access to your personal data, and it is never uploaded to our servers.
          </p>

          <h3>2. AI Interactions</h3>
          <p>
            When you chat with Father AI, your messages are processed by Google's Gemini API to generate responses.
            These interactions are ephemeral and are not used by us to build personal profiles or for advertising purposes.
          </p>

          <h3>3. Third-Party Services</h3>
          <p>
            We use the following trusted third-party services to provide functionality:
          </p>
          <ul>
            <li><strong>Google Gemini API:</strong> For generating spiritual guidance and chat responses.</li>
            <li><strong>Bible API:</strong> For retrieving scripture verses (King James Version).</li>
          </ul>

          <h3>4. No Account Required</h3>
          <p>
            You do not need to create an account to use Bible Nova. Your "profile" (name and avatar) is stored only on your device.
            If you delete the app or clear your browser data, this information will be lost as we do not keep backups.
          </p>

          <h3>5. Contact</h3>
          <p>
            If you have questions about this policy, please contact us through the app support channels.
          </p>
        </div>
      </div>
    </div>
  );
}
