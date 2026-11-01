import { env } from './env';

/** Löst über den Vercel-Deploy-Hook einen neuen Produktions-Build aus. */
export async function neuBauen(): Promise<{ ok: boolean; text: string }> {
  const hook = env('DEPLOY_HOOK_URL');
  if (!hook) {
    return {
      ok: false,
      text: 'DEPLOY_HOOK_URL fehlt. Vercel → Project → Settings → Git → Deploy Hooks (Branch main) anlegen und die URL als Umgebungsvariable setzen.',
    };
  }
  try {
    const res = await fetch(hook, { method: 'POST' });
    if (!res.ok) return { ok: false, text: `Deploy-Hook antwortet mit ${res.status}.` };
    return { ok: true, text: 'Neuer Build gestartet, die Website ist in etwa 1–2 Minuten aktuell.' };
  } catch (e) {
    return { ok: false, text: `Deploy-Hook nicht erreichbar: ${(e as Error).message}` };
  }
}
