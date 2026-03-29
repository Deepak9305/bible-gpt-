import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { StorageService } from './storageService';

let isSpeaking = false;
const PREFERRED_VOICE_KEY = 'preferred_tts_voice';

// Target voice names (lowercase) — we match anywhere in the full voice name
const FATHER_VOICE_ID = 'en-us-neural2-j';
const MOTHER_VOICE_ID = 'en-us-neural2-f';

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

/**
 * Find a voice by matching its name or voiceURI.
 * Android voices can come as "en-US-Neural2-J" or "Google en-US-Neural2-J"
 * The match is done case-insensitively on both `name` and `lang` fields.
 */
const findVoiceByTarget = (voices: any[], targetId: string): { voice: any; index: number } | null => {
  const target = targetId.toLowerCase();
  const idx = voices.findIndex(v => {
    const name = (v.name || '').toLowerCase();
    const uri = (v.voiceURI || '').toLowerCase();
    return name.includes(target) || uri.includes(target) || name.replace(/\s/g, '-').includes(target);
  });
  return idx !== -1 ? { voice: voices[idx], index: idx } : null;
};

export const getCuratedVoices = async () => {
  try {
    const { voices } = await TextToSpeech.getSupportedVoices();

    const curated: any[] = [];

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

    // --- Fallback: if Neural2 voices not found on device, pick best English voices ---
    if (curated.length === 0) {
      console.warn('[TTS] Neural2 voices not found, falling back to best available English voices.');
      const enVoices = voices.filter(v => v.lang?.startsWith('en'));

      const malePatterns = ['male', 'guy', 'father', 'man', 'david', 'mark', 'james', 'richard', 'george', 'stefan', 'peter', 'arthur', 'daniel'];
      const femalePatterns = ['female', 'girl', 'mother', 'woman', 'zira', 'susan', 'catherine'];
      const oppositeOfMale = femalePatterns;
      const oppositeOfFemale = malePatterns;

      const findFallback = (isMale: boolean) => {
        const patterns = isMale ? malePatterns : femalePatterns;
        const opposite = isMale ? oppositeOfMale : oppositeOfFemale;

        // 1. Google voice with correct gender
        const google = enVoices.find(v => {
          const n = v.name.toLowerCase();
          if (isMale) return n.includes('google') && !n.includes('female') && !n.includes('woman');
          return n.includes('google') && (n.includes('female') || n.includes('woman'));
        });
        if (google) return google;

        // 2. Premium/neural voice matching gender
        const premium = enVoices.find(v => {
          const n = v.name.toLowerCase();
          return patterns.some(p => n.includes(p)) && !opposite.some(p => n.includes(p)) &&
            (n.includes('neural') || n.includes('wavenet') || n.includes('premium') || n.includes('enhanced'));
        });
        if (premium) return premium;

        // 3. Any gender-matching voice
        return enVoices.find(v => {
          const n = v.name.toLowerCase();
          return patterns.some(p => n.includes(p)) && !opposite.some(p => n.includes(p));
        }) ?? null;
      };

      const bestMale = findFallback(true);
      const bestFemale = findFallback(false);

      if (bestMale) curated.push({ label: "Father's Voice", index: voices.indexOf(bestMale), voice: bestMale, pitch: 0.75, rate: 0.9 });
      if (bestFemale && bestFemale !== bestMale) curated.push({ label: "Mother's Voice", index: voices.indexOf(bestFemale), voice: bestFemale, pitch: 1.3, rate: 0.9 });

      // Last resort: just use first two English voices
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

  // If user has a stored preference, find it in curated list (so we keep the correct pitch/rate)
  if (preferredIdx !== undefined) {
    const matched = curated.find(v => v.index === preferredIdx);
    // Return matched (with correct pitch/rate), or fallback keeping pitch/rate from defaults
    if (matched) return matched;
    // User manually picked an unlisted voice — use remote defaults for pitch/rate
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
  await stopAudio();

  try {
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

    const config = await getVoiceConfig();

    console.log('[TTS] Speaking with config:', JSON.stringify({ voice: config.voice?.name, index: config.index, pitch: config.pitch, rate: config.rate }));

    isSpeaking = true;
    await TextToSpeech.speak({
      text: cleanText,
      voice: config.index,
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
