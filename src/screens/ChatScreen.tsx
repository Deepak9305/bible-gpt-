import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { sendMessageStream } from '../services/aiService';
import { playTextToSpeech, stopAudio } from '../services/ttsService';
import { checkDailyLimit, incrementDailyUsage } from '../services/statsService';
import PremiumModal from '../components/PremiumModal';
import { Send, User, Bot, Volume2, VolumeX, Mic, MicOff, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useLocation } from 'react-router-dom';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';
import { Capacitor } from '@capacitor/core';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  "I feel worried",
  "Verses for sleep",
  "Explain John 3:16",
  "How to pray?",
  "Comfort in sorrow"
];

const MessageItem = React.memo(({
  message,
  theme,
  speakingMessageId,
  isLoadingAudio,
  onSpeak
}: {
  message: Message;
  theme: string;
  speakingMessageId: string | null;
  isLoadingAudio: boolean;
  onSpeak: (text: string, id: string) => void;
}) => {
  const isSpeaking = speakingMessageId === message.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`}
    >
      <div className={`max-w-[88%] rounded-[2.2rem] px-6 py-4 transition-all duration-300 ${message.role === 'user'
        ? (theme === 'dark' ? 'bg-sacred-amber text-white rounded-br-none shadow-lg shadow-sacred-amber/10' : 'bg-stone-900 text-stone-50 rounded-br-none shadow-xl shadow-stone-900/10')
        : (theme === 'dark' ? 'glass-dark text-stone-100 rounded-bl-none border-sacred-amber/20' : 'glass-light text-stone-900 rounded-bl-none border-sacred-amber/10 shadow-inner')
        }`}>
        {message.role === 'user' ? (
          <p className="whitespace-pre-wrap leading-relaxed font-medium">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed font-serif italic text-lg opacity-90">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Audio Control for Assistant Messages */}
      {message.role === 'assistant' && message.content && (
        <div className="flex items-center gap-3 mt-3 ml-2">
          <button
            onClick={() => onSpeak(message.content, message.id)}
            className={`p-2.5 rounded-2xl transition-all relative ${isSpeaking ? 'bg-sacred-amber text-white' : 'text-stone-400 hover:bg-sacred-amber/10 hover:text-sacred-amber'}`}
            title="Listen to response"
            disabled={isLoadingAudio && !isSpeaking && speakingMessageId !== null}
          >
            {isSpeaking && !isLoadingAudio && (
              <motion.div
                layoutId={`pulse-${message.id}`}
                className="absolute inset-0 rounded-2xl bg-sacred-amber/30"
                animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
            {isSpeaking ? (
              isLoadingAudio ? <Loader2 size={16} className="animate-spin" /> : <VolumeX size={16} className="relative z-10" />
            ) : (
              <Volume2 size={16} />
            )}
          </button>

          {isSpeaking && !isLoadingAudio && (
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sacred-amber animate-pulse">
              The Father is speaking...
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
});

export default function ChatScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: 'Peace be with you, my child. How may I guide you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [isPremiumModalOpen, setIsPremiumModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const isSendingRef = useRef(false);
  const initialPromptHandled = useRef(false);
  const handleSendRef = useRef<any>(null);

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

  const handleSpeak = React.useCallback(async (text: string, id: string) => {
    if (speakingMessageId === id) {
      stopAudio();
      setSpeakingMessageId(null);
      setIsLoadingAudio(false);
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
  }, [speakingMessageId]);
  useEffect(() => {
    handleSendRef.current = handleSend;
  });

  useEffect(() => {
    const initSpeech = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { available } = await SpeechRecognition.available();
          setIsSpeechSupported(available);
          if (available) {
            await SpeechRecognition.requestPermissions();
          }
        } catch (e) {
          console.error("Speech recognition init failed", e);
          setIsSpeechSupported(false);
        }
      } else {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
          const WebSpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
          recognitionRef.current = new WebSpeechRecognition();
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.lang = 'en-US';

          recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(transcript);
            if (handleSendRef.current) {
              handleSendRef.current(transcript);
            }
          };

          recognitionRef.current.onend = () => {
            setIsListening(false);
          };

          recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
          };
        } else {
          setIsSpeechSupported(false);
        }
      }
    };
    initSpeech();
  }, []);

  const toggleListening = async () => {
    if (!isSpeechSupported) {
      alert("Voice input is not supported on your device.");
      return;
    }

    if (isListening) {
      if (Capacitor.isNativePlatform()) {
        await SpeechRecognition.stop();
      } else {
        recognitionRef.current?.stop();
      }
      setIsListening(false);
    } else {
      setIsListening(true);
      if (Capacitor.isNativePlatform()) {
        try {
          const { matches } = await SpeechRecognition.start({
            language: 'en-US',
            maxResults: 1,
            prompt: 'Speak now',
            partialResults: false,
            popup: true,
          });
          if (matches && matches.length > 0) {
            setInput(matches[0]);
            if (handleSendRef.current) {
              handleSendRef.current(matches[0]);
            }
          }
        } catch (e) {
          console.error("Speech recognition failed", e);
        } finally {
          setIsListening(false);
        }
      } else {
        recognitionRef.current?.start();
      }
    }
  };

  const handleSend = async (text: string = input) => {
    const cleanText = typeof text === 'string' ? text.trim() : '';
    if (!cleanText || isLoading || isSendingRef.current) return;

    // Stop listening if manually sending
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

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
      await sendMessageStream(
        cleanText,
        history,
        user?.preferences,
        (chunk) => {
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
    <div className={`flex flex-col h-[calc(100vh-4rem)] md:h-screen ${theme === 'dark' ? 'text-stone-100' : 'text-stone-900'} relative overflow-hidden`}>
      <PremiumModal
        isOpen={isPremiumModalOpen}
        onClose={() => setIsPremiumModalOpen(false)}
        onUpgrade={() => setIsPremiumModalOpen(false)}
      />

      {/* Floating Header */}
      <div className={`fixed top-0 left-0 right-0 z-30 p-4 pt-safe-4 backdrop-blur-2xl border-b transition-all ${theme === 'dark' ? 'bg-stone-950/60 border-white/5' : 'bg-white/60 border-sacred-amber/10'}`}>
        <div className="max-w-4xl mx-auto flex justify-between items-center px-4">
          <div className="flex flex-col items-center mx-auto group">
            <h1 className="text-xl font-black font-serif italic flex items-center gap-3 transition-transform group-hover:scale-105 duration-500">
              <div className="relative">
                <Bot className="text-sacred-amber" size={26} />
                <motion.div
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity }}
                  className="absolute inset-x-0 -bottom-1 h-1 bg-sacred-amber blur-md rounded-full"
                />
              </div>
              <span className="tracking-tight">Father AI</span>
            </h1>
            <div className="flex items-center gap-2 mt-1 opacity-40">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] font-black uppercase tracking-[0.25em]">Divine Connection</span>
            </div>
          </div>

          {speakingMessageId && (
            <button
              onClick={() => {
                stopAudio();
                setSpeakingMessageId(null);
                setIsLoadingAudio(false);
              }}
              className="absolute right-8 p-2.5 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/10 active:scale-90 transition-all"
            >
              <VolumeX size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Messages: With top padding for floating header */}
      <div className="flex-1 overflow-y-auto p-4 pt-24 pb-48 space-y-6 max-w-4xl mx-auto w-full">
        {messages.map((msg) => (
          <MessageItem
            key={msg.id}
            message={msg}
            theme={theme}
            speakingMessageId={speakingMessageId}
            isLoadingAudio={isLoadingAudio}
            onSpeak={handleSpeak}
          />
        ))}
        {isLoading && messages[messages.length - 1].role === 'user' && (
          <div className="flex justify-start">
            <div className={`p-4 rounded-[2rem] ${theme === 'dark' ? 'glass-dark' : 'glass-light'}`}>
              <div className="flex space-x-2">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input System */}
      <div className="fixed bottom-32 left-4 right-4 md:bottom-12 z-40 max-w-4xl mx-auto">

        {/* Suggested Prompts: Elegant & Centered */}
        {messages.length === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2.5 overflow-x-auto no-scrollbar pb-6 px-4 justify-center"
          >
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handleSend(prompt)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border transition-all active:scale-95 shadow-sm ${theme === 'dark'
                  ? 'bg-stone-900/60 border-white/10 text-stone-300 hover:bg-stone-800'
                  : 'bg-white/70 backdrop-blur-md border-sacred-amber/10 text-stone-600 hover:bg-white'
                  }`}
              >
                {prompt}
              </button>
            ))}
          </motion.div>
        )}

        <div className={`rounded-[2.8rem] p-2.5 border shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] transition-all duration-500 ${theme === 'dark' ? 'glass-dark border-white/10' : 'glass-light border-white shadow-xl shadow-sacred-amber/10'} ${isLoading ? 'opacity-80 scale-[0.98]' : 'hover:scale-[1.01]'}`}>
          <div className="flex gap-2.5">
            <button
              onClick={toggleListening}
              className={`p-4 rounded-[1.8rem] transition-all active:scale-90 relative ${isListening
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/40'
                : (theme === 'dark' ? 'bg-white/5 text-stone-400 hover:text-sacred-amber hover:bg-sacred-amber/10' : 'bg-sacred-cream/50 text-stone-500 hover:bg-sacred-amber/10 hover:text-sacred-amber')
                }`}
            >
              {isListening && (
                <motion.div
                  animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute inset-0 rounded-[1.8rem] bg-red-400/30"
                />
              )}
              {isListening ? <MicOff size={22} strokeWidth={2.5} className="relative z-10" /> : <Mic size={22} strokeWidth={2.5} />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isListening ? "Listening for your heart..." : "Inquire of the Father..."}
              className={`flex-1 px-4 text-base font-medium bg-transparent border-none focus:ring-0 placeholder-stone-400/60 dark:placeholder-stone-500/60`}
              disabled={isLoading}
            />

            <button
              onClick={() => handleSend()}
              disabled={isLoading || !input.trim()}
              className={`p-4 rounded-[1.8rem] bg-sacred-amber text-white transition-all shadow-lg active:scale-90 ${isLoading || !input.trim() ? 'opacity-30 grayscale' : 'hover:bg-sacred-amber-dark shadow-sacred-amber/20'}`}
            >
              {isLoading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} strokeWidth={2.5} />}
            </button>
          </div>
        </div>

        <p className="mt-5 text-[9px] font-black uppercase tracking-[0.3em] text-center opacity-30 px-10 leading-relaxed font-serif italic">
          Sacred guidance for the soul. Not a substitute for professional counsel.
        </p>
      </div>
    </div>
  );
}
