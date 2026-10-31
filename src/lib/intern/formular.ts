import { betrifft } from './daten';
import type { Mitglied } from './rollen';
import type { Feld, Tabelle } from './schema';
import { alsZahl, type Wert, type Zeile } from './sheets';

/** Liest und prüft ein Formular gegen die Tabellen-Definition. */
export function formLesen(def: Tabelle, fd: FormData, nurFelder?: string[]): { daten: Record<string, Wert>; fehler: string[] } {
  const daten: Record<string, Wert> = {};
  const fehler: string[] = [];
  const felder = def.felder.filter((f) => !f.system && (!nurFelder || nurFelder.includes(f.key)));

  for (const f of felder) {
    const roh = fd.get(f.key);
    const text = typeof roh === 'string' ? roh.trim() : '';
    const wert = feldWert(f, text, fd);
    if (wert.fehler) fehler.push(`${f.titel}: ${wert.fehler}`);
    const leer = wert.v === '' || wert.v === null || (Array.isArray(wert.v) && wert.v.length === 0);
    if (f.pflicht && leer && f.typ !== 'janein') fehler.push(`${f.titel} fehlt.`);
    daten[f.key] = wert.v;
  }
  if (def.key === 'buchungen' && typeof daten.betrag === 'number' && daten.betrag <= 0) fehler.push('Betrag muss größer als 0 sein.');
  if (def.key === 'buchungen' && daten.art && daten.kategorie) {
    const einnahmeKat = ['Einlass', 'Garderobe', 'Spende', 'Mitgliedsbeitrag', 'Übertrag', 'Sonstige Einnahme'];
    const passt = (daten.art === 'Einnahme') === einnahmeKat.includes(String(daten.kategorie));
    if (!passt && daten.kategorie !== 'Übertrag') fehler.push('Kategorie passt nicht zur Art (Einnahme/Ausgabe).');
  }
  return { daten, fehler };
}

function feldWert(f: Feld, text: string, fd: FormData): { v: Wert; fehler?: string } {
  const lang = (max: number) => (text.length > max ? { v: text.slice(0, max), fehler: `höchstens ${max} Zeichen` } : { v: text });
  switch (f.typ) {
    case 'lang':
      return lang(5000);
    case 'text':
    case 'person':
      return lang(300);
    case 'email':
      if (text && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(text)) return { v: text, fehler: 'keine gültige E-Mail-Adresse' };
      return { v: text.toLowerCase() };
    case 'link':
      if (text && !/^https?:\/\/\S+$/i.test(text)) return { v: text, fehler: 'muss mit https:// beginnen' };
      return lang(1000);
    case 'zahl': {
      if (!text) return { v: null };
      const n = alsZahl(text);
      return n === null ? { v: null, fehler: 'keine Zahl' } : { v: n };
    }
    case 'geld': {
      if (!text) return { v: null };
      const n = alsZahl(text);
      if (n === null) return { v: null, fehler: 'kein Betrag' };
      return { v: Math.round(n * 100) / 100 };
    }
    case 'datum':
    case 'veranstaltung':
      if (text && !/^\d{4}-\d{2}-\d{2}$/.test(text)) return { v: '', fehler: 'Datum im Format JJJJ-MM-TT' };
      return { v: text };
    case 'zeit':
      if (text && !/^\d{2}:\d{2}$/.test(text)) return { v: '', fehler: 'Uhrzeit im Format HH:MM' };
      return { v: text };
    case 'auswahl':
      if (text && f.optionen && !f.optionen.includes(text)) return { v: '', fehler: 'unbekannter Wert' };
      return { v: text };
    case 'mehrfach':
      return { v: fd.getAll(f.key).map(String).filter((x) => !f.optionen || f.optionen.includes(x)) };
    case 'janein':
      return { v: text === 'ja' };
  }
}

/* ---------- Rechte je Tabelle ---------- */

export function darfSchreiben(m: Mitglied | undefined, def: Tabelle): boolean {
  if (!m || def.nurSystem) return false;
  return m.rechte.has(def.recht) || Boolean(def.bereich && m.bereiche.includes(def.bereich));
}

/** Darf diese Person die eigene Zeile (z. B. eigene Aufgabe) in einzelnen Feldern ändern? */
export function darfEigene(m: Mitglied | undefined, def: Tabelle, zeile: Zeile | undefined): boolean {
  if (!m || !def.eigene || !zeile) return false;
  return betrifft(zeile[def.eigene.feld], m.name);
}
