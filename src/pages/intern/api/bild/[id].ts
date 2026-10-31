import type { APIRoute } from 'astro';
import { bildLaden } from '../../../../lib/intern/drive';

export const prerender = false;

/** Vorschaubilder für die Galerie im Mitgliederbereich (nur mit Sitzung). */
export const GET: APIRoute = async ({ params, url }) => {
  const id = params.id ?? '';
  if (!/^[\w-]{10,}$/.test(id)) return new Response('Ungültig', { status: 400 });
  const groesse = url.searchParams.get('g') === 'gross' ? 1600 : 480;
  try {
    const bild = await bildLaden(id, groesse);
    if (!bild) return new Response('Kein Bild', { status: 404 });
    return new Response(bild.daten, {
      headers: { 'content-type': bild.typ, 'cache-control': 'private, max-age=3600' },
    });
  } catch (e) {
    console.error('[intern/bild]', (e as Error).message);
    return new Response('Nicht verfügbar', { status: 502 });
  }
};
