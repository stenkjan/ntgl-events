import type { APIRoute } from 'astro';
import { neuBauen } from '../../../lib/deploy';
import { ladeLage } from '../../../lib/intern/daten';
import { plural } from '../../../lib/intern/format';
import { protokollieren } from '../../../lib/intern/journal';
import { darf } from '../../../lib/intern/rollen';
import { TABELLEN } from '../../../lib/intern/schema';
import { anhaengen, lesenEins, neueId } from '../../../lib/intern/sheets';
import { freigabeBauen, freigabeLesen } from '../../../lib/website';

export const prerender = false;

/**
 * Veröffentlichen = Gate: Ein Mensch mit Recht „website.veroeffentlichen“ friert den
 * öffentlichen Stand als neue Version ein und startet den Build.
 * „wiederherstellen“ macht eine ältere Version wieder zur jüngsten.
 */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const m = locals.mitglied!;
  const zurueck = (art: 'ok' | 'fehler', text: string) => redirect(`/intern/verwaltung/website?${art}=${encodeURIComponent(text)}`, 303);
  if (!darf(m, 'website.veroeffentlichen')) return zurueck('fehler', 'Veröffentlichen dürfen Obmann/Obfrau und Schriftführer:in.');

  const fd = await request.formData();
  const aktion = String(fd.get('_aktion') ?? 'veroeffentlichen');
  const wer = `${m.name} <${m.email}>`;

  try {
    let inhalt;
    let zusammenfassung: string;
    if (aktion === 'wiederherstellen') {
      const id = String(fd.get('_id') ?? '');
      const alt = (await lesenEins(TABELLEN.freigaben)).find((z) => z.id === id);
      const altInhalt = alt ? freigabeLesen([alt]) : null;
      if (!altInhalt) return zurueck('fehler', 'Diese Version gibt es nicht (mehr).');
      inhalt = { ...altInhalt, zeit: new Date().toISOString(), wer };
      zusammenfassung = `Wiederhergestellt: Version vom ${String(alt!.zeit).slice(0, 16).replace('T', ' ')}`;
    } else {
      const lage = await ladeLage([TABELLEN.veranstaltungen, TABELLEN.lineup, TABELLEN.galerie]);
      if (lage.fehler) return zurueck('fehler', lage.fehler);
      inhalt = freigabeBauen(lage.t, wer);
      const acts = inhalt.veranstaltungen.reduce((a, v) => a + v.lineup.length, 0);
      zusammenfassung = [
        plural(inhalt.veranstaltungen.length, 'Party', 'Partys'),
        plural(acts, 'Act', 'Acts'),
        plural(inhalt.bilder.length, 'Foto', 'Fotos'),
      ].join(', ');
    }
    const json = JSON.stringify(inhalt);
    if (json.length > 45_000) return zurueck('fehler', 'Freigabe zu groß für eine Zelle (max. 45.000 Zeichen). Ältere Partys von der Website nehmen.');

    const id = neueId();
    await anhaengen(TABELLEN.freigaben, { id, zeit: inhalt.zeit, wer, zusammenfassung, inhalt: json });
    await protokollieren(m, 'freigaben', aktion === 'wiederherstellen' ? 'wiederhergestellt' : 'veröffentlicht', id, zusammenfassung);
    const build = await neuBauen();
    if (!build.ok) return zurueck('fehler', `Freigabe gespeichert (${zusammenfassung}), aber kein Build: ${build.text}`);
    return zurueck('ok', `Freigegeben: ${zusammenfassung}. ${build.text}`);
  } catch (e) {
    console.error('[intern/veroeffentlichen]', (e as Error).message);
    return zurueck('fehler', `Veröffentlichen fehlgeschlagen: ${(e as Error).message}`);
  }
};
