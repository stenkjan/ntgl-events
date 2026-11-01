import { veranstaltungLabel, veranstaltungNach, type Lage } from './daten';
import { datumKurz, euro, zahl, zeitstempel } from './format';
import type { Feld } from './schema';
import type { Wert } from './sheets';

/** Statusfarben sind reserviert und erscheinen nur mit Symbol und Text. */
export type Ton = 'gut' | 'warnung' | 'ernst' | 'kritisch' | 'neutral';

const TON: Record<string, Ton> = {
  erledigt: 'gut',
  zugesagt: 'gut',
  vorhanden: 'gut',
  'bestätigt': 'gut',
  abgeschlossen: 'gut',
  aktiv: 'gut',
  'gültig': 'gut',
  offen: 'neutral',
  'in arbeit': 'warnung',
  angefragt: 'warnung',
  planung: 'warnung',
  bald: 'warnung',
  verliehen: 'warnung',
  inaktiv: 'warnung',
  'benötigt': 'ernst',
  hoch: 'ernst',
  defekt: 'kritisch',
  abgesagt: 'kritisch',
  ausgetreten: 'kritisch',
  aufgehoben: 'kritisch',
};

export const ton = (wert: string): Ton => TON[wert.trim().toLowerCase()] ?? 'neutral';

export const TON_STIL: Record<Ton, { farbe: string; symbol: string }> = {
  gut: { farbe: '#0ca30c', symbol: '✓' },
  warnung: { farbe: '#fab219', symbol: '◐' },
  ernst: { farbe: '#ec835a', symbol: '!' },
  kritisch: { farbe: '#d03b3b', symbol: '✕' },
  neutral: { farbe: '#8fa9a7', symbol: '•' },
};

/** Statusfelder werden als Marke gezeigt */
export const istStatusFeld = (f: Feld) => f.typ === 'auswahl' && ['status', 'zustand', 'prioritaet'].includes(f.key);

export function anzeigen(f: Feld, w: Wert, lage?: Lage): string {
  if (w === null || w === undefined || w === '' || (Array.isArray(w) && w.length === 0)) return '–';
  switch (f.typ) {
    case 'datum':
      return datumKurz(String(w));
    case 'veranstaltung':
      return lage ? veranstaltungLabel(veranstaltungNach(lage, String(w)), String(w)) : datumKurz(String(w));
    case 'geld':
      return typeof w === 'number' ? euro(w) : String(w);
    case 'zahl':
      return typeof w === 'number' ? zahl(w) : String(w);
    case 'janein':
      return w === true ? 'ja' : 'nein';
    case 'mehrfach':
      return Array.isArray(w) ? w.join(', ') : String(w);
    case 'lang': {
      const t = String(w);
      return t.length > 90 ? `${t.slice(0, 90)} …` : t;
    }
    default:
      if (f.key === 'zeit' && /^\d{4}-\d{2}-\d{2}T/.test(String(w))) return zeitstempel(String(w));
      return String(w);
  }
}
