import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { StorageService } from './storageService';
import { Capacitor } from '@capacitor/core';

let isSpeaking = false;
const PREFERRED_VOICE_KEY = 'preferred_tts_voice';

// Target voice name fragments (lowercase). Google Neural2 voices are Android-only.
const FATHER_VOICE_ID = 'neural2-j';  // Matches "en-US-Neural2-J" and "Google en-US-Neural2-J"
const MOTHER_VOICE_ID = 'neural2-f';  // Matches "en-US-Neural2-F" — NOT a prefix of Neural2-J

export const stopAudio = async () => {
  try {
    await TextToSpeech.stop();
    isSpeaking = false;
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
 * Android Neural2 voices: "en-US-Neural2-J", "Google en-US-Neural2-J"
 * iOS voices: "Samantha" with voiceURI "com.apple.voice..."
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
    const isAndroid = Capacitor.getPlatform() === 'android';

    const curated: any[] = [];

    // Neural2 voices are Google-specific and only available on Android
    if (isAndroid) {
      // --- Father's Voice: en-US-Neural2-J ---
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

      // --- Mother's Voice: en-US-Neural2-F ---
      // BUG FIX: Check that motherMatch is not the same voice as fatherMatch.
      // 'neural2-f' cannot match 'neural2-j', but we guard anyway.
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
    }

    // --- Fallback: Neural2 not available (iOS, or Android without Google TTS) ---
    if (curated.length === 0) {
      if (isAndroid) {
        console.warn('[TTS] Neural2 voices not found on Android. Falling back to best available.');
      } else {
        console.info('[TTS] iOS detected - using best available English voices.');
      }

      const enVoices = voices.filter(v => (v.lang || '').startsWith('en'));

      const malePatterns = ['male', 'guy', 'man', 'david', 'mark', 'james', 'richard', 'george', 'stefan', 'peter', 'arthur', 'daniel', 'fred', 'tom', 'alex'];
      const femalePatterns = ['female', 'girl', 'woman', 'zira', 'susan', 'catherine', 'samantha', 'victoria', 'karen', 'moira', 'fiona', 'tessa', 'veena'];

      const findFallback = (isMale: boolean) => {
        const patterns = isMale ? malePatterns : femalePatterns;
        const opposite = isMale ? femalePatterns : malePatterns;

        // 1. Google voice with gender signal
        const google = enVoices.find(v => {
          const n = v.name.toLowerCase();
          if (isMale) return n.includes('google') && !n.includes('female') && !n.includes('woman');
          return n.includes('google') && (n.includes('female') || n.includes('woman'));
        });
        if (google) return google;

        // 2. Premium/neural voice with gender match
        const premium = enVoices.find(v => {
          const n = v.name.toLowerCase();
          return patterns.some(p => n.includes(p)) && !opposite.some(p => n.includes(p)) &&
            (n.includes('neural') || n.includes('wavenet') || n.includes('premium') || n.includes('enhanced'));
        });
        if (premium) return premium;

        // 3. Any gender-matched voice
        return enVoices.find(v => {
          const n = v.name.toLowerCase();
          return patterns.some(p => n.includes(p)) && !opposite.some(p => n.includes(p));
        }) ?? null;
      };

      const bestMale = findFallback(true);
      const bestFemale = findFallback(false);

      if (bestMale) curated.push({ label: "Father's Voice", index: voices.indexOf(bestMale), voice: bestMale, pitch: 0.75, rate: 0.9 });
      if (bestFemale && bestFemale !== bestMale)
        curated.push({ label: "Mother's Voice", index: voices.indexOf(bestFemale), voice: bestFemale, pitch: 1.3, rate: 0.9 });

      // Absolute last resort: first two English voices
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
  // BUG FIX: Always await stopAudio to ensure previous playback fully stops
  // before starting new playback. Not awaiting caused race conditions.
  await stopAudio();

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

  try {
    const config = await getVoiceConfig();

    console.log('[TTS] Speaking with config:', JSON.stringify({
      voice: config.voice?.name,
      index: config.index,
      pitch: config.pitch ?? remotePitch,
      rate: config.rate ?? remoteRate,
    }));

    isSpeaking = true;

    // BUG FIX: `voice` must be a number or undefined. Never pass null.
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

    isSpeaking = false;
    if (onEnded) onEnded();
  } catch (error) {
    console.error("TTS Error:", error);
    isSpeaking = false;
    if (onEnded) onEnded();
  }
};
