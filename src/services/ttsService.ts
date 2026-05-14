import { Capacitor } from '@capacitor/core';
import { TextToSpeech, QueueStrategy } from '@capacitor-community/text-to-speech';
import { StorageService } from './storageService';

const PREFERRED_VOICE_KEY = 'preferred_tts_voice_preset';
const LEGACY_PREFERRED_VOICE_KEY = 'preferred_tts_voice';

export type FatherlyVoiceId = 'father-gabriel' | 'father-thomas' | 'father-matthew';

export interface FatherlyVoicePreset {
  id: FatherlyVoiceId;
  label: string;
  description: string;
  lang: string;
  rate: number;
  pitch: number;
  webTargets: string[];
  nativeTargets: string[];
  avoidTargets?: string[];
  fallbackOffset: number;
}

export const FATHERLY_VOICE_PRESETS: FatherlyVoicePreset[] = [
  {
    id: 'father-gabriel',
    label: 'Father Gabriel',
    description: 'Rich, warm, and reassuring',
    lang: 'en-GB',
    rate: 0.87,
    pitch: 0.92,
    webTargets: [
      'Google UK English Male',
      'Microsoft George',
      'Microsoft Richard',
      'Daniel',
      'Arthur',
      'Aaron',
      'Alex',
    ],
    nativeTargets: [
      'en-gb-x-gbd-network',
      'en-gb-x-gbd-local',
      'en-au-x-aud-network',
      'en-au-x-aud-local',
      'siri_male_en-gb',
      'daniel',
      'arthur',
      'george',
    ],
    avoidTargets: [
      'en-us-x-tpf-network',
      'en-us-x-tpf-local',
      'david',
      'Microsoft David',
    ],
    fallbackOffset: 0,
  },
  {
    id: 'father-thomas',
    label: 'Father Thomas',
    description: 'Gentle, calm, and pastoral',
    lang: 'en-US',
    rate: 0.86,
    pitch: 0.93,
    webTargets: [
      'en-US-Neural2-J',
      'Google US English',
      'Microsoft Mark',
      'Microsoft David',
      'Alex',
      'Fred',
      'Tom',
    ],
    nativeTargets: [
      'en-us-x-tpd-network',
      'en-us-x-tpd-local',
      'en-us-x-tpf-network',
      'en-us-x-tpf-local',
      'en-gb-x-gbd-network',
      'en-gb-x-gbd-local',
      'aaron',
      'alex',
      'fred',
      'tom',
    ],
    fallbackOffset: 1,
  },
  {
    id: 'father-matthew',
    label: 'Father Matthew',
    description: 'Clear, confident, and uplifting',
    lang: 'en-US',
    rate: 0.91,
    pitch: 0.98,
    webTargets: [
      'en-US-Neural2-D',
      'en-US-Neural2-I',
      'Microsoft Guy',
      'Microsoft George',
      'Google US English',
      'en-GB-Neural2-B',
      'Arthur',
      'Reed',
    ],
    nativeTargets: [
      'en-us-x-tpc-network',
      'en-us-x-tpc-local',
      'en-us-x-tpd-network',
      'en-us-x-tpd-local',
      'en-au-x-aud-network',
      'en-au-x-aud-local',
      'george',
      'guy',
      'reed',
      'bruce',
    ],
    fallbackOffset: 2,
  },
];

const DEFAULT_VOICE_ID: FatherlyVoiceId = FATHERLY_VOICE_PRESETS[0].id;

const FEMALE_KEYWORDS = [
  'female',
  'woman',
  'girl',
  'zira',
  'samantha',
  'victoria',
  'karen',
  'moira',
  'tessa',
  'martha',
  'susan',
  'ava',
  'allison',
  'sfg',
];

const MALE_KEYWORDS = [
  'male',
  'man',
  'david',
  'daniel',
  'arthur',
  'aaron',
  'fred',
  'tom',
  'ralph',
  'alex',
  'reed',
  'bruce',
  'george',
  'guy',
  'richard',
  'tpf',
  'tpd',
  'tpc',
  'gbd',
];

