import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { sendMessageStream } from '../services/aiService';
import { playTextToSpeech, stopAudio } from '../services/ttsService';
import { checkDailyLimit, incrementDailyUsage } from '../services/statsService';
import PremiumModal from '../components/PremiumModal';
import { Send, User, Bot, Volume2, VolumeX, Mic, MicOff, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocation } from 'react-router-dom';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  "I feel anxious",
  "Verses for sleep",
  "Explain John 3:16",
  "How to pray?",
  "Comfort for grief"
];

export default function ChatScreen() {
  const { theme } = useTheme();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Peace be with you, my child. How may I guide you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const isSendingRef = useRef(false);
  const initialPromptHandled = useRef(false);

  // Handle initial prompt from navigation state
  useEffect(() => {
    if (initialPromptHandled.current) return;

    const state = location.state as { initialPrompt?: string };
    if (state?.initialPrompt) {
      initialPromptHandled.current = true;
      handleSend(state.initialPrompt);
      // Clear state to prevent re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  const handleSpeak = async (text: string, id: string) => {
    if (speakingMessageId === id) {
      stopAudio();
      setSpeakingMessageId(null);
      return;
    }

    stopAudio();
    setSpeakingMessageId(id);
    setIsLoadingAudio(true);

    try {
      await playTextToSpeech(text, () => {
        // Only reset if this is still the active message
        setSpeakingMessageId(current => current === id ? null : current);
        setIsLoadingAudio(current => speakingMessageId === id ? false : current);
      });
    } catch (error) {
      console.error("Audio failed", error);
      setSpeakingMessageId(current => current === id ? null : current);
    } finally {
      // Only reset loading if this is still the active message
      setSpeakingMessageId(current => {
        if (current === id) {
          setIsLoadingAudio(false);
        }
        return current;
      });
    }
  };
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        handleSend(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const handleSend = async (text: string = input) => {
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText || isLoading || isSendingRef.current) return;

    // Check daily limit
    if (checkDailyLimit()) {
      setIsPremiumModalOpen(true);
      return;
    }

    isSendingRef.current = true;
    // Stop any current speech
    stopAudio();

    // Increment usage count
    incrementDailyUsage();

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: cleanText };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the AI response
    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', content: '' }]);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      
      let fullContent = "";
      await sendMessageStream(cleanText, history, (chunk) => {
        fullContent += chunk;
        setMessages(prev => prev.map(msg => 
          msg.id === aiMsgId ? { ...msg, content: fullContent } : msg
        ));
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === aiMsgId ? { ...msg, content: 'I apologize, but I am having trouble connecting right now. Please try again.' } : msg
      ));
    } finally {
      setIsLoading(false);
      isSendingRef.current = false;
    }
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-4rem)] md:h-screen ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      <PremiumModal 
        isOpen={isPremiumModalOpen} 
        onClose={() => setIsPremiumModalOpen(false)}
        onUpgrade={() => setIsPremiumModalOpen(false)}
      />
      
      {/* Header */}
      <div className={`p-4 border-b flex justify-between items-center ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="text-blue-500" /> Father AI
        </h1>
        {speakingMessageId && (
          <button 
            onClick={() => {
              stopAudio();
              setSpeakingMessageId(null);
            }}
            className="p-2 rounded-full bg-red-100 text-red-600 animate-pulse"
          >
            <VolumeX size={20} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-br-none' 
                : (theme === 'dark' ? 'bg-gray-700 text-gray-100 rounded-bl-none' : 'bg-gray-100 text-gray-800 rounded-bl-none')
            }`}>
              {msg.role === 'user' ? (
                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              )}
            </div>
            {/* Audio Control for Assistant Messages */}
            {msg.role === 'assistant' && msg.content && (
              <button 
                onClick={() => handleSpeak(msg.content, msg.id)}
                className={`mt-1 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors ${speakingMessageId === msg.id ? 'text-blue-500' : ''}`}
                title="Listen to response"
                disabled={isLoadingAudio && speakingMessageId !== msg.id && speakingMessageId !== null}
              >
                {speakingMessageId === msg.id ? (
                  isLoadingAudio ? <Loader2 size={16} className="animate-spin" /> : <VolumeX size={16} />
                ) : (
                  <Volume2 size={16} />
                )}
              </button>
            )}
          </div>
        ))}
        {isLoading && messages[messages.length - 1].role === 'user' && (
           <div className="flex justify-start">
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <div className="flex space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      {messages.length === 1 && (
        <div className="px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => handleSend(prompt)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm border transition-colors ${
                theme === 'dark' 
                  ? 'border-gray-600 bg-gray-800 hover:bg-gray-700 text-gray-300' 
                  : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'
              }`}
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={`p-4 border-t ${theme === 'dark' ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
        <div className="flex gap-2">
          {/* Voice Input Button */}
          <button
            onClick={toggleListening}
            className={`p-3 rounded-xl transition-all ${
              isListening 
                ? 'bg-red-500 text-white animate-pulse' 
                : (theme === 'dark' ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
            }`}
            title="Speak"
          >
            {isListening ? <MicOff size={20} /> : <Mic size={20} />}
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isListening ? "Listening..." : "Ask for guidance..."}
            className={`flex-1 px-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500 text-base ${
              theme === 'dark' 
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className={`p-3 rounded-xl bg-blue-600 text-white transition-opacity ${
              isLoading || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
            }`}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
