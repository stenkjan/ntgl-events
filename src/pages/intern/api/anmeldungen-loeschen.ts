import type { APIRoute } from 'astro';
import { env } from '../../../lib/env';
import { ladeAnmeldungen } from '../../../lib/intern/daten';
import { tageBis } from '../../../lib/intern/format';
import { protokollieren } from '../../../lib/intern/journal';
import { darf } from '../../../lib/intern/rollen';
import { batchUpdate, blaetter } from '../../../lib/intern/sheets';

export const prerender = false;

/**
 * Löschfrist laut Datenschutzerklärung: Anmeldungen ohne Newsletter-Einwilligung
 * 30 Tage nach der Party entfernen. Nur auf Knopfdruck, ins Journal kommt nur die Anzahl.
 */
export const POST: APIRoute = async ({ locals, redirect }) => {
  const m = locals.mitglied!;
  const zurueck = (art: 'ok' | 'fehler', text: string) => redirect(`/intern/daten/anmeldungen?${art}=${encodeURIComponent(text)}`, 303);
  if (!darf(m, 'personen.sehen')) return zurueck('fehler', 'Nur für den Vorstand.');

  const sheetId = env('SHEET_ID');
  const tab = env('SHEET_TAB') || 'Anmeldungen';
  try {
    const alt = (await ladeAnmeldungen()).filter((a) => a.datum && !a.newsletter && tageBis(a.datum) < -30);
    if (alt.length === 0) return zurueck('ok', 'Nichts zu löschen.');
    const info = (await blaetter(sheetId)).find((b) => b.properties.title === tab);
    if (!info) return zurueck('fehler', `Blatt „${tab}“ nicht gefunden.`);
    const requests = alt
      .map((a) => a.zeile)
      .sort((a, b) => b - a)
      .map((zeile) => ({
        deleteDimension: { range: { sheetId: info.properties.sheetId, dimension: 'ROWS', startIndex: zeile - 1, endIndex: zeile } },
      }));
    await batchUpdate(requests, sheetId);
    const partys = [...new Set(alt.map((a) => a.datum))].join(', ');
    await protokollieren(m, 'anmeldungen', 'Löschfrist angewendet', '', `${alt.length} Anmeldungen ohne Newsletter (Partys ${partys})`);
    return zurueck('ok', `${alt.length} Anmeldungen gelöscht.`);
  } catch (e) {
    return zurueck('fehler', `Löschen fehlgeschlagen: ${(e as Error).message}`);
  }
};
