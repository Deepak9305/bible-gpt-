import { TextToSpeech } from '@capacitor-community/text-to-speech';

let isSpeaking = false;

export const stopAudio = async () => {
  try {
    await TextToSpeech.stop();
    isSpeaking = false;
  } catch (e) {
    console.error("Failed to stop TTS", e);
  }
};

export const playTextToSpeech = async (text: string, onEnded?: () => void): Promise<void> => {
  await stopAudio();
  
  try {
    const cleanText = text.replace(/[*_>#`]/g, '').trim();
    if (!cleanText) {
      if (onEnded) onEnded();
      return;
    }

    isSpeaking = true;
    await TextToSpeech.speak({
      text: cleanText,
      rate: 1.0,
      pitch: 1.0,
      volume: 1.0,
      category: 'ambient',
    });
    
    isSpeaking = false;
    if (onEnded) onEnded();
  } catch (error) {
    console.error("TTS Error:", error);
    isSpeaking = false;
    if (onEnded) onEnded();
  }
};
