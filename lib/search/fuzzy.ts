/**
 * Small dependency-free fuzzy matcher for the command palette.
 * Scores contiguous matches, prefix and word-start hits higher than scattered ones.
 */

export function normalise(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** 0 = no match; higher is better. `query` and `target` must be normalised. */
export function fuzzyScore(query: string, target: string): number {
  if (!query) return 1;
  if (!target) return 0;
  if (target === query) return 1000;
  if (target.startsWith(query)) return 800 - target.length;
  const idx = target.indexOf(query);
  if (idx > 0) {
    const wordStart = /[\s\-/_(,.]/.test(target[idx - 1] ?? "");
    return (wordStart ? 600 : 400) - idx;
  }
  // Subsequence match.
  let score = 0;
  let ti = 0;
  let prev = -2;
  for (const ch of query) {
    const found = target.indexOf(ch, ti);
    if (found === -1) return 0;
    const wordStart = found === 0 || /[\s\-/_(,.]/.test(target[found - 1] ?? "");
    score += found === prev + 1 ? 12 : wordStart ? 8 : 2;
    prev = found;
    ti = found + 1;
  }
  return Math.max(1, Math.min(300, score * 4 - (target.length - query.length)));
}

export interface SearchField {
  value: string;
  weight: number;
}

export interface Searchable<T> {
  item: T;
  fields: SearchField[];
}

export interface SearchResult<T> {
  item: T;
  score: number;
}

/** Score every entry across its weighted fields; returns best matches first. */
export function fuzzySearch<T>(
  query: string,
  entries: readonly Searchable<T>[],
  limit = 20,
): SearchResult<T>[] {
  const q = normalise(query.trim());
  if (!q) return [];
  const results: SearchResult<T>[] = [];
  for (const e of entries) {
    let best = 0;
    for (const f of e.fields) {
      const s = fuzzyScore(q, normalise(f.value)) * f.weight;
      if (s > best) best = s;
    }
    if (best > 0) results.push({ item: e.item, score: best });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}
