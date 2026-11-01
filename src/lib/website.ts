import { env } from './env';
import { googleKonfiguriert } from './google';
import { TABELLEN } from './intern/schema';
import { lesenEins, type Zeile } from './intern/sheets';

/**
 * Brücke vom Mitgliederbereich zur öffentlichen Seite.
 * „Veröffentlichen“ schreibt einen Schnappschuss (Freigabe) ins Blatt „Freigaben“;
 * der Build der Website liest nur die jüngste Freigabe, nie die Arbeitsblätter.
 * So geht nichts ohne Freigabe online, und jede Version bleibt nachvollziehbar.
 */

export interface OeffentlicherAct {
  time?: string;
  artist: string;
  genre?: string;
  links: Array<{ label: string; url: string }>;
}

export interface OeffentlicheVeranstaltung {
  datum: string;
  /** Status „Bestätigt“ oder „Abgeschlossen“; sonst zeigt die Website „Datum folgt“ */
  datumFix: boolean;
  titel: string;
  untertitel?: string;
  einlass?: string;
  ende?: string;
  location?: string;
  adresse?: string;
  preistext?: string;
  anmeldung?: 'open' | 'soon' | 'closed';
  /** Drive-ID des Flyers */
  flyer?: string;
  hinweise?: string[];
  beschreibung?: string;
  /** leer = Line-up aus der Markdown-Datei bleibt */
  lineup: OeffentlicherAct[];
}

export interface OeffentlichesBild {
  id: string;
  titel?: string;
  credit?: string;
  datum?: string;
}

export interface FreigabeInhalt {
  version: 1;
  zeit: string;
  wer: string;
  veranstaltungen: OeffentlicheVeranstaltung[];
  bilder: OeffentlichesBild[];
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v).trim());
const ANMELDUNG: Record<string, OeffentlicheVeranstaltung['anmeldung']> = { offen: 'open', bald: 'soon', geschlossen: 'closed' };

const nacht = (zeit: string) => {
  const m = zeit.match(/^(\d{2}):(\d{2})$/);
  if (!m) return 99_999;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return min < 720 ? min + 1440 : min;
};

/** Genre und BPM wie in den Event-Dateien: „Vocal · 150–160 BPM“ */
const mitBpm = (genre: string, bpm: string): string | undefined => {
  const tempo = bpm && !/bpm/i.test(bpm) ? `${bpm} BPM` : bpm;
  return [genre, tempo].filter(Boolean).join(' · ') || undefined;
};

/** Aus den Arbeitsblättern den öffentlichen Stand bauen (Vorschau und Veröffentlichung) */
export function freigabeBauen(
  t: { veranstaltungen: Zeile[]; lineup: Zeile[]; galerie: Zeile[] },
  wer: string,
  jetzt = new Date(),
): FreigabeInhalt {
  const veranstaltungen = t.veranstaltungen
    .filter((v) => v.website === true && /^\d{4}-\d{2}-\d{2}$/.test(s(v.datum)) && s(v.titel))
    .sort((a, b) => s(a.datum).localeCompare(s(b.datum)))
    .map((v): OeffentlicheVeranstaltung => {
      const datum = s(v.datum);
      const lineup = t.lineup
        .filter((l) => s(l.veranstaltung) === datum && l.website === true && s(l.status) !== 'Abgesagt' && s(l.artist))
        .sort((a, b) => nacht(s(a.start)) - nacht(s(b.start)))
        .map((l) => ({
          time: s(l.start) || undefined,
          artist: s(l.artist),
          genre: mitBpm(s(l.genre), s(l.bpm)),
          links: /^https?:\/\//.test(s(l.link)) ? [{ label: s(l.linkTitel) || 'Link', url: s(l.link) }] : [],
        }));
      return {
        datum,
        datumFix: ['Bestätigt', 'Abgeschlossen'].includes(s(v.status)),
        titel: s(v.titel),
        untertitel: s(v.untertitel) || undefined,
        einlass: s(v.einlass) || undefined,
        ende: s(v.ende) || undefined,
        location: s(v.location) || undefined,
        adresse: s(v.adresse) || undefined,
        preistext: s(v.preistext) || undefined,
        anmeldung: ANMELDUNG[s(v.anmeldung)],
        flyer: s(v.flyer) || undefined,
        hinweise: s(v.hinweise)
          ? s(v.hinweise)
              .split(/\r?\n/)
              .map((h) => h.trim())
              .filter(Boolean)
          : undefined,
        beschreibung: s(v.beschreibung) || undefined,
        lineup,
      };
    });
  const bilder = t.galerie
    .filter((g) => g.website === true && /^[\w-]{10,}$/.test(s(g.drive)))
    .map((g) => ({
      id: s(g.drive),
      titel: s(g.titel) || undefined,
      credit: s(g.credit) || undefined,
      datum: s(g.veranstaltung) || undefined,
    }));
  return { version: 1, zeit: jetzt.toISOString(), wer, veranstaltungen, bilder };
}

export function freigabeLesen(zeilen: Zeile[]): FreigabeInhalt | null {
  const z = [...zeilen].sort((a, b) => s(b.zeit).localeCompare(s(a.zeit)))[0];
  if (!z) return null;
  try {
    const inhalt = JSON.parse(s(z.inhalt)) as FreigabeInhalt;
    return inhalt?.version === 1 ? inhalt : null;
  } catch {
    return null;
  }
}

let gemerkt: { zeit: number; inhalt: FreigabeInhalt | null } | null = null;

/** Jüngste Freigabe aus dem Sheet (Build der Website und Medien-Proxy). Ohne Konfiguration: null. */
export async function juengsteFreigabeLaden(merkenMs = 300_000): Promise<FreigabeInhalt | null> {
  if (!env('INTERN_SHEET_ID') || !googleKonfiguriert()) return null;
  if (gemerkt && Date.now() - gemerkt.zeit < merkenMs) return gemerkt.inhalt;
  try {
    const inhalt = freigabeLesen(await lesenEins(TABELLEN.freigaben));
    gemerkt = { zeit: Date.now(), inhalt };
    return inhalt;
  } catch (e) {
    console.warn('[website] Freigabe nicht lesbar, Website nutzt nur die Markdown-Dateien.', (e as Error).message);
    return null;
  }
}

/** Drive-IDs, die öffentlich ausgeliefert werden dürfen (Flyer und freigegebene Fotos) */
export const freigegebeneBilder = (f: FreigabeInhalt | null): Set<string> =>
  new Set([...(f?.bilder.map((b) => b.id) ?? []), ...(f?.veranstaltungen.map((v) => v.flyer).filter((x): x is string => Boolean(x)) ?? [])]);

export const medienUrl = (driveId: string) => `/media/${driveId}`;
