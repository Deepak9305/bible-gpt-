import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { StorageService } from './storageService';
import { Capacitor } from '@capacitor/core';

let currentCallId = 0; // Incremented on every new playback — used to detect superseded calls
const PREFERRED_VOICE_KEY = 'preferred_tts_voice';

// High-quality voice targets ordered by preference
const PREFERRED_MALE_VOICES = [
  'arthur', 'aaron', 'daniel', 'en-us-neural2-j', 'en-us-neural2-d', 'en-us-wavenet-d', 'en-gb-wavenet-d', 'google-en-us-local-d'
];
const PREFERRED_FEMALE_VOICES = [
  'samantha', 'martha', 'nicky', 'en-us-neural2-f', 'en-us-neural2-h', 'en-us-wavenet-f', 'en-gb-wavenet-a', 'google-en-us-local-f'
];

/**
 * Find the best voice matching a list of preferred names (case-insensitive).
 */
const findBestVoice = (voices: any[], preferredNames: string[]): { voice: any; index: number } | null => {
  for (const target of preferredNames) {
    const targetLower = target.toLowerCase();
    const idx = voices.findIndex(v => {
      const name = (v.name || '').toLowerCase();
      const uri = (v.voiceURI || '').toLowerCase();
      const nameNorm = name.replace(/\s+/g, '-');
      return name.includes(targetLower) || uri.includes(targetLower) || nameNorm.includes(targetLower);
    });
    if (idx !== -1) return { voice: voices[idx], index: idx };
  }
  return null;
};

export const getCuratedVoices = async () => {
  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    const curated: any[] = [];

    // Filter to English voices first
    const enVoices = voices.filter(v => (v.lang || '').toLowerCase().startsWith('en') || (v.voiceURI || '').toLowerCase().includes('en-'));
    
    if (enVoices.length === 0) return curated; // Fallback to system default if no English voices

    // --- 1. Find Best Male Voice (Father) ---
    const fatherMatch = findBestVoice(enVoices, PREFERRED_MALE_VOICES);
    
    // --- 2. Find Best Female Voice (Mother) ---
    const motherMatch = findBestVoice(enVoices, PREFERRED_FEMALE_VOICES);

    // --- 3. Fallbacks if preferred not found ---
    const explicitMale = ['male', 'guy', 'david', 'mark', 'james', 'brian', 'george'];
    const explicitFemale = ['female', 'woman', 'girl', 'zira', 'victoria', 'karen', 'moira', 'tessa'];

    let bestMale = fatherMatch?.voice;
    let bestMaleIdx = fatherMatch ? voices.indexOf(fatherMatch.voice) : -1;
    let bestFemale = motherMatch?.voice;
    let bestFemaleIdx = motherMatch ? voices.indexOf(motherMatch.voice) : -1;

    if (!bestMale) {
      const fallbackMale = enVoices.find(v => {
        const n = v.name.toLowerCase();
        return explicitMale.some(p => n.includes(p)) && !explicitFemale.some(p => n.includes(p));
      }) || enVoices.find(v => {
         const n = v.name.toLowerCase();
         return !explicitFemale.some(p => n.includes(p)) && (n.includes('google') || n.includes('network'));
      }) || enVoices[0];
      
      bestMale = fallbackMale;
      bestMaleIdx = fallbackMale ? voices.indexOf(fallbackMale) : -1;
    }

    if (!bestFemale) {
       const fallbackFemale = enVoices.find(v => {
        const n = v.name.toLowerCase();
        return explicitFemale.some(p => n.includes(p)) && v !== bestMale;
      }) || enVoices.find(v => v !== bestMale);
      
      bestFemale = fallbackFemale;
      bestFemaleIdx = fallbackFemale ? voices.indexOf(fallbackFemale) : -1;
    }

    // --- 4. Add to Curated List ---
    if (bestMale && bestMaleIdx !== -1) {
      curated.push({
        label: "Father's Voice",
        index: bestMaleIdx,
        voice: bestMale,
        pitch: 0.9, // Adjusted for more natural sound
        rate: 0.95,
      });
    }

    if (bestFemale && bestFemaleIdx !== -1 && bestFemaleIdx !== bestMaleIdx) {
      curated.push({
        label: "Mother's Voice",
        index: bestFemaleIdx,
        voice: bestFemale,
        pitch: 1.1, // Adjusted for more natural sound
        rate: 0.95,
      });
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
