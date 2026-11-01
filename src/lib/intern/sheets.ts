import { randomBytes } from 'node:crypto';
import { env } from '../env';
import { googleAccessToken, googleKonfiguriert, SCOPE_DRIVE_LESEN, SCOPE_SHEETS } from '../google';
import { spalten, type Feld, type Tabelle } from './schema';

/**
 * Generischer Zugriff auf das Google Sheet des Mitgliederbereichs.
 * Werte werden RAW geschrieben (keine Formel-Auswertung von Eingaben) und
 * UNFORMATTED gelesen; Datum und Zeit normalisieren wir selbst.
 */

export class DatenFehler extends Error {}

export type Wert = string | number | boolean | string[] | null;
export type Zeile = Record<string, Wert> & { id: string; _zeile: number };

const API = 'https://sheets.googleapis.com/v4/spreadsheets';
const MERKEN_MS = 15_000;

export const internSheetId = () => env('INTERN_SHEET_ID');
export const datenBereit = () => Boolean(internSheetId() && googleKonfiguriert());

async function anfrage<T>(pfad: string, init: RequestInit = {}): Promise<T> {
  const token = await googleAccessToken([SCOPE_SHEETS, SCOPE_DRIVE_LESEN]);
  if (!token) throw new DatenFehler('Google-Zugang fehlt (GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY).');
  const res = await fetch(`${API}/${pfad}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = (await res.text()).slice(0, 300);
    if (res.status === 403 || res.status === 404) {
      throw new DatenFehler(`Kein Zugriff auf die Tabelle (${res.status}). Ist sie für den Service-Account freigegeben?`);
    }
    throw new DatenFehler(`Google Sheets ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

const bereich = (blatt: string, teil = '') => encodeURIComponent(`'${blatt.replace(/'/g, "''")}'${teil}`);

/* ---------- Umwandlung zwischen Sheet-Wert und Feldwert ---------- */

const SHEETS_EPOCHE = Date.UTC(1899, 11, 30);

export function alsDatum(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') return new Date(SHEETS_EPOCHE + Math.floor(v) * 86_400_000).toISOString().slice(0, 10);
  const s = String(v).trim();
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2]!.padStart(2, '0')}-${iso[3]!.padStart(2, '0')}`;
  const de = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (de) {
    const jahr = de[3]!.length === 2 ? `20${de[3]}` : de[3]!;
    return `${jahr}-${de[2]!.padStart(2, '0')}-${de[1]!.padStart(2, '0')}`;
  }
  return '';
}

export function alsZeit(v: unknown): string {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') {
    const minuten = Math.round((v % 1) * 1440) % 1440;
    return `${String(Math.floor(minuten / 60)).padStart(2, '0')}:${String(minuten % 60).padStart(2, '0')}`;
  }
  const m = String(v).trim().match(/^(\d{1,2})[:.](\d{2})/);
  return m ? `${m[1]!.padStart(2, '0')}:${m[2]}` : '';
}

export function alsZahl(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[€\s]/g, '').replace(/^~/, '');
  // 1.234,56 → 1234.56 · 12,5 → 12.5
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export const alsJaNein = (v: unknown): boolean =>
  v === true || ['ja', 'yes', 'true', 'x', '1', 'wahr'].includes(String(v ?? '').trim().toLowerCase());

export function lesenAls(feld: Feld, v: unknown): Wert {
  switch (feld.typ) {
    case 'datum':
    case 'veranstaltung':
      return alsDatum(v);
    case 'zeit':
      return alsZeit(v);
    case 'zahl':
    case 'geld':
      return alsZahl(v);
    case 'janein':
      return alsJaNein(v);
    case 'mehrfach':
      return String(v ?? '')
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
    default:
      return v === null || v === undefined ? '' : String(v);
  }
}

export function schreibenAls(feld: Feld, v: Wert | undefined): string | number {
  if (v === null || v === undefined) return '';
  switch (feld.typ) {
    case 'zahl':
    case 'geld':
      return typeof v === 'number' ? v : (alsZahl(v) ?? '');
    case 'janein':
      return v === true || alsJaNein(v) ? 'ja' : 'nein';
    case 'mehrfach':
      return Array.isArray(v) ? v.join(', ') : String(v);
    default:
      return Array.isArray(v) ? v.join(', ') : String(v);
  }
}

/* ---------- Lesen mit kurzem Zwischenspeicher ---------- */

interface Blattdaten {
  kopf: string[];
  zeilen: Zeile[];
}

const gemerkt = new Map<string, { zeit: number; daten: Blattdaten }>();
const schluessel = (sheetId: string, blatt: string) => `${sheetId}::${blatt}`;

export function vergessen(sheetId = internSheetId(), blatt?: string) {
  for (const k of gemerkt.keys()) {
    if (blatt ? k === schluessel(sheetId, blatt) : k.startsWith(`${sheetId}::`)) gemerkt.delete(k);
  }
}

const kopfNorm = (s: string) => s.trim().toLowerCase();

function parseBlatt(def: Tabelle, werte: unknown[][]): Blattdaten {
  const kopf = (werte[0] ?? []).map((v) => String(v ?? ''));
  const felder = spalten(def);
  const index = new Map(kopf.map((k, i) => [kopfNorm(k), i]));
  const zeilen: Zeile[] = [];
  for (let r = 1; r < werte.length; r++) {
    const roh = werte[r] ?? [];
    if (roh.every((v) => v === '' || v === null || v === undefined)) continue;
    const z: Record<string, Wert> = {};
    for (const f of felder) {
      const i = index.get(kopfNorm(f.titel));
      z[f.key] = lesenAls(f, i === undefined ? '' : roh[i]);
    }
    zeilen.push({ ...(z as Record<string, Wert>), id: String(z.id ?? '') || `zeile-${r + 1}`, _zeile: r + 1 } as Zeile);
  }
  return { kopf, zeilen };
}

/** Liest mehrere Tabellen mit einer Anfrage. Fehlende Blätter liefern leere Listen. */
export async function lesen(defs: Tabelle[], sheetId = internSheetId()): Promise<Record<string, Zeile[]>> {
  const ergebnis: Record<string, Zeile[]> = {};
  if (!sheetId) {
    for (const d of defs) ergebnis[d.key] = [];
    return ergebnis;
  }
  const offen = defs.filter((d) => {
    const hit = gemerkt.get(schluessel(sheetId, d.blatt));
    if (hit && Date.now() - hit.zeit < MERKEN_MS) {
      ergebnis[d.key] = hit.daten.zeilen;
      return false;
    }
    return true;
  });
  if (offen.length === 0) return ergebnis;

  const vorhanden = new Set(await blattTitel(sheetId));
  const lesbar = offen.filter((d) => vorhanden.has(d.blatt));
  for (const d of offen) if (!vorhanden.has(d.blatt)) ergebnis[d.key] = [];
  if (lesbar.length === 0) return ergebnis;

  const q = lesbar.map((d) => `ranges=${bereich(d.blatt, '!A1:ZZ')}`).join('&');
  const r = await anfrage<{ valueRanges: Array<{ values?: unknown[][] }> }>(
    `${sheetId}/values:batchGet?${q}&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`,
  );
  lesbar.forEach((d, i) => {
    const daten = parseBlatt(d, r.valueRanges[i]?.values ?? []);
    gemerkt.set(schluessel(sheetId, d.blatt), { zeit: Date.now(), daten });
    ergebnis[d.key] = daten.zeilen;
  });
  return ergebnis;
}

export async function lesenEins(def: Tabelle, sheetId = internSheetId()): Promise<Zeile[]> {
  return (await lesen([def], sheetId))[def.key] ?? [];
}

/** Rohwerte eines fremden Blatts (z. B. „NTGL Anmeldungen“) */
export async function rohLesen(sheetId: string, blatt: string): Promise<unknown[][]> {
  const r = await anfrage<{ values?: unknown[][] }>(
    `${sheetId}/values/${bereich(blatt, '!A1:ZZ')}?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`,
  );
  return r.values ?? [];
}

/* ---------- Metadaten ---------- */

interface BlattInfo {
  properties: { sheetId: number; title: string; gridProperties?: { rowCount?: number; columnCount?: number } };
}

export async function blaetter(sheetId = internSheetId()): Promise<BlattInfo[]> {
  const r = await anfrage<{ sheets?: BlattInfo[] }>(`${sheetId}?fields=sheets.properties`);
  return r.sheets ?? [];
}

let titelGemerkt: { id: string; zeit: number; titel: string[] } | null = null;
async function blattTitel(sheetId: string): Promise<string[]> {
  if (titelGemerkt && titelGemerkt.id === sheetId && Date.now() - titelGemerkt.zeit < 60_000) return titelGemerkt.titel;
  const titel = (await blaetter(sheetId)).map((b) => b.properties.title);
  titelGemerkt = { id: sheetId, zeit: Date.now(), titel };
  return titel;
}

export async function batchUpdate(requests: unknown[], sheetId = internSheetId()) {
  titelGemerkt = null;
  return anfrage<{ replies?: unknown[] }>(`${sheetId}:batchUpdate`, {
    method: 'POST',
    body: JSON.stringify({ requests }),
  });
}

/* ---------- Schreiben ---------- */

export const neueId = () => randomBytes(4).toString('hex');

async function kopfzeile(def: Tabelle, sheetId: string): Promise<string[]> {
  const r = await anfrage<{ values?: unknown[][] }>(`${sheetId}/values/${bereich(def.blatt, '!1:1')}`);
  const kopf = (r.values?.[0] ?? []).map((v) => String(v ?? ''));
  if (kopf.length === 0) throw new DatenFehler(`Blatt „${def.blatt}“ hat keine Kopfzeile. Bitte unter Einstellungen „Tabelle einrichten“ ausführen.`);
  return kopf;
}

function zeileBauen(def: Tabelle, kopf: string[], daten: Record<string, Wert | undefined>): Array<string | number> {
  const felder = new Map(spalten(def).map((f) => [kopfNorm(f.titel), f]));
  return kopf.map((k) => {
    const f = felder.get(kopfNorm(k));
    return f ? schreibenAls(f, daten[f.key]) : '';
  });
}

export async function anhaengen(def: Tabelle, daten: Record<string, Wert | undefined>, sheetId = internSheetId()) {
  const kopf = await kopfzeile(def, sheetId);
  await anfrage(`${sheetId}/values/${bereich(def.blatt, '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({ values: [zeileBauen(def, kopf, daten)] }),
  });
  vergessen(sheetId, def.blatt);
}

