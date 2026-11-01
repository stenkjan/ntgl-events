import type { TabellenKey } from './schema';

/** Seitenmenü des Mitgliederbereichs. Nur unter /intern sichtbar. */

export interface MenuePunkt {
  titel: string;
  href: string;
}

export interface MenueGruppe {
  titel: string;
  href?: string;
  icon: string;
  punkte: MenuePunkt[];
}

export const MENUE: MenueGruppe[] = [
  { titel: 'Übersicht', href: '/intern', icon: 'M3 12l9-8 9 8M5 10v10h14V10', punkte: [] },
  {
    titel: 'Daten',
    icon: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zm0 0v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
    punkte: [
      { titel: 'Anmeldungen', href: '/intern/daten/anmeldungen' },
      { titel: 'Mitglieder', href: '/intern/daten/mitglieder' },
      { titel: 'Historie', href: '/intern/daten/historie' },
      { titel: 'Journal', href: '/intern/daten/journal' },
    ],
  },
  {
    titel: 'Finanzen',
    icon: 'M3 7h18v12H3zM3 11h18M7 15h3',
    punkte: [
      { titel: 'Kassabuch', href: '/intern/finanzen/kassabuch' },
      { titel: 'Budget', href: '/intern/finanzen/budget' },
      { titel: 'Beiträge', href: '/intern/finanzen/beitraege' },
      { titel: 'Abendkassa', href: '/intern/finanzen/abendkassa' },
    ],
  },
  { titel: 'Galerie', href: '/intern/galerie', icon: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9h.01', punkte: [] },
  {
    titel: 'Verwaltung',
    icon: 'M4 6h16M4 12h16M4 18h10',
    punkte: [
      { titel: 'Planung', href: '/intern/verwaltung/planung' },
      { titel: 'Line-up', href: '/intern/verwaltung/lineup' },
      { titel: 'Dienstplan', href: '/intern/verwaltung/dienstplan' },
      { titel: 'Rollen & Aufgaben', href: '/intern/verwaltung/aufgaben' },
      { titel: 'Equipment', href: '/intern/verwaltung/equipment' },
      { titel: 'Beschlüsse', href: '/intern/verwaltung/beschluesse' },
      { titel: 'Verein', href: '/intern/verwaltung/verein' },
      { titel: 'Website', href: '/intern/verwaltung/website' },
      { titel: 'Einstellungen', href: '/intern/verwaltung/einstellungen' },
    ],
  },
];

/** Module, die nur aus einer Tabelle bestehen (generische Seite [bereich]/[modul]) */
export const GENERISCHE_MODULE: Record<string, { tabelle: TabellenKey; titel: string }> = {
  'daten/mitglieder': { tabelle: 'mitglieder', titel: 'Mitglieder' },
  'daten/journal': { tabelle: 'journal', titel: 'Journal' },
  'finanzen/kassabuch': { tabelle: 'buchungen', titel: 'Kassabuch' },
  'finanzen/abendkassa': { tabelle: 'kassensturz', titel: 'Abendkassa' },
  'verwaltung/planung': { tabelle: 'veranstaltungen', titel: 'Planung' },
  'verwaltung/lineup': { tabelle: 'lineup', titel: 'Line-up' },
  'verwaltung/dienstplan': { tabelle: 'dienstplan', titel: 'Dienstplan' },
  'verwaltung/equipment': { tabelle: 'equipment', titel: 'Equipment' },
  'verwaltung/beschluesse': { tabelle: 'beschluesse', titel: 'Beschlüsse' },
  'verwaltung/verein': { tabelle: 'verein', titel: 'Verein' },
  'verwaltung/einstellungen': { tabelle: 'einstellungen', titel: 'Einstellungen' },
};

export function aktiv(pfad: string, href: string): boolean {
  if (href === '/intern') return pfad === '/intern' || pfad === '/intern/';
  return pfad === href || pfad.startsWith(`${href}/`);
}