const cleanText = (text: string) =>
  text
    .replace(/[*_>#`]/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\|/g, ',')
    .replace(/\[|\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .trim();

const isFatherlyVoiceId = (value: string | null): value is FatherlyVoiceId =>
  FATHERLY_VOICE_PRESETS.some(preset => preset.id === value);

const getVoiceText = (voice: SpeechSynthesisVoice) =>
  `${voice.name ?? ''} ${voice.voiceURI ?? ''} ${voice.lang ?? ''}`.toLowerCase();

const isEnglishVoice = (voice: SpeechSynthesisVoice) =>
  voice.lang?.toLowerCase().startsWith('en');

const isLikelyFemaleVoice = (voice: SpeechSynthesisVoice) => {
  const text = getVoiceText(voice);
  return FEMALE_KEYWORDS.some(keyword => text.includes(keyword));
};

const hasMaleSignal = (voice: SpeechSynthesisVoice) => {
  const text = getVoiceText(voice);
  return MALE_KEYWORDS.some(keyword => text.includes(keyword));
};

const voiceMatchesTarget = (voice: SpeechSynthesisVoice, target: string) => {
  const text = getVoiceText(voice);
  return text.includes(target.toLowerCase());
};

const getPresetById = (id: FatherlyVoiceId) =>
  FATHERLY_VOICE_PRESETS.find(preset => preset.id === id) ?? FATHERLY_VOICE_PRESETS[0];

const loadWebVoices = (): Promise<SpeechSynthesisVoice[]> =>
  new Promise(resolve => {
    const immediate = window.speechSynthesis?.getVoices() ?? [];
    if (immediate.length > 0) return resolve(immediate);

    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    };

    window.speechSynthesis?.addEventListener('voiceschanged', handler);
    setTimeout(() => {
      window.speechSynthesis?.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis?.getVoices() ?? []);
    }, 3000);
  });

const chooseVoice = (voices: SpeechSynthesisVoice[], preset: FatherlyVoicePreset, targets: string[]) => {
  const englishVoices = voices.filter(isEnglishVoice);
  const candidateVoices = englishVoices.length > 0 ? englishVoices : voices;
  const preferredCandidates = preset.avoidTargets
    ? candidateVoices.filter(voice => !preset.avoidTargets?.some(target => voiceMatchesTarget(voice, target)))
    : candidateVoices;
  const usableVoices = preferredCandidates.length > 0 ? preferredCandidates : candidateVoices;

  for (const target of targets) {
    const hit = usableVoices.find(voice => voiceMatchesTarget(voice, target) && !isLikelyFemaleVoice(voice));
    if (hit) return hit;
  }

  const maleVoices = usableVoices.filter(voice => hasMaleSignal(voice) && !isLikelyFemaleVoice(voice));
  const neutralVoices = usableVoices.filter(voice => !isLikelyFemaleVoice(voice));
  const pool = maleVoices.length > 0 ? maleVoices : neutralVoices.length > 0 ? neutralVoices : usableVoices;
  return pool[preset.fallbackOffset % pool.length] ?? null;
};

const nativeVoiceIndexes: Partial<Record<FatherlyVoiceId, number | undefined>> = {};
let nativeVoices: SpeechSynthesisVoice[] | null = null;

const loadNativeVoices = async () => {
  if (nativeVoices) return nativeVoices;
  const result = await TextToSpeech.getSupportedVoices();
  nativeVoices = result.voices;
  return nativeVoices;
};

const resolveNativeVoiceIndex = async (preset: FatherlyVoicePreset): Promise<number | undefined> => {
  if (preset.id in nativeVoiceIndexes) return nativeVoiceIndexes[preset.id];

  try {
    const voices = await loadNativeVoices();
    const voice = chooseVoice(voices, preset, preset.nativeTargets);
    const index = voice ? voices.indexOf(voice) : undefined;
    nativeVoiceIndexes[preset.id] = index;
    return index;
  } catch (e) {
    console.warn('[TTS] getSupportedVoices failed:', e);
    nativeVoiceIndexes[preset.id] = undefined;
    return undefined;
  }
};

export const getPreferredVoiceId = async (): Promise<FatherlyVoiceId> => {
  const stored = await StorageService.get(PREFERRED_VOICE_KEY);
  if (isFatherlyVoiceId(stored)) return stored;

  if (stored) await StorageService.remove(PREFERRED_VOICE_KEY);

  // Drop the old numeric voice-index preference so the app uses the new male presets.
  await StorageService.remove(LEGACY_PREFERRED_VOICE_KEY);
  return DEFAULT_VOICE_ID;
};

export const setPreferredVoiceId = async (id: FatherlyVoiceId) => {
  await StorageService.set(PREFERRED_VOICE_KEY, id);
  await StorageService.remove(LEGACY_PREFERRED_VOICE_KEY);
};

let nativeSpeaking = false;
let nativeSpeechToken = 0;
let activeUtterance: SpeechSynthesisUtterance | null = null;

export const stopAudio = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    nativeSpeaking = false;
    nativeSpeechToken += 1;
    try { await TextToSpeech.stop(); } catch {}
  } else {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    activeUtterance = null;
  }
};

export const playTextToSpeech = async (text: string, onEnded?: () => void): Promise<void> => {
  const clean = cleanText(text);
  if (!clean) { onEnded?.(); return; }

  const preset = getPresetById(await getPreferredVoiceId());

  if (Capacitor.isNativePlatform()) {
    await stopAudio();
    nativeSpeaking = true;
    const speechToken = ++nativeSpeechToken;
    const voiceIndex = await resolveNativeVoiceIndex(preset);

    try {
      await TextToSpeech.speak({
        text: clean,
        lang: preset.lang,
        rate: preset.rate,
        pitch: preset.pitch,
        volume: 1.0,
        category: 'playback',
        queueStrategy: QueueStrategy.Flush,
        ...(voiceIndex !== undefined ? { voice: voiceIndex } : {}),
      });

      if (nativeSpeaking && nativeSpeechToken === speechToken) onEnded?.();
    } catch (e: any) {
      if (e?.message !== 'interrupted') {
        console.error('[TTS] native error:', e);
      }
      if (nativeSpeaking && nativeSpeechToken === speechToken) onEnded?.();
    } finally {
      if (nativeSpeechToken === speechToken) nativeSpeaking = false;
    }
    return;
  }

  if (!window.speechSynthesis) { onEnded?.(); return; }

  window.speechSynthesis.cancel();
  activeUtterance = null;
  await new Promise(resolve => setTimeout(resolve, 50));

  const voices = await loadWebVoices();
  const voice = chooseVoice(voices, preset, preset.webTargets);
  const utterance = new SpeechSynthesisUtterance(clean);

  activeUtterance = utterance;
  if (voice) utterance.voice = voice;
  utterance.lang = preset.lang;
  utterance.pitch = preset.pitch;
  utterance.rate = preset.rate;
  utterance.volume = 1.0;

  return new Promise<void>(resolve => {
    const finish = () => {
      if (activeUtterance === utterance) {
        activeUtterance = null;
        onEnded?.();
      }
      resolve();
    };

    utterance.onend = finish;
    utterance.onerror = e => {
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.error('[TTS] web error:', e.error);
      }
      finish();
    };

    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  });
};
