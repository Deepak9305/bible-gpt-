import { Capacitor } from '@capacitor/core';
import { TextToSpeech, QueueStrategy } from '@capacitor-community/text-to-speech';
import { StorageService } from './storageService';
import { getAuthenticatedUserId, loadCloudUserData, saveCloudUserData } from './userDataService';

const PREFERRED_VOICE_KEY = 'preferred_tts_voice_preset';
const LEGACY_PREFERRED_VOICE_KEY = 'preferred_tts_voice';
const VOICE_CUSTOMIZATION_KEY_PREFIX = 'tts_voice_customization_';

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

export interface VoiceCustomization {
  rate: number;
  pitch: number;
}

export const FATHERLY_VOICE_PRESETS: FatherlyVoicePreset[] = [
  {
    id: 'father-gabriel',
    label: 'Voice 1',
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
    label: 'Voice 2',
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
    label: 'Voice 3',
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

// Match the Settings reference: Voice 2 is the calm, pastoral default.
const DEFAULT_VOICE_ID: FatherlyVoiceId = 'father-thomas';

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

const clampVoiceRate = (value: number) => Math.min(1.3, Math.max(0.6, value));
const clampVoicePitch = (value: number) => Math.min(1.4, Math.max(0.6, value));

const normalizeVoiceCustomization = (id: FatherlyVoiceId, value?: Partial<VoiceCustomization>): VoiceCustomization => {
  const preset = getPresetById(id);
  return {
    rate: clampVoiceRate(Number.isFinite(value?.rate) ? Number(value?.rate) : preset.rate),
    pitch: clampVoicePitch(Number.isFinite(value?.pitch) ? Number(value?.pitch) : preset.pitch),
  };
};

const voiceCustomizationCache: Partial<Record<FatherlyVoiceId, VoiceCustomization>> = {};
type CloudVoiceSettings = {
  preferredVoiceId?: FatherlyVoiceId;
  customizations?: Partial<Record<FatherlyVoiceId, Partial<VoiceCustomization>>>;
};

let voiceCacheOwner: string | null | undefined;
let preferredVoiceCache: FatherlyVoiceId | undefined;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const prepareVoiceCache = async () => {
  const userId = await getAuthenticatedUserId();
  if (voiceCacheOwner !== userId) {
    Object.keys(voiceCustomizationCache).forEach((key) => {
      delete voiceCustomizationCache[key as FatherlyVoiceId];
    });
    preferredVoiceCache = undefined;
    voiceCacheOwner = userId;
  }
  return userId;
};

const getCloudVoiceSettings = async (userId: string): Promise<CloudVoiceSettings> => {
  const data = await loadCloudUserData(userId);
  if (!data || !isRecord(data.voice)) return {};

  const settings: CloudVoiceSettings = {};
  if (isFatherlyVoiceId(data.voice.preferredVoiceId as string | null)) {
    settings.preferredVoiceId = data.voice.preferredVoiceId as FatherlyVoiceId;
  }
  if (isRecord(data.voice.customizations)) {
    settings.customizations = data.voice.customizations as CloudVoiceSettings['customizations'];
  }
  return settings;
};

const saveCloudVoiceSettings = async (userId: string, patch: CloudVoiceSettings) => {
  const current = await getCloudVoiceSettings(userId);
  await saveCloudUserData(userId, {
    voice: {
      ...current,
      ...patch,
      customizations: {
        ...current.customizations,
        ...patch.customizations,
      },
    },
  });
};

export const getVoiceCustomization = async (id: FatherlyVoiceId): Promise<VoiceCustomization> => {
  const userId = await prepareVoiceCache();
  const cached = voiceCustomizationCache[id];
  if (cached) return cached;

  const fallback = normalizeVoiceCustomization(id);
  const stored = await StorageService.get(`${VOICE_CUSTOMIZATION_KEY_PREFIX}${id}`);
  let customization = fallback;

  if (stored) {
    try {
      customization = normalizeVoiceCustomization(id, JSON.parse(stored) as Partial<VoiceCustomization>);
    } catch {
      customization = fallback;
    }
  }

  if (userId) {
    try {
      const cloudSettings = await getCloudVoiceSettings(userId);
      const cloudCustomization = cloudSettings.customizations?.[id];
      if (cloudCustomization) {
        customization = normalizeVoiceCustomization(id, cloudCustomization);
        await StorageService.set(`${VOICE_CUSTOMIZATION_KEY_PREFIX}${id}`, JSON.stringify(customization));
      } else if (stored) {
        await saveCloudVoiceSettings(userId, { customizations: { [id]: customization } });
      }
    } catch (error) {
      console.warn('[Cloud data] Could not load voice settings; using the local copy.', error);
    }
  }

  voiceCustomizationCache[id] = customization;
  return customization;
};

export const setVoiceCustomization = async (id: FatherlyVoiceId, value: Partial<VoiceCustomization>) => {
  const customization = normalizeVoiceCustomization(id, value);
  voiceCustomizationCache[id] = customization;
  const storageKey = `${VOICE_CUSTOMIZATION_KEY_PREFIX}${id}`;
  const serialized = JSON.stringify(customization);
  await StorageService.set(storageKey, serialized);
  const persisted = await StorageService.get(storageKey);
  if (persisted !== serialized) {
    throw new Error('Voice settings could not be saved on this device.');
  }
  const userId = await prepareVoiceCache();
  if (userId) {
    try {
      await saveCloudVoiceSettings(userId, { customizations: { [id]: customization } });
    } catch (error) {
      console.warn('[Cloud data] Voice settings saved locally but not remotely.', error);
    }
  }
  return customization;
};

export const resetVoiceCustomization = async (id: FatherlyVoiceId) => {
  const fallback = normalizeVoiceCustomization(id);
  delete voiceCustomizationCache[id];
  await StorageService.remove(`${VOICE_CUSTOMIZATION_KEY_PREFIX}${id}`);
  const userId = await prepareVoiceCache();
  if (userId) {
    try {
      await saveCloudVoiceSettings(userId, { customizations: { [id]: fallback } });
    } catch (error) {
      console.warn('[Cloud data] Voice reset saved locally but not remotely.', error);
    }
  }
  return fallback;
};

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
  const userId = await prepareVoiceCache();
  if (preferredVoiceCache) return preferredVoiceCache;

  const stored = await StorageService.get(PREFERRED_VOICE_KEY);
  let preferredVoice = isFatherlyVoiceId(stored) ? stored : DEFAULT_VOICE_ID;

  if (stored && !isFatherlyVoiceId(stored)) await StorageService.remove(PREFERRED_VOICE_KEY);

  // Drop the old numeric voice-index preference so the app uses the new male presets.
  await StorageService.remove(LEGACY_PREFERRED_VOICE_KEY);

  if (userId) {
    try {
      const cloudSettings = await getCloudVoiceSettings(userId);
      if (cloudSettings.preferredVoiceId) {
        preferredVoice = cloudSettings.preferredVoiceId;
        await StorageService.set(PREFERRED_VOICE_KEY, preferredVoice);
      } else if (isFatherlyVoiceId(stored)) {
        await saveCloudVoiceSettings(userId, { preferredVoiceId: preferredVoice });
      }
    } catch (error) {
      console.warn('[Cloud data] Could not load preferred voice; using the local copy.', error);
    }
  }

  preferredVoiceCache = preferredVoice;
  return preferredVoice;
};

export const setPreferredVoiceId = async (id: FatherlyVoiceId) => {
  await StorageService.set(PREFERRED_VOICE_KEY, id);
  await StorageService.remove(LEGACY_PREFERRED_VOICE_KEY);
  const userId = await prepareVoiceCache();
  preferredVoiceCache = id;
  if (userId) {
    try {
      await saveCloudVoiceSettings(userId, { preferredVoiceId: id });
    } catch (error) {
      console.warn('[Cloud data] Preferred voice saved locally but not remotely.', error);
    }
  }
};

let nativeSpeaking = false;
let nativeSpeechToken = 0;
let activeUtterance: SpeechSynthesisUtterance | null = null;

export interface TextToSpeechOptions {
  voiceId?: FatherlyVoiceId;
  customization?: VoiceCustomization;
}

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

export const playTextToSpeech = async (text: string, onEnded?: () => void, options?: TextToSpeechOptions): Promise<void> => {
  const clean = cleanText(text);
  if (!clean) { onEnded?.(); return; }

  const voiceId = options?.voiceId ?? await getPreferredVoiceId();
  const preset = getPresetById(voiceId);
  const customization = options?.customization ?? await getVoiceCustomization(voiceId);

  if (Capacitor.isNativePlatform()) {
    await stopAudio();
    nativeSpeaking = true;
    const speechToken = ++nativeSpeechToken;
    const voiceIndex = await resolveNativeVoiceIndex(preset);

    try {
      await TextToSpeech.speak({
        text: clean,
        lang: preset.lang,
        rate: customization.rate,
        pitch: customization.pitch,
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
  utterance.pitch = customization.pitch;
  utterance.rate = customization.rate;
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
