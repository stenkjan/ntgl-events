import type { APIRoute } from 'astro';
import { bildLaden } from '../../lib/intern/drive';
import { freigegebeneBilder, juengsteFreigabeLaden } from '../../lib/website';

export const prerender = false;

/**
 * Öffentliche Bilder (Flyer, Galerie) aus Drive. Ausgeliefert wird nur, was in der
 * jüngsten Freigabe steht; das CDN hält die Antwort einen Tag.
 */
export const GET: APIRoute = async ({ params, url }) => {
  const id = params.id ?? '';
  if (!/^[\w-]{10,}$/.test(id)) return new Response('Nicht gefunden', { status: 404 });
  const erlaubt = freigegebeneBilder(await juengsteFreigabeLaden());
  if (!erlaubt.has(id)) return new Response('Nicht gefunden', { status: 404 });
  try {
    const bild = await bildLaden(id, url.searchParams.get('g') === 'klein' ? 640 : 1600);
    if (!bild) return new Response('Nicht gefunden', { status: 404 });
    return new Response(bild.daten, {
      headers: {
        'content-type': bild.typ,
        'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    });
  } catch (e) {
    console.error('[media]', (e as Error).message);
    return new Response('Nicht verfügbar', { status: 502 });
  }
};
