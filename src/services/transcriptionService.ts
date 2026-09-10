import { Capacitor } from '@capacitor/core';

const getApiUrl = () => {
  const baseUrl = (
    import.meta.env.VITE_APP_URL ||
    import.meta.env.VITE_SITE_URL ||
    'https://biblenova.vercel.app'
  ).replace(/\/$/, '');

  return Capacitor.isNativePlatform() ? `${baseUrl}/api/transcribe` : '/api/transcribe';
};

export class TranscriptionError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'TranscriptionError';
    this.status = status;
  }
}

const blobToBase64 = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

export const transcribeAudio = async (audio: Blob) => {
  const response = await fetch(getApiUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64: await blobToBase64(audio),
      mimeType: audio.type || 'audio/webm',
    }),
  });

  const body = await response.json().catch(() => ({})) as { text?: string; error?: string };
  if (!response.ok) {
    throw new TranscriptionError(body.error || 'Voice transcription failed. Please try again.', response.status);
  }
  if (!body.text?.trim()) throw new TranscriptionError('No speech was detected. Please try again.');
  return body.text.trim();
};
