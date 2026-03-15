import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { StorageService } from './storageService';

let isSpeaking = false;
const PREFERRED_VOICE_KEY = 'preferred_tts_voice';

export const stopAudio = async () => {
  try {
    await TextToSpeech.stop();
    isSpeaking = false;
  } catch (e) {
    console.error("Failed to stop TTS", e);
  }
};

export const getVoices = async () => {
  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    return voices;
  } catch (e) {
    console.error("Failed to get voices", e);
    return [];
  }
};

export const setPreferredVoice = async (voiceIndex: number | undefined) => {
  if (voiceIndex === undefined) {
    await StorageService.remove(PREFERRED_VOICE_KEY);
  } else {
    await StorageService.set(PREFERRED_VOICE_KEY, voiceIndex.toString());
  }
};

export const getPreferredVoiceIndex = async (): Promise<number | undefined> => {
  const stored = await StorageService.get(PREFERRED_VOICE_KEY);
  return stored ? parseInt(stored, 10) : undefined;
};

const getMaleVoice = async () => {
  try {
    // Check if user has a preference first
    const preferredIdx = await getPreferredVoiceIndex();
    if (preferredIdx !== undefined) return preferredIdx;

    const { voices } = await TextToSpeech.getSupportedVoices();

    // Comprehensive list of keywords/names likely to be male
    const malePatterns = ['male', 'guy', 'father', 'man', 'david', 'mark', 'james', 'richard', 'george', 'sam', 'stefan', 'jason', 'peter', 'oliver', 'harry'];
    const femalePatterns = ['female', 'girl', 'mother', 'woman', 'zira', 'hazel', 'susan', 'catherine', 'linda', 'elena', 'serena', 'martha', 'victoria'];

    // 1. Filter English voices
    const enVoices = voices.filter(v => v.lang.startsWith('en'));

    // 2. Prioritize "Studio", "Neural", "Pro", or "Premium" male voices for high-fidelity "attractive" sound
    const attractiveMaleVoices = enVoices.filter(v => {
      const name = v.name.toLowerCase();
      const isMale = malePatterns.some(p => name.includes(p)) && !femalePatterns.some(p => name.includes(p));
      const isPremium = name.includes('studio') || name.includes('neural') || name.includes('pro') || name.includes('premium') || name.includes('enhanced') || name.includes('natural') || name.includes('wavenet');
      return isMale && isPremium;
    });

    if (attractiveMaleVoices.length > 0) {
      // Prioritize "Studio" or "Wavenet" or "Neural" if specifically found
      const bestVoice = attractiveMaleVoices.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA.includes('studio') && !nameB.includes('studio')) return -1;
        if (nameA.includes('neural') && !nameB.includes('neural')) return -1;
        return 0;
      })[0];
      return voices.indexOf(bestVoice);
    }

    // 3. Fallback to any male voice
    const maleVoices = enVoices.filter(v => {
      const name = v.name.toLowerCase();
      return malePatterns.some(p => name.includes(p)) && !femalePatterns.some(p => name.includes(p));
    });

    if (maleVoices.length > 0) {
      return voices.indexOf(maleVoices[0]);
    }

    const enVoiceIdx = voices.findIndex(v => v.lang.startsWith('en'));
    return enVoiceIdx !== -1 ? enVoiceIdx : undefined;
  } catch (e) {
    return undefined;
  }
};

// Remote/Dynamic Config (Hybrid-Hybrid Model)
let remotePitch = 0.7;
let remoteRate = 0.9;

export const updateRemoteTtsConfig = (pitch?: number, rate?: number) => {
  if (pitch !== undefined) remotePitch = pitch;
  if (rate !== undefined) remoteRate = rate;
};

export const playTextToSpeech = async (text: string, onEnded?: () => void): Promise<void> => {
  await stopAudio();

  try {
    // 1. Robust text cleaning for "smoothness"
    let cleanText = text
      .replace(/[*_>#`]/g, '') // Strip markdown
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Strip emojis
      .replace(/\|/g, ',') // Replace pipes with pauses
      .replace(/\[|\]/g, ' ') // Strip brackets
      .replace(/\s+/g, ' ') // Collapse whitespace
      .trim();

    // 2. Respiratory Pre-processing: Add slight pauses for a more "human" breath/rhythm
    // We add extra punctuation specifically to force the TTS engine to pause more naturally.
    cleanText = cleanText
      .replace(/\.(?!\d)/g, '. ... ') // Longer pause after sentences
      .replace(/,(?!\d)/g, ', ... ') // Slight pause after commas
      .replace(/\?(?!\d)/g, '? ... ') // Pause after questions
      .replace(/!(?!\d)/g, '! ... '); // Pause after exclamations

    if (!cleanText) {
      if (onEnded) onEnded();
      return;
    }

    const voice = await getMaleVoice();

    isSpeaking = true;
    await TextToSpeech.speak({
      text: cleanText,
      voice: voice,
      rate: remoteRate,   // Use remote/dynamic rate
      pitch: remotePitch, // Use remote/dynamic pitch
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
