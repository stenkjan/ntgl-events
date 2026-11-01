import { env } from '../env';
import { datumKurz, heuteIso, nachtMinuten, tageBis } from './format';
import { TABELLEN, type Tabelle } from './schema';
import { alsDatum, datenBereit, DatenFehler, lesen, rohLesen, type Zeile } from './sheets';

/**
 * Der gesamte Datenstand für Übersicht und Module in einem Durchgang:
 * alle Blätter aus „NTGL Verein Daten“ plus die Gästeanmeldungen aus „NTGL Anmeldungen“.
 */

export interface Anmeldung {
  zeit: string;
  label: string;
  /** Veranstaltungsdatum aus dem Label „Titel (TT.MM.JJJJ)“ */
  datum: string;
  name: string;
  email: string;
  newsletter: boolean;
  zeile: number;
}

export interface Lage {
  bereit: boolean;
  fehler?: string;
  t: Record<keyof typeof TABELLEN, Zeile[]>;
  einstellungen: Record<string, string>;
  anmeldungen: Anmeldung[];
  anmeldungenFehler?: string;
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

export async function ladeLage(nur?: Tabelle[]): Promise<Lage> {
  const defs = nur ?? Object.values(TABELLEN);
  const leer = Object.fromEntries(Object.keys(TABELLEN).map((k) => [k, [] as Zeile[]])) as Lage['t'];
  const lage: Lage = { bereit: datenBereit(), t: leer, einstellungen: {}, anmeldungen: [] };

  const aufgaben: Promise<void>[] = [];
  if (lage.bereit) {
    aufgaben.push(
      lesen(defs.includes(TABELLEN.einstellungen) ? defs : [...defs, TABELLEN.einstellungen])
        .then((r) => {
          Object.assign(lage.t, r);
          for (const z of lage.t.einstellungen) lage.einstellungen[s(z.schluessel)] = s(z.wert);
        })
        .catch((e: Error) => {
          lage.fehler = e instanceof DatenFehler ? e.message : `Daten nicht lesbar: ${e.message}`;
        }),
    );
  } else {
    lage.fehler = 'Die Vereinstabelle ist noch nicht verbunden (INTERN_SHEET_ID und Google-Zugang).';
  }
  aufgaben.push(
    ladeAnmeldungen()
      .then((a) => {
        lage.anmeldungen = a;
      })
      .catch((e: Error) => {
        lage.anmeldungenFehler = e.message;
      }),
  );
  await Promise.all(aufgaben);
  return lage;
}

export async function ladeAnmeldungen(): Promise<Anmeldung[]> {
  const sheetId = env('SHEET_ID');
  if (!sheetId || !datenBereitAnmeldungen()) return [];
  const werte = await rohLesen(sheetId, env('SHEET_TAB') || 'Anmeldungen');
  const kopf = (werte[0] ?? []).map((v) => s(v).trim().toLowerCase());
  const spalte = (name: string, ersatz: number) => {
    const i = kopf.findIndex((k) => k.startsWith(name));
    return i >= 0 ? i : ersatz;
  };
  const iZeit = spalte('zeit', 0);
  const iVer = spalte('veranstaltung', 1);
  const iName = spalte('name', 2);
  const iMail = spalte('e-mail', 3);
  const iNews = spalte('newsletter', 4);
  const start = kopf.some((k) => k.startsWith('zeit') || k.startsWith('name')) ? 1 : 0;

  const liste: Anmeldung[] = [];
  for (let r = start; r < werte.length; r++) {
    const z = werte[r] ?? [];
    const label = s(z[iVer]);
    const m = label.match(/\((\d{2})\.(\d{2})\.(\d{4})\)/);
    const zeitRoh = s(z[iZeit]);
    const zeit = Number.isNaN(Date.parse(zeitRoh)) ? alsDatum(zeitRoh) : new Date(zeitRoh).toISOString();
    liste.push({
      zeit,
      label,
      datum: m ? `${m[3]}-${m[2]}-${m[1]}` : '',
      name: s(z[iName]),
      email: s(z[iMail]).toLowerCase(),
      newsletter: ['ja', 'true', 'yes', '1'].includes(s(z[iNews]).toLowerCase()),
      zeile: r + 1,
    });
  }
  return liste;
}

const datenBereitAnmeldungen = () => Boolean(env('GOOGLE_SERVICE_ACCOUNT_EMAIL') && env('GOOGLE_PRIVATE_KEY'));

/* ---------- Veranstaltungen ---------- */

export const veranstaltungLabel = (v: Zeile | undefined, datum = '') =>
  v ? `${datumKurz(s(v.datum))} · ${s(v.titel)}` : datum ? datumKurz(datum) : '–';

export function veranstaltungNach(lage: Lage, datum: string): Zeile | undefined {
  return lage.t.veranstaltungen.find((v) => s(v.datum) === datum);
}

/** Nächste geplante Party (bis 36 h nach Beginn noch „aktuell“) */
export function naechsteVeranstaltung(lage: Lage, jetzt = new Date()): Zeile | undefined {
  return lage.t.veranstaltungen
    .filter((v) => s(v.datum) && !['Abgesagt', 'Abgeschlossen', 'Idee'].includes(s(v.status)) && tageBis(s(v.datum), jetzt) >= -1)
    .sort((a, b) => s(a.datum).localeCompare(s(b.datum)))[0];
}

export function vergangene(lage: Lage, jetzt = new Date()): Zeile[] {
  return lage.t.veranstaltungen
    .filter((v) => s(v.datum) && s(v.status) !== 'Abgesagt' && tageBis(s(v.datum), jetzt) < -1)
    .sort((a, b) => s(a.datum).localeCompare(s(b.datum)));
}

export function veranstaltungAuswahl(lage: Lage): Array<{ wert: string; label: string }> {
  return [...lage.t.veranstaltungen]
    .filter((v) => s(v.datum))
    .sort((a, b) => s(b.datum).localeCompare(s(a.datum)))
    .map((v) => ({ wert: s(v.datum), label: veranstaltungLabel(v) }));
}

export function kapazitaet(lage: Lage, v: Zeile | undefined): number | null {
  const eigene = v && typeof v.kapazitaet === 'number' ? v.kapazitaet : null;
  if (eigene) return eigene;
  const standard = Number(lage.einstellungen.kapazitaet);
  return Number.isFinite(standard) && standard > 0 ? standard : null;
}

export const anmeldungenFuer = (lage: Lage, datum: string) => lage.anmeldungen.filter((a) => a.datum === datum);

export function lineupFuer(lage: Lage, datum: string): Zeile[] {
  return lage.t.lineup
    .filter((l) => s(l.veranstaltung) === datum)
    .sort((a, b) => nachtMinuten(s(a.start)) - nachtMinuten(s(b.start)));
}

/* ---------- Geld ---------- */

export interface Summen {
  einnahmen: number;
  ausgaben: number;
  saldo: number;
}

export function summen(buchungen: Zeile[]): Summen {
  let einnahmen = 0;
  let ausgaben = 0;
  // Storno-Paare heben sich auf und zählen in den Bruttosummen nicht mit.
  const storniert = new Set(buchungen.map((b) => s(b.storno)).filter(Boolean));
  for (const b of buchungen) {
    if (s(b.storno) || storniert.has(b.id)) continue;
    if (s(b.art) === 'Einnahme') einnahmen += n(b.betrag);
    else if (s(b.art) === 'Ausgabe') ausgaben += n(b.betrag);
  }
  return { einnahmen, ausgaben, saldo: einnahmen - ausgaben };
}

export const buchungenFuer = (lage: Lage, datum: string) => lage.t.buchungen.filter((b) => s(b.veranstaltung) === datum);

export function kontostand(lage: Lage): { kassa: number; bank: number; gesamt: number } {
  const kassa = summen(lage.t.buchungen.filter((b) => s(b.konto) !== 'Bank')).saldo;
  const bank = summen(lage.t.buchungen.filter((b) => s(b.konto) === 'Bank')).saldo;
  return { kassa, bank, gesamt: kassa + bank };
}

export interface BudgetZeile {
  kategorie: string;
  art: 'Ausgabe' | 'Einnahme';
  plan: number | null;
  ist: number;
  /** Mittelwert der Archivwerte früherer Partys */
  vorschlag: number | null;
  vorschlagN: number;
}

/** Plan gegen Ist je Kategorie für eine Party, mit Vorschlag aus dem Archiv */
export function budgetFuer(lage: Lage, datum: string): BudgetZeile[] {
  const zeilen = new Map<string, BudgetZeile>();
  const schl = (art: string, kat: string) => `${art}|${kat}`;
  const holen = (art: 'Ausgabe' | 'Einnahme', kategorie: string) => {
    const k = schl(art, kategorie);
    if (!zeilen.has(k)) zeilen.set(k, { kategorie, art, plan: null, ist: 0, vorschlag: null, vorschlagN: 0 });
    return zeilen.get(k)!;
  };
  for (const b of lage.t.budget.filter((b) => s(b.veranstaltung) === datum)) {
    const z = holen(s(b.art) === 'Einnahme' ? 'Einnahme' : 'Ausgabe', s(b.kategorie));
    if (typeof b.plan === 'number') z.plan = (z.plan ?? 0) + b.plan;
  }
  for (const b of buchungenFuer(lage, datum)) {
    const art = s(b.art) === 'Einnahme' ? 'Einnahme' : 'Ausgabe';
    holen(art, s(b.kategorie)).ist += n(b.betrag);
  }
  const archiv = new Map<string, number[]>();
  for (const b of lage.t.budget) {
    if (s(b.veranstaltung) === datum || typeof b.archiv !== 'number') continue;
    const k = schl(s(b.art) === 'Einnahme' ? 'Einnahme' : 'Ausgabe', s(b.kategorie));
    archiv.set(k, [...(archiv.get(k) ?? []), b.archiv]);
  }
  for (const [k, werte] of archiv) {
    const [art, kategorie] = k.split('|') as ['Ausgabe' | 'Einnahme', string];
    const z = holen(art, kategorie);
    z.vorschlag = Math.round(werte.reduce((a, b) => a + b, 0) / werte.length);
    z.vorschlagN = werte.length;
  }
  return [...zeilen.values()].sort((a, b) => (a.art === b.art ? a.kategorie.localeCompare(b.kategorie) : a.art === 'Ausgabe' ? -1 : 1));
}

/* ---------- Historie ---------- */

export interface HistorieZeile {
  datum: string;
  titel: string;
  gaeste: number | null;
  anmeldungen: number;
  einnahmen: number | null;
  ausgaben: number | null;
  ergebnis: number | null;
  gezaehlt: number | null;
  differenz: number | null;
  quelle: 'Kassabuch' | 'Archiv' | 'keine';
}

export function historie(lage: Lage, jetzt = new Date()): HistorieZeile[] {
  return vergangene(lage, jetzt).map((v) => {
    const datum = s(v.datum);
    const b = buchungenFuer(lage, datum);
    const archivEin = typeof v.einnahmen === 'number' ? v.einnahmen : null;
    const archivAus = typeof v.ausgaben === 'number' ? v.ausgaben : null;
    const ausKassabuch = b.length > 0;
    const sum = summen(b);
    const einnahmen = ausKassabuch ? sum.einnahmen : archivEin;
    const ausgaben = ausKassabuch ? sum.ausgaben : archivAus;
    const ergebnis = einnahmen !== null && ausgaben !== null ? einnahmen - ausgaben : null;
    const gezaehlt = typeof v.gezaehlt === 'number' ? v.gezaehlt : null;
    return {
      datum,
      titel: s(v.titel),
      gaeste: typeof v.gaeste === 'number' ? v.gaeste : null,
      anmeldungen: anmeldungenFuer(lage, datum).length,
      einnahmen,
      ausgaben,
      ergebnis,
      gezaehlt,
      differenz: gezaehlt !== null && ergebnis !== null && !ausKassabuch ? gezaehlt - ergebnis : null,
      quelle: ausKassabuch ? 'Kassabuch' : archivEin !== null || archivAus !== null ? 'Archiv' : 'keine',
    };
  });
}

/* ---------- Personen ---------- */

export function namenListe(lage: Lage): string[] {
  return lage.t.mitglieder
    .filter((m) => s(m.status || 'aktiv') === 'aktiv')
    .map((m) => s(m.name))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

/** Passt ein Personenfeld („Anna, Ben“, „Alle“) zu diesem Namen? */
export function betrifft(feld: unknown, name: string): boolean {
  const vor = name.trim().split(/\s+/)[0]?.toLowerCase();
  if (!vor) return false;
  return s(feld)
    .toLowerCase()
    .split(/[,/&+]|\bund\b/)
    .map((x) => x.trim())
    .some((x) => x === 'alle' || x === name.toLowerCase() || x.split(/\s+/)[0] === vor);
}

export const heute = () => heuteIso();
