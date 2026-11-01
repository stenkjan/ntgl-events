import type { APIRoute } from 'astro';
import { mitgliederVergessen, sichererPfad } from '../../../../lib/intern/auth';
import { darfEigene, darfSchreiben, formLesen } from '../../../../lib/intern/formular';
import { protokollieren } from '../../../../lib/intern/journal';
import { tabelle } from '../../../../lib/intern/schema';
import { aktualisieren, anhaengen, DatenFehler, lesenEins, loeschen, neueId } from '../../../../lib/intern/sheets';

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals, redirect }) => {
  const m = locals.mitglied!;
  const def = tabelle(params.tab ?? '');
  const fd = await request.formData();
  const zurueck = sichererPfad(String(fd.get('_zurueck') ?? ''), '/intern');

  const antwort = (art: 'ok' | 'fehler', text: string, offenLassen?: Record<string, string>) => {
    const u = new URL(zurueck, 'http://intern.local');
    u.searchParams.delete('ok');
    u.searchParams.delete('fehler');
    if (art === 'ok') {
      u.searchParams.delete('bearbeiten');
      u.searchParams.delete('neu');
    }
    for (const [k, v] of Object.entries(offenLassen ?? {})) u.searchParams.set(k, v);
    u.searchParams.set(art, text);
    return redirect(u.pathname + u.search, 303);
  };

  if (!def || def.nurSystem) return antwort('fehler', 'Diese Tabelle kann man hier nicht bearbeiten.');
  const aktion = String(fd.get('_aktion') ?? 'speichern');
  const id = String(fd.get('_id') ?? '').trim();
  const jetzt = new Date().toISOString();
  const wer = `${m.name} <${m.email}>`;

  try {
    if (aktion === 'speichern' && !id) {
      if (!darfSchreiben(m, def)) return antwort('fehler', 'Dafür fehlt dir die Berechtigung.');
      const { daten, fehler } = formLesen(def, fd);
      if (fehler.length) return antwort('fehler', fehler.join(' '), { neu: '1' });
      const neu = { ...daten, id: neueId(), erstellt: jetzt, von: wer, geaendert: '' };
      await anhaengen(def, neu);
      await protokollieren(m, def.key, 'neu', neu.id, daten);
      if (def.key === 'mitglieder') mitgliederVergessen();
      return antwort('ok', 'Gespeichert.');
    }

    const zeile = (await lesenEins(def)).find((z) => z.id === id);
    if (!zeile) return antwort('fehler', 'Eintrag nicht gefunden.');

    if (aktion === 'speichern') {
      if (def.unveraenderbar) return antwort('fehler', 'Buchungen werden nicht geändert. Bitte stornieren und neu buchen.');
      const voll = darfSchreiben(m, def);
      const eigen = !voll && darfEigene(m, def, zeile);
      if (!voll && !eigen) return antwort('fehler', 'Dafür fehlt dir die Berechtigung.');
      const { daten, fehler } = formLesen(def, fd, voll ? undefined : def.eigene?.felder);
      if (fehler.length) return antwort('fehler', fehler.join(' '), { bearbeiten: id });
      // Leer, null und fehlend gelten als gleich; nur echte Änderungen landen im Sheet und im Journal.
      const norm = (w: unknown) => (w === null || w === undefined || w === '' || (Array.isArray(w) && w.length === 0) ? '' : JSON.stringify(w));
      const aenderung = Object.fromEntries(
        Object.entries(daten).filter(([k, v]) => norm(v) !== norm(zeile[k] ?? (typeof v === 'boolean' ? false : ''))),
      );
      if (Object.keys(aenderung).length === 0) return antwort('ok', 'Keine Änderung.');
      await aktualisieren(def, id, { ...aenderung, geaendert: jetzt });
      await protokollieren(m, def.key, 'geändert', id, aenderung);
      if (def.key === 'mitglieder') mitgliederVergessen();
      return antwort('ok', 'Gespeichert.');
    }

    if (aktion === 'loeschen') {
      if (def.unveraenderbar || !darfSchreiben(m, def)) return antwort('fehler', 'Löschen ist hier nicht erlaubt.');
      const { vorher } = await loeschen(def, id);
      const { _zeile, ...kopie } = vorher;
      await protokollieren(m, def.key, 'gelöscht', id, kopie);
      if (def.key === 'mitglieder') mitgliederVergessen();
      return antwort('ok', 'Gelöscht. Eine Kopie steht im Journal.');
    }

    if (aktion === 'storno') {
      if (!def.unveraenderbar || !darfSchreiben(m, def)) return antwort('fehler', 'Storno ist hier nicht möglich.');
      const alle = await lesenEins(def);
      if (zeile.storno || alle.some((z) => z.storno === id)) return antwort('fehler', 'Diese Buchung ist bereits storniert.');
      const gegen = {
        ...zeile,
        id: neueId(),
        datum: jetzt.slice(0, 10),
        art: zeile.art === 'Einnahme' ? 'Ausgabe' : 'Einnahme',
        beschreibung: `Storno: ${String(zeile.beschreibung ?? '')}`.slice(0, 300),
        storno: id,
        erstellt: jetzt,
        von: wer,
        geaendert: '',
      };
      await anhaengen(def, gegen);
      await protokollieren(m, def.key, 'storniert', id, { gegenbuchung: gegen.id, betrag: zeile.betrag });
      return antwort('ok', 'Storniert. Bitte die richtige Buchung neu anlegen.');
    }

    return antwort('fehler', 'Unbekannte Aktion.');
  } catch (e) {
    console.error('[intern/tabelle]', def.key, (e as Error).message);
    return antwort('fehler', e instanceof DatenFehler ? e.message : 'Speichern fehlgeschlagen. Bitte noch einmal versuchen.');
  }
};
