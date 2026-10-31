import type { APIRoute } from 'astro';
import { neuBauen } from '../../../lib/deploy';
import { env } from '../../../lib/env';
import { pickCurrentEvent } from '../../../lib/events';
import { protokollieren } from '../../../lib/intern/journal';
import { juengsteFreigabeLaden } from '../../../lib/website';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

/**
 * Täglicher Vercel-Cron (vercel.json). Die Seite ist statisch, „jetzt“ ist der Build-Zeitpunkt.
 * Neu gebaut wird nur, wenn sich seit dem letzten Build etwas Öffentliches geändert hätte:
 * eine andere aktuelle Party (Datum überschritten) oder eine neuere Freigabe.
 * Inhalte gehen weiterhin nur über eine Freigabe online.
 */
export const GET: APIRoute = async ({ request }) => {
  const secret = env('CRON_SECRET');
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) return json({ ok: false }, 401);

  const gebaut = new Date(import.meta.env.BUILD_TIME || 0);
  const freigabe = await juengsteFreigabeLaden(0);
  const jetzt = await pickCurrentEvent(new Date(), freigabe);
  const damals = await pickCurrentEvent(gebaut, freigabe);
  const kennung = (r: typeof jetzt) => `${r.event?.id ?? '-'}|${r.isPast}`;

  const gruende: string[] = [];
  if (kennung(jetzt) !== kennung(damals)) gruende.push(`aktuelle Party wechselt (${kennung(damals)} → ${kennung(jetzt)})`);
  if (freigabe && new Date(freigabe.zeit) > gebaut) gruende.push('neuere Freigabe als der letzte Build');

  if (gruende.length === 0) return json({ ok: true, neuBauen: false, gebaut: gebaut.toISOString() });

  const build = await neuBauen();
  await protokollieren('Cron (täglich)', 'website', build.ok ? 'neu gebaut' : 'Build fehlgeschlagen', '', `${gruende.join('; ')}. ${build.text}`);
  return json({ ok: build.ok, neuBauen: true, gruende, text: build.text }, build.ok ? 200 : 500);
};
