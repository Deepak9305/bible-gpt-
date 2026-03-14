import { GoogleGenAI } from "@google/genai";

let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let lastRequestId = 0;

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is missing. TTS may not work.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const stopAudio = () => {
  lastRequestId++; // Invalidate any pending requests
  if (currentSource) {
    try {
      currentSource.stop();
    } catch (e) {
      // Ignore if already stopped
    }
    currentSource = null;
  }
  // Also stop native speech synthesis
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
};

export const playTextToSpeech = async (text: string, onEnded?: () => void): Promise<void> => {
  stopAudio();
  const requestId = lastRequestId;

  const ai = getAiClient();
  if (!ai) {
    console.error("No API key for TTS");
    if (onEnded) onEnded();
    return;
  }

  try {
    // Initialize AudioContext on user interaction
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }

    // Clean text for TTS (remove markdown)
    const cleanText = text.replace(/[*_>#`]/g, '').trim();
    if (!cleanText) {
      if (onEnded) onEnded();
      return;
    }

    // Check if we've been cancelled while waiting for audio context
    if (requestId !== lastRequestId) return;

    // Call Gemini TTS
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: cleanText }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Fenrir' },
          },
        },
      },
    });

    // Check if we've been cancelled while waiting for API
    if (requestId !== lastRequestId) return;

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      console.error("Full response:", JSON.stringify(response, null, 2));
      throw new Error("No audio data received from API");
    }

    // Decode Base64 to ArrayBuffer
    const binaryString = window.atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Gemini TTS returns raw PCM (16-bit, mono, 24kHz)
    const pcmData = new Int16Array(bytes.buffer);
    const audioBuffer = audioContext.createBuffer(1, pcmData.length, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    // Convert 16-bit signed PCM to float [-1, 1]
    for (let i = 0; i < pcmData.length; i++) {
      channelData[i] = pcmData[i] / 32768.0;
    }

    // Final check before starting playback
    if (requestId !== lastRequestId) return;

    // Play Audio
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    source.onended = () => {
      if (currentSource === source) {
        currentSource = null;
        if (onEnded) onEnded();
      }
    };

    currentSource = source;
    source.start(0);

  } catch (error) {
    console.error("TTS Error:", error);
    if (requestId === lastRequestId && onEnded) onEnded();
  }
};
