import type { LlmConfig } from '../../config/env.js';
import type { Prompt } from '../prompt.js';

export async function callGemini(config: LlmConfig, prompt: Prompt): Promise<string> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent` +
    `?key=${encodeURIComponent(config.apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: `${prompt.system}\n\n${prompt.user}` }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 900,
        responseMimeType: 'application/json',
      },
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Gemini HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('Gemini mengembalikan konten kosong');
  }
  return text;
}
