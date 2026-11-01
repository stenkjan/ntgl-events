import { defineMiddleware } from 'astro:middleware';
import { sitzungLesen } from './lib/intern/auth';

/**
 * Schützt alles unter /intern. Die öffentliche Seite bleibt davon unberührt
 * (statisch, keine Prüfung, kein Cookie).
 */
const OFFEN = ['/intern/anmelden', '/intern/api/anmelden'];

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname, search } = ctx.url;
  if (ctx.isPrerendered || !(pathname === '/intern' || pathname.startsWith('/intern/'))) return next();

  const offen = OFFEN.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (!offen) {
    let mitglied = null;
    try {
      mitglied = await sitzungLesen(ctx.cookies);
    } catch (e) {
      console.error('[intern] Sitzung nicht prüfbar', (e as Error).message);
    }
    if (!mitglied) {
      if (pathname.startsWith('/intern/api/')) {
        return new Response(JSON.stringify({ ok: false, error: 'Nicht angemeldet.' }), {
          status: 401,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        });
      }
      return ctx.redirect(`/intern/anmelden?weiter=${encodeURIComponent(pathname + search)}`, 303);
    }
    ctx.locals.mitglied = mitglied;
  }

  const res = await next();
  try {
    res.headers.set('x-robots-tag', 'noindex, nofollow');
    if (!res.headers.has('cache-control')) res.headers.set('cache-control', 'private, no-store');
    res.headers.set('x-frame-options', 'DENY');
    res.headers.set('referrer-policy', 'same-origin');
  } catch {
    // Antworten mit unveränderlichen Headern (z. B. Weiterleitungen) bleiben wie sie sind.
  }
  return res;
});
