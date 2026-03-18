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

export const getCuratedVoices = async () => {
  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    const enVoices = voices.filter(v => v.lang.startsWith('en'));
    if (enVoices.length === 0) return [];

    const malePatterns = ['male', 'guy', 'father', 'man', 'david', 'mark', 'james', 'richard', 'george', 'stefan', 'peter', 'arthur', 'daniel'];
    const femalePatterns = ['female', 'girl', 'mother', 'woman', 'zira', 'susan', 'catherine'];

    const getBest = (isMale: boolean) => {
      const targetPatterns = isMale ? malePatterns : femalePatterns;
      const oppositePatterns = isMale ? femalePatterns : malePatterns;

      // 1. Target "Google" voices first as they are consistent across Android
      const googleVoice = enVoices.find(v => {
        const name = v.name.toLowerCase();
        return name.includes('google') && name.includes('us english') && (isMale ? !name.includes('female') : name.includes('female'));
      });
      if (googleVoice) return googleVoice;

      // 2. High quality premium voices fallback
      const premiumVoices = enVoices.filter(v => {
        const name = v.name.toLowerCase();
        const matchesTarget = targetPatterns.some(p => name.includes(p)) && !oppositePatterns.some(p => name.includes(p));
        const isPremium = name.includes('studio') || name.includes('neural') || name.includes('pro') || name.includes('premium') || name.includes('enhanced') || name.includes('natural') || name.includes('wavenet');
        return matchesTarget && isPremium;
      });

      if (premiumVoices.length > 0) {
        return premiumVoices.sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          if (nameA.includes('studio') && !nameB.includes('studio')) return -1;
          if (nameA.includes('neural') && !nameB.includes('neural')) return -1;
          return 0;
        })[0];
      }

      // 3. Basic fallback
      const basicVoices = enVoices.filter(v => {
        const name = v.name.toLowerCase();
        return targetPatterns.some(p => name.includes(p)) && !oppositePatterns.some(p => name.includes(p));
      });

      if (basicVoices.length > 0) return basicVoices[0];

      return null;
    };

    const bestMale = getBest(true);
    const bestFemale = getBest(false);

    const curated = [];
    if (bestMale) curated.push({ label: 'Father (Male)', index: voices.indexOf(bestMale), voice: bestMale });
    if (bestFemale && bestFemale !== bestMale) curated.push({ label: 'Mother (Female)', index: voices.indexOf(bestFemale), voice: bestFemale });

    // Extreme fallback if filtering fails completely
    if (curated.length === 0) {
      if (enVoices[0]) curated.push({ label: 'Default Voice 1', index: voices.indexOf(enVoices[0]), voice: enVoices[0] });
      if (enVoices[1]) curated.push({ label: 'Default Voice 2', index: voices.indexOf(enVoices[1]), voice: enVoices[1] });
    }

    return curated;
  } catch (e) {
    console.error("Failed to get curated voices", e);
    return [];
  }
};

const getVoiceToUse = async () => {
  const preferredIdx = await getPreferredVoiceIndex();
  if (preferredIdx !== undefined) return preferredIdx;

  const curated = await getCuratedVoices();
  if (curated.length > 0) return curated[0].index;

  return undefined;
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

    // 2. Respiratory Pre-processing: Standard punctuation is usually better for modern engines
    // Remove the artificial '...' stuttering and use natural punctuation for better flow.
    cleanText = cleanText
      .replace(/\s+\./g, '.')
      .replace(/\s+,/g, ',');

    if (!cleanText) {
      if (onEnded) onEnded();
      return;
    }

    const voiceIdx = await getVoiceToUse();

    isSpeaking = true;
    await TextToSpeech.speak({
      text: cleanText,
      voice: voiceIdx,
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
