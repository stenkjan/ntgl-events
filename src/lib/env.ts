/** Liest eine Umgebungsvariable zur Laufzeit (Vercel) oder aus .env (lokal). */
export const env = (key: string): string => {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[key];
  return (fromMeta ?? process.env[key] ?? '').trim();
};

/** Komma-getrennte Liste, klein geschrieben und ohne Leerstellen. */
export const envListe = (key: string): string[] =>
  env(key)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
