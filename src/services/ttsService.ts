import { Capacitor } from '@capacitor/core';
import { TextToSpeech, QueueStrategy } from '@capacitor-community/text-to-speech';
import { StorageService } from './storageService';

const PREFERRED_VOICE_KEY = 'preferred_tts_voice';

const MALE_TARGETS = [
  'Google UK English Male',
  'Google US English',
  'en-US-Neural2-J',
  'en-GB-Neural2-B',
  'en-us-x-tpf-local',
  'en-us-x-tpf-network',
  'Microsoft David Desktop',
  'Microsoft David',
  'Daniel',
  'Arthur',
  'Aaron',
];

const FEMALE_TARGETS = [
  'Google UK English Female',
  'en-US-Neural2-F',
  'en-GB-Neural2-A',
  'en-us-x-sfg-local',
  'en-us-x-sfg-network',
  'Microsoft Zira Desktop',
  'Microsoft Zira',
  'Samantha',
  'Martha',
];

const FEMALE_KEYWORDS = ['female', 'woman', 'girl', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'martha'];

const cleanText = (text: string) =>
  text
    .replace(/[*_>#`]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\|/g, ',')
    .replace(/\[|\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .trim();

// ─── Web Speech helpers ───────────────────────────────────────────────────────

const loadVoices = (): Promise<SpeechSynthesisVoice[]> =>
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

const pickBest = (voices: SpeechSynthesisVoice[], targets: string[]): SpeechSynthesisVoice | null => {
  for (const t of targets) {
    const tl = t.toLowerCase();
    const hit = voices.find(v => v.name.toLowerCase() === tl || v.name.toLowerCase().includes(tl));
    if (hit) return hit;
  }
  return null;
};

// ─── Public API ───────────────────────────────────────────────────────────────

export const getCuratedVoices = async () => {
  // Voice picker is only meaningful on web; native uses the system TTS voice.
  if (Capacitor.isNativePlatform()) return [];

  const all = await loadVoices();
  const en = all.filter(v => v.lang.toLowerCase().startsWith('en'));
  if (en.length === 0) return [];

  const male =
    pickBest(en, MALE_TARGETS) ??
    en.find(v => !FEMALE_KEYWORDS.some(k => v.name.toLowerCase().includes(k))) ??
    en[0];

  const female =
    pickBest(en, FEMALE_TARGETS) ??
    en.find(v => v !== male);

  const curated: { label: string; index: number; voice: SpeechSynthesisVoice; pitch: number; rate: number }[] = [];
  if (male) curated.push({ label: "Father's Voice", index: all.indexOf(male), voice: male, pitch: 0.88, rate: 0.82 });
  if (female && female !== male) curated.push({ label: "Mother's Voice", index: all.indexOf(female), voice: female, pitch: 1.05, rate: 0.82 });

  return curated;
};

export const getPreferredVoiceIndex = async (): Promise<number | undefined> => {
  const stored = await StorageService.get(PREFERRED_VOICE_KEY);
  if (!stored) return undefined;
  const n = parseInt(stored, 10);
  return isNaN(n) ? undefined : n;
};

export const setPreferredVoice = async (index: number | undefined) => {
  if (index === undefined) {
    await StorageService.remove(PREFERRED_VOICE_KEY);
  } else {
    await StorageService.set(PREFERRED_VOICE_KEY, String(index));
  }
};

// Tracks whether native speech is still "owned" by the current speak call.
// Set to false by stopAudio() so the onEnded callback is suppressed after a manual stop.
// Priority-ordered voice name fragments for picking the best male English voice.
// Android Google TTS network voices are neural quality; local voices are cached neural.
const NATIVE_MALE_VOICE_PRIORITY = [
  'en-us-x-tpf-network',  // Google US English (neural, network)
  'en-us-x-tpd-network',
  'en-us-x-tpc-network',
  'en-us-x-tpf-local',    // Google US English (neural, local/cached)
  'en-us-x-tpd-local',
  'en-gb-x-gbd-network',  // Google UK English Male (neural, network)
  'en-gb-x-gbd-local',
  // iOS Siri / premium voices
  'siri_male_en-us',
  'siri_male_en-gb',
  'aaron',
  'daniel',
  'arthur',
  'fred',
];

let nativeBestVoiceIndex: number | undefined = undefined;
let nativeVoiceResolved = false;

const resolveNativeVoice = async (): Promise<number | undefined> => {
  if (nativeVoiceResolved) return nativeBestVoiceIndex;
  nativeVoiceResolved = true;
  try {
    const { voices } = await TextToSpeech.getSupportedVoices();
    for (const fragment of NATIVE_MALE_VOICE_PRIORITY) {
      const idx = voices.findIndex(v =>
        v.name.toLowerCase().includes(fragment) ||
        v.voiceURI.toLowerCase().includes(fragment)
      );
      if (idx !== -1) { nativeBestVoiceIndex = idx; return idx; }
    }
    // Fallback: any en-US voice, then any English voice
    const usIdx = voices.findIndex(v => v.lang === 'en-US' || v.lang === 'en_US');
    if (usIdx !== -1) { nativeBestVoiceIndex = usIdx; return usIdx; }
    const enIdx = voices.findIndex(v => v.lang.startsWith('en'));
    if (enIdx !== -1) { nativeBestVoiceIndex = enIdx; return enIdx; }
  } catch (e) {
    console.warn('[TTS] getSupportedVoices failed:', e);
  }
  return undefined;
};

let nativeSpeaking = false;

// Web utterance ref for cancellation
let activeUtterance: SpeechSynthesisUtterance | null = null;

export const stopAudio = async (): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    nativeSpeaking = false;
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

  // ── Native path (Android / iOS) ──────────────────────────────────────────
  if (Capacitor.isNativePlatform()) {
    await stopAudio();
    nativeSpeaking = true;
    const voiceIndex = await resolveNativeVoice();
    try {
      await TextToSpeech.speak({
        text: clean,
        lang: 'en-US',
        rate: 0.9,      // natural pace — not dragging
        pitch: 0.9,     // slightly warm/deep without sounding synthetic
        volume: 1.0,
        category: 'playback',
        queueStrategy: QueueStrategy.Flush,
        ...(voiceIndex !== undefined ? { voice: voiceIndex } : {}),
      });
      // Only fire the callback if stopAudio() wasn't called while we were speaking
      if (nativeSpeaking) onEnded?.();
    } catch (e: any) {
      // 'interrupted' fires when stop() is called — that's expected, not an error
      if (e?.message !== 'interrupted') {
        console.error('[TTS] native error:', e);
      }
      if (nativeSpeaking) onEnded?.();
    } finally {
      nativeSpeaking = false;
    }
    return;
  }

  // ── Web Speech API fallback (browser / dev) ──────────────────────────────
  if (!window.speechSynthesis) { onEnded?.(); return; }

  // Cancel any ongoing speech and let the engine settle before speaking again
  window.speechSynthesis.cancel();
  activeUtterance = null;
  await new Promise(r => setTimeout(r, 50));

  const all = await loadVoices();
  const preferredIdx = await getPreferredVoiceIndex();

  let voice: SpeechSynthesisVoice | null = null;
  let pitch = 0.88;
  let rate = 0.82;

  if (preferredIdx !== undefined && all[preferredIdx]) {
    voice = all[preferredIdx];
  } else {
    const curated = await getCuratedVoices();
    if (curated.length > 0 && all[curated[0].index]) {
      voice = all[curated[0].index];
      pitch = curated[0].pitch;
      rate = curated[0].rate;
    } else {
      voice = all.find(v => v.lang.startsWith('en')) ?? null;
    }
  }

  const utterance = new SpeechSynthesisUtterance(clean);
  activeUtterance = utterance;
  if (voice) utterance.voice = voice;
  utterance.pitch = pitch;
  utterance.rate = rate;
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
