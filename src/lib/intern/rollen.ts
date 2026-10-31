/**
 * Rollen im Mitgliederbereich.
 * Die drei Hauptrollen entsprechen den üblichen Vorstandsfunktionen eines Vereins
 * (Obmann/Obfrau, Kassier:in, Schriftführer:in); alle anderen sind Mitglieder.
 * Wer zusätzlich einen Arbeitsbereich betreut (z. B. „Musik & Booking“), darf die
 * Tabellen dieses Bereichs bearbeiten, auch ohne Vorstandsrolle.
 */

export type RolleKey = 'obmann' | 'kassier' | 'schriftfuehrer' | 'mitglied';

export type Recht =
  | 'finanzen.schreiben'
  | 'mitglieder.verwalten'
  | 'planung.schreiben'
  | 'website.veroeffentlichen'
  | 'aufgaben.verwalten'
  | 'equipment.schreiben'
  | 'galerie.freigeben'
  | 'verein.schreiben'
  | 'einstellungen.schreiben'
  | 'personen.sehen';

export interface RolleInfo {
  titel: string;
  /** Wert in der Spalte „Rolle“ der Tabelle Mitglieder */
  wert: string;
  kurz: string;
  aufgaben: string[];
}

export const ROLLEN: Record<RolleKey, RolleInfo> = {
  obmann: {
    titel: 'Obmann/Obfrau',
    wert: 'Obmann',
    kurz: 'Leitung',
    aufgaben: [
      'Leitet den Verein und vertritt ihn nach außen',
      'Beruft Vorstand und Mitgliederversammlung ein',
      'Gibt Inhalte für die Website frei',
      'Zeichnet Geldgeschäfte gemeinsam mit Kassier:in',
    ],
  },
  kassier: {
    titel: 'Kassier:in',
    wert: 'Kassier',
    kurz: 'Finanzen',
    aufgaben: [
      'Führt Kassabuch, Belege und Vereinskonto',
      'Kassensturz am Abend mit einer zweiten Person',
      'Mitgliedsbeiträge und Budget je Party',
      'Einnahmen-Ausgaben-Rechnung für die Rechnungsprüfung',
    ],
  },
  schriftfuehrer: {
    titel: 'Schriftführer:in',
    wert: 'Schriftführer',
    kurz: 'Organisation',
    aufgaben: [
      'Protokolle und Beschlüsse',
      'Mitgliederverzeichnis',
      'Fristen und Meldungen an die Vereinsbehörde',
      'Planung und Website-Inhalte, Veröffentlichung',
    ],
  },
  mitglied: {
    titel: 'Mitglied',
    wert: 'Mitglied',
    kurz: 'Crew',
    aufgaben: [
      'Übernimmt Aufgaben in einem oder mehreren Bereichen',
      'Pflegt Equipment und lädt Fotos hoch',
      'Sieht Planung, Budget und Historie',
    ],
  },
};

export const HAUPTROLLEN: RolleKey[] = ['obmann', 'kassier', 'schriftfuehrer'];

const ALLE: Recht[] = [
  'finanzen.schreiben',
  'mitglieder.verwalten',
  'planung.schreiben',
  'website.veroeffentlichen',
  'aufgaben.verwalten',
  'equipment.schreiben',
  'galerie.freigeben',
  'verein.schreiben',
  'einstellungen.schreiben',
  'personen.sehen',
];

const RECHTE: Record<RolleKey, Recht[]> = {
  obmann: ALLE,
  kassier: ['finanzen.schreiben', 'planung.schreiben', 'aufgaben.verwalten', 'equipment.schreiben', 'personen.sehen'],
  schriftfuehrer: [
    'mitglieder.verwalten',
    'planung.schreiben',
    'website.veroeffentlichen',
    'aufgaben.verwalten',
    'equipment.schreiben',
    'galerie.freigeben',
    'verein.schreiben',
    'personen.sehen',
  ],
  mitglied: ['equipment.schreiben'],
};

export interface Mitglied {
  email: string;
  name: string;
  rolle: RolleKey;
  funktion: string;
  bereiche: string[];
  /** Startzugang aus INTERN_ADMIN_EMAILS: volle Rechte, solange der Vorstand noch nicht eingetragen ist */
  startzugang: boolean;
  rechte: Set<Recht>;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z]/g, '');

/** „Schriftführerin“, „Obfrau“, „kassierin“ … → Rollenschlüssel */
export function rolleAusText(text: string): RolleKey {
  const t = norm(text);
  if (t.startsWith('obm') || t.startsWith('obfrau') || t.startsWith('obperson') || t === 'vorsitz') return 'obmann';
  if (t.startsWith('kassier') || t.startsWith('kassa')) return 'kassier';
  if (t.startsWith('schriftf')) return 'schriftfuehrer';
  return 'mitglied';
}

export function rechteFuer(rolle: RolleKey, startzugang: boolean): Set<Recht> {
  return new Set(startzugang ? ALLE : RECHTE[rolle]);
}

export const darf = (m: Mitglied | undefined, recht: Recht): boolean => Boolean(m?.rechte.has(recht));

export function istVorstand(m: Mitglied | undefined): boolean {
  return Boolean(m && (m.startzugang || HAUPTROLLEN.includes(m.rolle)));
}

export function rollenTitel(m: Mitglied): string {
  if (m.startzugang && m.rolle === 'mitglied') return 'Startzugang (Admin)';
  return ROLLEN[m.rolle].titel;
}
