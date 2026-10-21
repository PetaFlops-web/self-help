import { loadForbiddenPhrases } from '../config/forbidden-phrases.js';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Mencari frasa terlarang (SRS 6.7 langkah 4) pada teks.
 * Pencocokan tidak peka huruf besar/kecil dan memakai batas kata (\b) agar
 * tidak salah tangkap pada kata berimbuhan (mis. "memastikan" tidak dianggap
 * mengandung frasa "pasti"). Pengecualian per frasa (mis. "korupsi" pada
 * "Komisi Pemberantasan Korupsi") dihapus dulu sebelum dicocokkan.
 */
export function findForbiddenPhrases(text: string): string[] {
  const config = loadForbiddenPhrases();
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const phrase of config.phrases) {
    const p = phrase.toLowerCase();
    let haystack = lower;

    const allowList = config.exceptions?.[p]?.allow_in_phrases;
    if (allowList && allowList.length > 0) {
      for (const allowed of allowList) {
        haystack = haystack.split(allowed.toLowerCase()).join(' ');
      }
    }

    const re = new RegExp(`\\b${escapeRegex(p)}\\b`);
    if (re.test(haystack)) {
      found.push(phrase);
    }
  }

  return found;
}
