import type { APIRoute } from 'astro';
import { sichererPfad } from '../../../lib/intern/auth';
import { darfSchreiben } from '../../../lib/intern/formular';
import { protokollieren } from '../../../lib/intern/journal';
import { TABELLEN } from '../../../lib/intern/schema';
import { aktualisieren, anhaengen, lesenEins, neueId } from '../../../lib/intern/sheets';

export const prerender = false;

/** Foto für die Website freigeben bzw. zurücknehmen, oder als Flyer der nächsten Party setzen. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const m = locals.mitglied!;
  const fd = await request.formData();
  const id = String(fd.get('id') ?? '');
  const aktion = String(fd.get('aktion') ?? '');
  const zurueck = sichererPfad(String(fd.get('zurueck') ?? ''), '/intern/galerie');
  const ende = (art: 'ok' | 'fehler', text: string) => redirect(`${zurueck}${zurueck.includes('?') ? '&' : '?'}${art}=${encodeURIComponent(text)}`, 303);
  if (!/^[\w-]{10,}$/.test(id)) return ende('fehler', 'Ungültiges Bild.');
  const jetzt = new Date().toISOString();

  try {
    if (aktion === 'flyer') {
      if (!darfSchreiben(m, TABELLEN.veranstaltungen)) return ende('fehler', 'Flyer setzen dürfen Vorstand und Planung.');
      const v = String(fd.get('v') ?? '');
      const party = (await lesenEins(TABELLEN.veranstaltungen)).find((z) => z.datum === v);
      if (!party) return ende('fehler', 'Party nicht gefunden.');
      await aktualisieren(TABELLEN.veranstaltungen, party.id, { flyer: id, geaendert: jetzt });
      await protokollieren(m, 'veranstaltungen', 'Flyer gesetzt', party.id, id);
      return ende('ok', 'Flyer gesetzt. Online nach „Veröffentlichen“.');
    }

    if (!darfSchreiben(m, TABELLEN.galerie)) return ende('fehler', 'Freigeben dürfen Vorstand und Marketing & Web.');
    const vorhanden = (await lesenEins(TABELLEN.galerie)).find((z) => z.drive === id);
    const website = aktion === 'an';
    if (vorhanden) {
      await aktualisieren(TABELLEN.galerie, vorhanden.id, { website, geaendert: jetzt });
    } else {
      await anhaengen(TABELLEN.galerie, {
        id: neueId(),
        drive: id,
        titel: String(fd.get('titel') ?? '').slice(0, 120),
        website,
        erstellt: jetzt,
        von: `${m.name} <${m.email}>`,
      });
    }
    await protokollieren(m, 'galerie', website ? 'freigegeben' : 'zurückgenommen', id);
    return ende('ok', website ? 'Für die Website vorgemerkt. Online nach „Veröffentlichen“.' : 'Freigabe zurückgenommen.');
  } catch (e) {
    return ende('fehler', (e as Error).message);
  }
};
