/**
 * Z.ai SDK singleton helper.
 *
 * The z-ai-web-dev-sdk MUST be used in backend code only.
 * This module creates a singleton ZAI instance and re-exports it for
 * use in API routes, cron jobs, and server components.
 *
 * Skills reference:
 *   LLM:     zai.chat.completions.create({ messages, thinking: { type: 'disabled' } })
 *   VLM:     zai.chat.completions.createVision({ messages: [{ role, content: [{type:'text',text},{type:'image_url',image_url:{url}}] }], thinking: { type: 'disabled' } })
 *   TTS:     zai.audio.tts.create({ input, voice, speed, response_format, stream }) → Response (use arrayBuffer())
 *   ASR:     zai.audio.asr.create({ file_base64 }) → { text }
 *   Image:   zai.images.generations.create({ prompt, size }) → { data: [{ base64 }] }
 *
 * Available TTS voices: tongtong, chuichui, xiaochen, jam, kazi, douji, luodo
 * TTS max input: 1024 chars (split longer text)
 * Image sizes: 1024x1024, 768x1344, 864x1152, 1344x768, 1152x864, 1440x720, 720x1440
 */

import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

/** Split text into TTS-safe chunks (max 1000 chars, sentence-aware). */
export function splitTextForTTS(text: string, maxLength = 1000): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + sentence).length <= maxLength) {
      current += sentence;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

/** Re-export the SDK types for convenience */
export type ZAISDK = Awaited<ReturnType<typeof ZAI.create>>;
