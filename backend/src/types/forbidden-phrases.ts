export interface ForbiddenPhrasesConfig {
  version?: string;
  phrases: string[];
  exceptions?: Record<string, { allow_in_phrases?: string[]; note?: string }>;
  notes?: string;
}
