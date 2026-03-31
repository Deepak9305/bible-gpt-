import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { StorageService } from './storageService';
import { Capacitor } from '@capacitor/core';

let currentCallId = 0; // Incremented on every new playback — used to detect superseded calls
const PREFERRED_VOICE_KEY = 'preferred_tts_voice';

// Target voice name fragments (lowercase). Google Neural2 voices are Android-only.
const FATHER_VOICE_ID = 'neural2-j';  // Matches "en-US-Neural2-J" and "Google en-US-Neural2-J"
const MOTHER_VOICE_ID = 'neural2-f';  // Matches "en-US-Neural2-F" — NOT a prefix of Neural2-J

export const stopAudio = async () => {
  currentCallId++; // Invalidate any in-flight call
  try {
    await TextToSpeech.stop();
  } catch (e) {
    console.warn("Failed to stop TTS", e);
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

/**
 * Find a voice by matching name or voiceURI (case-insensitive).
 */
const findVoiceByTarget = (voices: any[], targetId: string): { voice: any; index: number } | null => {
  const target = targetId.toLowerCase();
  const idx = voices.findIndex(v => {
    const name = (v.name || '').toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    // Replace spaces with dashes for "Google en-US-Neural2-J" -> "google-en-us-neural2-j"
    const nameNorm = name.replace(/\s+/g, '-');
    return name.includes(target) || uri.includes(target) || nameNorm.includes(target);
  });
  return idx !== -1 ? { voice: voices[idx], index: idx } : null;
};

export const getCuratedVoices = async () => {
  try {
    const { voices } = await TextToSpeech.getSupportedVoices();

    const curated: any[] = [];

    // --- 1. Target User's Specific Choices (Neural2) ---
    const fatherMatch = findVoiceByTarget(voices, FATHER_VOICE_ID);
    if (fatherMatch) {
      curated.push({
        label: "Father's Voice",
        index: fatherMatch.index,
        voice: fatherMatch.voice,
        pitch: 0.75,
        rate: 0.9,
      });
    }

    const motherMatch = findVoiceByTarget(voices, MOTHER_VOICE_ID);
    if (motherMatch && motherMatch.index !== fatherMatch?.index) {
      curated.push({
        label: "Mother's Voice",
        index: motherMatch.index,
        voice: motherMatch.voice,
        pitch: 1.3,
        rate: 0.9,
      });
    }

    // --- 2. Robust Fallback for Web/iOS/Other Android ---
    if (curated.length === 0) {
      // Filter to English voices
      const enVoices = voices.filter(v => (v.lang || '').startsWith('en') || (v.voiceURI || '').includes('en-'));

      // Explicit lists of known names to prevent "Google US English" (which is female) from being picked for male.
      const explicitMale = ['male', 'guy', 'david', 'mark', 'james', 'arthur', 'daniel', 'brian', 'george', 'fred', 'alex', 'tom'];
      const explicitFemale = ['female', 'woman', 'girl', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'fiona', 'tessa', 'veena', 'google us english'];

      const findFallback = (isMale: boolean) => {
        const patterns = isMale ? explicitMale : explicitFemale;
        const opposite = isMale ? explicitFemale : explicitMale;

        // 1. Explicit Gender Matches (Safest)
        const explicitMatch = enVoices.find(v => {
          const n = v.name.toLowerCase();
          return patterns.some(p => n.includes(p)) && !opposite.some(p => n.includes(p));
        });
        if (explicitMatch) return explicitMatch;

        // 2. Google / Premium Voice with appropriate gender exclusion
        const secondary = enVoices.find(v => {
          const n = v.name.toLowerCase();
          // If we want MALE, we MUST NOT pick voices explicitly female. 
          // Note: Many generic names (like 'en-us-x-sfg-local') have no explicit gender in the name.
          if (opposite.some(p => n.includes(p))) return false;
          return n.includes('google') || n.includes('network') || n.includes('neural') || n.includes('wavenet') || n.includes('premium');
        });
        if (secondary) return secondary;

        // 3. Just pick anything that isn't explicitly the opposite gender
        return enVoices.find(v => {
          const n = v.name.toLowerCase();
          return !opposite.some(p => n.includes(p));
        }) ?? null;
      };

      const bestMale = findFallback(true);
      // For bestFemale, don't pick the same as bestMale
      const availableFemales = enVoices.filter(v => v !== bestMale);
      const bestFemale = availableFemales.find(v => {
        const n = v.name.toLowerCase();
        return explicitFemale.some(p => n.includes(p));
      }) || availableFemales[0]; // Just take first available if no explicit female found

      if (bestMale) {
        curated.push({ label: "Father's Voice", index: voices.indexOf(bestMale), voice: bestMale, pitch: 0.75, rate: 0.9 });
      }
      if (bestFemale && bestFemale !== bestMale) {
        curated.push({ label: "Mother's Voice", index: voices.indexOf(bestFemale), voice: bestFemale, pitch: 1.3, rate: 0.9 });
      }

      // 3. Absolute Last Resort emergency fallback
      if (curated.length === 0 && enVoices.length > 0) {
        curated.push({ label: "Father's Voice", index: voices.indexOf(enVoices[0]), voice: enVoices[0], pitch: 0.75, rate: 0.9 });
        if (enVoices[1]) curated.push({ label: "Mother's Voice", index: voices.indexOf(enVoices[1]), voice: enVoices[1], pitch: 1.3, rate: 0.9 });
      }
    }

    return curated;
  } catch (e) {
    console.error("Failed to get curated voices", e);
    return [];
  }
};

// Remote/Dynamic Config (Hybrid-Hybrid Model)
let remotePitch = 0.75;
let remoteRate = 0.9;

const getVoiceConfig = async () => {
  const curated = await getCuratedVoices();
  const preferredIdx = await getPreferredVoiceIndex();

  if (preferredIdx !== undefined) {
    const matched = curated.find(v => v.index === preferredIdx);
    if (matched) return matched;
    // User manually picked an unlisted voice — use remote defaults
    return { index: preferredIdx, pitch: remotePitch, rate: remoteRate };
  }

  // Default: Father's Voice (first curated)
  if (curated.length > 0) return curated[0];

  return { index: undefined, pitch: remotePitch, rate: remoteRate };
};

export const updateRemoteTtsConfig = (pitch?: number, rate?: number) => {
  if (pitch !== undefined) remotePitch = pitch;
  if (rate !== undefined) remoteRate = rate;
};

export const playTextToSpeech = async (text: string, onEnded?: () => void): Promise<void> => {
  await stopAudio(); // Also increments currentCallId
  const myCallId = currentCallId;

  // Guard against empty or whitespace-only text
  let cleanText = text
    .replace(/[*_>#`]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\|/g, ',')
    .replace(/\[|\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  cleanText = cleanText
    .replace(/\s+\./g, '.')
    .replace(/\s+,/g, ',');

  if (!cleanText) {
    if (onEnded) onEnded();
    return;
  }

  // If another call superseded us while we were awaiting stopAudio, bail out
  if (myCallId !== currentCallId) return;

  try {
    const config = await getVoiceConfig();

    // Check again after the async getVoiceConfig call
    if (myCallId !== currentCallId) return;

    console.log('[TTS] Speaking with config:', JSON.stringify({
      voice: config.voice?.name,
      index: config.index,
      pitch: config.pitch ?? remotePitch,
      rate: config.rate ?? remoteRate,
    }));

    // Capacitor TTS plugin crashes on Android if `voice` is null.
    const voiceIndex = typeof config.index === 'number' ? config.index : undefined;

    await TextToSpeech.speak({
      text: cleanText,
      voice: voiceIndex,
      rate: config.rate ?? remoteRate,
      pitch: config.pitch ?? remotePitch,
      volume: 1.0,
      category: 'ambient',
    });

    // Only fire onEnded if this call wasn't superseded
    if (myCallId === currentCallId && onEnded) onEnded();
  } catch (error) {
    console.error("TTS Error:", error);
    if (myCallId === currentCallId && onEnded) onEnded();
  }
};
