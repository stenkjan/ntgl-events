import type { APIRoute } from 'astro';
import { mitgliederVergessen } from '../../../lib/intern/auth';
import { einrichten } from '../../../lib/intern/einrichten';
import { protokollieren } from '../../../lib/intern/journal';
import { darf } from '../../../lib/intern/rollen';
import { datenBereit, type Wert } from '../../../lib/intern/sheets';

export const prerender = false;

/** Formular-POST (Knopf in Einstellungen) oder JSON-POST mit { startdaten: { tabelle: [zeilen] } } */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const m = locals.mitglied!;
  const json = (request.headers.get('content-type') ?? '').includes('application/json');
  const fertig = (art: 'ok' | 'fehler', text: string, daten?: unknown) =>
    json
      ? new Response(JSON.stringify({ ok: art === 'ok', text, daten }), {
          status: art === 'ok' ? 200 : 400,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        })
      : redirect(`/intern/verwaltung/einstellungen?${art}=${encodeURIComponent(text)}`, 303);

  if (!darf(m, 'einstellungen.schreiben')) return fertig('fehler', 'Nur für Obmann/Obfrau oder Startzugang.');
  if (!datenBereit()) return fertig('fehler', 'INTERN_SHEET_ID oder Google-Zugang fehlt.');

  let startdaten: Record<string, Array<Record<string, Wert>>> | undefined;
  let anhaengen = false;
  if (json) {
    try {
      const body = (await request.json()) as { startdaten?: typeof startdaten; anhaengen?: boolean };
      startdaten = body.startdaten;
      anhaengen = body.anhaengen === true;
    } catch {
      return fertig('fehler', 'Ungültiges JSON.');
    }
  }

  try {
    const bericht = await einrichten(startdaten, anhaengen);
    mitgliederVergessen();
    await protokollieren(m, 'einstellungen', 'eingerichtet', '', bericht);
    const teile = [
      bericht.angelegt.length ? `Blätter angelegt: ${bericht.angelegt.join(', ')}` : 'Alle Blätter vorhanden',
      bericht.spaltenErgaenzt.length ? `Spalten ergänzt: ${bericht.spaltenErgaenzt.join('; ')}` : '',
      bericht.startdaten.length ? `Startdaten: ${bericht.startdaten.join(', ')}` : '',
      ...bericht.hinweise,
    ].filter(Boolean);
    return fertig('ok', `${teile.join('. ')}.`, bericht);
  } catch (e) {
    console.error('[intern/einrichten]', (e as Error).message);
    return fertig('fehler', `Einrichtung fehlgeschlagen: ${(e as Error).message}`);
  }
};
