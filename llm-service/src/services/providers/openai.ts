import type { LlmConfig } from '../../config/env.js';
import type { Prompt } from '../prompt.js';


/** OpenAI Chat Completions — keluaran JSON ketat via response_format. */
export async function callOpenAi(config: LlmConfig, prompt: Prompt): Promise<string> {
  const res = await fetch(config.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      max_tokens: config.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`OpenAI HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{
      message?: { content?: string; reasoning_content?: string };
      finish_reason?: string;
    }>;
  };

  const choice = data.choices?.[0];
  const content = choice?.message?.content;

  if (typeof content !== 'string' || content.length === 0) {
    if (choice?.message?.reasoning_content && choice?.finish_reason === 'length') {
      throw new Error(
        `Model reasoning (${config.model}) kehabisan token: content kosong karena finish_reason=length. Naikkan AI_MAX_TOKENS (saat ini ${config.maxTokens}).`,
      );
    }
    throw new Error('OpenAI mengembalikan konten kosong');
  }
  return content;
}
