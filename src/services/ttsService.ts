import { StorageService } from './storageService';

const PREFERRED_VOICE_KEY = 'preferred_tts_voice';

// Priority-ordered target voices — highest quality first.
// Chrome/Android WebView serves "Google UK English Male" as a neural-quality voice.
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

// Voices load asynchronously on first access — wait for them.
const loadVoices = (): Promise<SpeechSynthesisVoice[]> =>
  new Promise(resolve => {
    const immediate = window.speechSynthesis.getVoices();
    if (immediate.length > 0) return resolve(immediate);

    const handler = () => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
    };
    window.speechSynthesis.addEventListener('voiceschanged', handler);
    // Timeout safety net for environments that never fire voiceschanged
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handler);
      resolve(window.speechSynthesis.getVoices());
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

export const getCuratedVoices = async () => {
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

  if (male) {
    curated.push({ label: "Father's Voice", index: all.indexOf(male), voice: male, pitch: 0.88, rate: 0.82 });
  }
  if (female && female !== male) {
    curated.push({ label: "Mother's Voice", index: all.indexOf(female), voice: female, pitch: 1.05, rate: 0.82 });
  }

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

let activeUtterance: SpeechSynthesisUtterance | null = null;

export const stopAudio = () => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
};

export const playTextToSpeech = async (text: string, onEnded?: () => void): Promise<void> => {
  if (!window.speechSynthesis) { onEnded?.(); return; }

  stopAudio();
  // Give the engine 50ms to settle after cancel() — fixes silent speech on Android WebView
  await new Promise(r => setTimeout(r, 50));

  const clean = text
    .replace(/[*_>#`]/g, '')
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\|/g, ',')
    .replace(/\[|\]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,])/g, '$1')
    .trim();

  if (!clean) { onEnded?.(); return; }

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
      // 'canceled' and 'interrupted' are normal when stopAudio() is called
      if (e.error !== 'canceled' && e.error !== 'interrupted') {
        console.error('[TTS] error:', e.error);
      }
      finish();
    };

    // Unconditional resume fixes the stuck-paused state on Android WebView
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  });
};
