import { AnimationDef, AnimationId } from './types';

export interface KeywordOverrideMap {
  [action: string]: string[];
}

export interface ParseResult {
  action: AnimationId;
  matchedKeyword: string;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Normalizes a raw TikTok Live comment for reliable keyword matching.
 * Strips leading command prefixes (!, /, .), punctuation noise, and collapses whitespace.
 */
export function normalizeComment(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^[!/.\s]+/, '')
    .replace(/[^\p{L}\p{N}\s_-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Resolves a raw chat comment into a canonical AnimationId.
 * Priority:
 * 1. Exact action ID match (e.g. "backflip", "!walk_left", "wave")
 * 2. Exact keyword match (e.g. "walk left", "meow")
 * 3. Longest whole-word/phrase keyword match inside a sentence (e.g. "cat do a backflip please!")
 */
export function parseCommentToAction(
  rawComment: string,
  catalog: AnimationDef[],
  customKeywords?: KeywordOverrideMap
): ParseResult | null {
  const normalized = normalizeComment(rawComment);
  if (!normalized) return null;

  const entries: Array<{ action: AnimationId; keyword: string }> = [];

  for (const def of catalog) {
    entries.push({ action: def.id, keyword: def.id.replace(/_/g, ' ') });
    entries.push({ action: def.id, keyword: def.id });

    const keywords = customKeywords?.[def.id] ?? def.keywords;
    for (const kw of keywords) {
      const cleanKw = normalizeComment(kw);
      if (cleanKw) {
        entries.push({ action: def.id, keyword: cleanKw });
      }
    }
  }

  // 1 & 2. Exact full-string match first
  for (const entry of entries) {
    if (normalized === entry.keyword) {
      return { action: entry.action, matchedKeyword: entry.keyword };
    }
  }

  // 3. Longest whole-word / phrase match wins ("walk left" beats "walk")
  const sortedByLength = [...entries].sort(
    (a, b) => b.keyword.length - a.keyword.length
  );

  for (const entry of sortedByLength) {
    const pattern = new RegExp(
      `(?:^|\\s)${escapeRegExp(entry.keyword)}(?:$|\\s)`,
      'i'
    );
    if (pattern.test(normalized)) {
      return { action: entry.action, matchedKeyword: entry.keyword };
    }
  }

  return null;
}

/**
 * Checks whether a string is directly a valid AnimationId.
 */
export function isValidAnimationId(
  value: string,
  catalog: AnimationDef[]
): value is AnimationId {
  return catalog.some((def) => def.id === value);
}
