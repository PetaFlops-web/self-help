import dotenv from 'dotenv';

dotenv.config();

export type Provider = 'openai' | 'gemini' | 'mock';

const nodeEnv: string = process.env.NODE_ENV || 'development';

export const isDev: boolean = nodeEnv === 'development';
export const isProd: boolean = nodeEnv === 'production';

export interface LlmConfig {
  provider: Provider;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
  apiUrl: string;
}

const DEFAULT_MODELS: Record<Provider, string> = {
  openai: 'deepseek-v4.1-flash',
  gemini: 'gemini-2.0-flash',
  mock: 'mock',
};

const PROVIDERS: Provider[] = ['openai', 'gemini', 'mock'];

export function loadLlmConfig(): LlmConfig {
  const raw = (process.env.AI_PROVIDER || 'mock').toLowerCase();
  const provider: Provider = (PROVIDERS as string[]).includes(raw) ? (raw as Provider) : 'mock';

  const apiKey = process.env.AI_API_KEY || '';
  const model = process.env.AI_MODEL || DEFAULT_MODELS[provider];
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 10000;
  const maxTokens = Number(process.env.AI_MAX_TOKENS) || 4096;
  const apiUrl = process.env.AI_API_URL || '';

  return { provider, apiKey, model, timeoutMs, maxTokens, apiUrl };
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  allowedOrigins: string[];
  llm: LlmConfig;
}

export const config: AppConfig = {
  nodeEnv,
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || '0.0.0.0',
  allowedOrigins: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
    : [],
  llm: loadLlmConfig(),
};

export default config;
