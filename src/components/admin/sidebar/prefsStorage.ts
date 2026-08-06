// Todas as chaves de LocalStorage da sidebar são declaradas aqui, e só aqui.
export const STORAGE = {
  open: 'grauos_sidebar_open',
  favorites: 'grauos_favorites',
  collapsed: 'grauos_sidebar_collapsed',
  recent: 'grauos_sidebar_recent',
} as const;
// `grauos_sidebar_v2` era a flag de rollout da V2. A V1 foi removida, então a
// chave deixou de ser lida — quem ainda a tiver salva simplesmente a ignora.

export const MAX_FAVORITES = 6;
export const MAX_RECENT = 5;

/** Nunca lança: LocalStorage pode estar indisponível (modo privado) ou corrompido. */
export function readArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(v => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function writeArray(key: string, value: string[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota cheia ou storage bloqueado — preferência não é crítica */
  }
}

/** Distingue "sem preferência salva" de "salvo como false". */
export function hasKey(key: string): boolean {
  try {
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

export function readBool(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

export function writeBool(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* idem */
  }
}

export function moveInArray<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function toggleInArray(arr: string[], value: string, max?: number): string[] {
  if (arr.includes(value)) return arr.filter(v => v !== value);
  if (max !== undefined && arr.length >= max) return arr;
  return [...arr, value];
}