/** Mehrere Zeilen auf einmal (Einrichtung, Startdaten) */
export async function anhaengenViele(def: Tabelle, liste: Array<Record<string, Wert | undefined>>, sheetId = internSheetId()) {
  if (liste.length === 0) return;
  const kopf = await kopfzeile(def, sheetId);
  await anfrage(`${sheetId}/values/${bereich(def.blatt, '!A1')}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, {
    method: 'POST',
    body: JSON.stringify({ values: liste.map((d) => zeileBauen(def, kopf, d)) }),
  });
  vergessen(sheetId, def.blatt);
}

async function frischeZeile(def: Tabelle, id: string, sheetId: string): Promise<Zeile> {
  vergessen(sheetId, def.blatt);
  const z = (await lesenEins(def, sheetId)).find((r) => r.id === id);
  if (!z) throw new DatenFehler('Datensatz nicht gefunden. Wurde er inzwischen gelöscht?');
  return z;
}

export async function aktualisieren(
  def: Tabelle,
  id: string,
  aenderung: Record<string, Wert | undefined>,
  sheetId = internSheetId(),
): Promise<{ vorher: Zeile }> {
  const vorher = await frischeZeile(def, id, sheetId);
  const kopf = await kopfzeile(def, sheetId);
  const neu = { ...vorher, ...aenderung, id: vorher.id };
  await anfrage(`${sheetId}/values/${bereich(def.blatt, `!A${vorher._zeile}`)}?valueInputOption=RAW`, {
    method: 'PUT',
    body: JSON.stringify({ values: [zeileBauen(def, kopf, neu)] }),
  });
  vergessen(sheetId, def.blatt);
  return { vorher };
}

export async function loeschen(def: Tabelle, id: string, sheetId = internSheetId()): Promise<{ vorher: Zeile }> {
  const vorher = await frischeZeile(def, id, sheetId);
  const info = (await blaetter(sheetId)).find((b) => b.properties.title === def.blatt);
  if (!info) throw new DatenFehler(`Blatt „${def.blatt}“ fehlt.`);
  await batchUpdate(
    [
      {
        deleteDimension: {
          range: { sheetId: info.properties.sheetId, dimension: 'ROWS', startIndex: vorher._zeile - 1, endIndex: vorher._zeile },
        },
      },
    ],
    sheetId,
  );
  vergessen(sheetId, def.blatt);
  return { vorher };
}
