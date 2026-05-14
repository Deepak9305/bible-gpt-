import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TermsOfServiceScreen() {
  const { theme } = useTheme();

  return (
    <div className={`h-full flex flex-col ${theme === 'dark' ? 'text-white' : 'text-gray-900'} safe-area-top`}>
      <div className={`p-4 border-b flex items-center gap-4 ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <Link to="/settings" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-semibold">Terms of Service</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-24 max-w-3xl mx-auto">
        <div className={`prose ${theme === 'dark' ? 'prose-invert' : ''}`}>
          <h2>Terms of Service</h2>
          <p><strong>Effective Date:</strong> {new Date().toLocaleDateString()}</p>

          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing or using Bible Nova, you agree to these Terms of Service. If you do not agree, please do not use the app.
          </p>

          <h3>2. AI Content Disclaimer</h3>
          <p>Bible Nova uses artificial intelligence to generate responses. You acknowledge and agree that:</p>
          <ul>
            <li>AI responses may contain errors or incomplete guidance.</li>
            <li>The content is for spiritual reflection and educational use only.</li>
            <li>The app is not a substitute for professional theological, psychological, medical, legal, financial, or emergency advice.</li>
            <li>You are responsible for decisions you make based on app content.</li>
          </ul>

          <h3>3. User Conduct</h3>
          <p>
            You agree not to use the app to request harmful, abusive, illegal, or exploitative content.
          </p>

          <h3>4. Local Data</h3>
          <p>
            The app currently uses a local profile rather than a server account. Clearing app data or uninstalling the app may remove your local profile, journal entries, bookmarks, and settings.
          </p>

          <h3>5. Disclaimer of Warranties</h3>
          <p>
            The app is provided as is without warranties of any kind. We do not guarantee that AI-generated responses or scripture search results will always be accurate, complete, or available.
          </p>

          <h3>6. Limitation of Liability</h3>
          <p>
            We shall not be liable for indirect, incidental, or consequential damages arising from your use of the app.
          </p>
        </div>
      </div>
    </div>
  );
}
