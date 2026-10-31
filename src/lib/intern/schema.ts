import type { Recht } from './rollen';

/**
 * Datenmodell des Mitgliederbereichs. Jede Tabelle ist ein Blatt im Google Sheet
 * „NTGL Verein Daten“ (INTERN_SHEET_ID). Erste Zeile = Spaltentitel, erste Spalte = ID.
 * Aus diesen Definitionen entstehen Formulare, Listen, Prüfungen und die Einrichtung des Sheets.
 * Spalten werden über den Titel gefunden, die Reihenfolge im Sheet darf sich also ändern.
 */

export type FeldTyp =
  | 'text'
  | 'lang'
  | 'zahl'
  | 'geld'
  | 'datum'
  | 'zeit'
  | 'auswahl'
  | 'mehrfach'
  | 'janein'
  | 'email'
  | 'link'
  /** Verweis auf eine Veranstaltung über ihr Datum (JJJJ-MM-TT) */
  | 'veranstaltung'
  /** Freitext mit Vorschlägen aus den Mitgliedernamen */
  | 'person';

export interface Feld {
  key: string;
  titel: string;
  typ: FeldTyp;
  optionen?: readonly string[];
  pflicht?: boolean;
  hilfe?: string;
  /** In der Listenansicht zeigen (Standard: ja) */
  liste?: boolean;
  /** Im Formular über die volle Breite */
  breit?: boolean;
  standard?: string;
  /** Vom System gesetzt, im Formular nicht änderbar */
  system?: boolean;
}

export interface Tabelle {
  key: string;
  blatt: string;
  titel: string;
  beschreibung: string;
  felder: Feld[];
  /** Recht zum Anlegen und Bearbeiten */
  recht: Recht;
  /** Wer diesen Arbeitsbereich betreut, darf ebenfalls schreiben */
  bereich?: string;
  /** Feld mit Personennamen: Eingetragene dürfen die Felder in `eigeneFelder` selbst ändern */
  eigene?: { feld: string; felder: string[] };
  /** Kassabuch: keine Änderung, kein Löschen, nur Storno */
  unveraenderbar?: boolean;
  /** Nur lesen, das System schreibt (Journal, Freigaben) */
  nurSystem?: boolean;
  sortierung?: { feld: string; absteigend?: boolean };
}

export const BEREICHE = [
  'Musik & Booking',
  'Visuals & Licht',
  'Marketing & Web',
  'Awareness & Health',
  'Einlass & Kassa',
  'Equipment & Aufbau',
  'Location & Absprachen',
] as const;

export const KATEGORIEN_AUSGABE = [
  'Location',
  'Personal',
  'Musik & DJs',
  'Getränke & Verpflegung',
  'Werbung & Druck',
  'Technik, Licht & Visuals',
  'Goodies & Health',
  'Ausstattung & Anschaffung',
  'Aufwandsersatz',
  'Gebühren & Abgaben',
  'Sonstige Ausgabe',
] as const;

export const KATEGORIEN_EINNAHME = [
  'Einlass',
  'Garderobe',
  'Spende',
  'Mitgliedsbeitrag',
  'Übertrag',
  'Sonstige Einnahme',
] as const;

export const STATUS_VERANSTALTUNG = ['Idee', 'Planung', 'Bestätigt', 'Abgeschlossen', 'Abgesagt'] as const;
export const STATUS_AUFGABE = ['offen', 'in Arbeit', 'erledigt'] as const;
export const STATUS_LINEUP = ['Kandidat', 'Angefragt', 'Zugesagt', 'Abgesagt'] as const;
export const ZUSTAND_EQUIPMENT = ['vorhanden', 'benötigt', 'defekt', 'verliehen'] as const;
export const DIENSTE = ['Kassa', 'Garderobe', 'Security', 'Awareness', 'Bar', 'Technik', 'Aufbau', 'Abbau', 'Fotos'] as const;

/** Systemspalten, die jede Tabelle hat */
export const ID_FELD: Feld = { key: 'id', titel: 'ID', typ: 'text', system: true, liste: false };
export const SYSTEM_FELDER: Feld[] = [
  { key: 'erstellt', titel: 'Erstellt am', typ: 'text', system: true, liste: false },
  { key: 'von', titel: 'Erstellt von', typ: 'text', system: true, liste: false },
  { key: 'geaendert', titel: 'Geändert am', typ: 'text', system: true, liste: false },
];

const t = (def: Tabelle): Tabelle => def;

export const TABELLEN = {
  mitglieder: t({
    key: 'mitglieder',
    blatt: 'Mitglieder',
    titel: 'Mitglieder',
    beschreibung: 'Wer sich anmelden darf, mit Rolle und Arbeitsbereichen. Nur aktive Mitglieder bekommen einen Login-Link.',
    recht: 'mitglieder.verwalten',
    sortierung: { feld: 'name' },
    felder: [
      { key: 'name', titel: 'Name', typ: 'text', pflicht: true },
      { key: 'email', titel: 'E-Mail', typ: 'email', pflicht: true, hilfe: 'An diese Adresse geht der Login-Link.' },
      {
        key: 'rolle',
        titel: 'Rolle',
        typ: 'auswahl',
        optionen: ['Obmann', 'Kassier', 'Schriftführer', 'Mitglied'],
        pflicht: true,
        standard: 'Mitglied',
        hilfe: 'Die drei Hauptrollen des Vorstands haben erweiterte Rechte.',
      },
      { key: 'funktion', titel: 'Funktion', typ: 'text', hilfe: 'z. B. Obmann-Stellvertretung, Rechnungsprüfung' },
      { key: 'bereiche', titel: 'Bereiche', typ: 'mehrfach', optionen: BEREICHE, breit: true },
      { key: 'status', titel: 'Status', typ: 'auswahl', optionen: ['aktiv', 'inaktiv', 'ausgetreten'], pflicht: true, standard: 'aktiv' },
      { key: 'eintritt', titel: 'Eintritt', typ: 'datum', liste: false },
      { key: 'telefon', titel: 'Telefon', typ: 'text', liste: false },
      { key: 'notiz', titel: 'Notiz', typ: 'lang', liste: false, breit: true },
    ],
  }),

  veranstaltungen: t({
    key: 'veranstaltungen',
    blatt: 'Veranstaltungen',
    titel: 'Veranstaltungen',
    beschreibung:
      'Planung und Historie aller Partys. Mit „Auf Website: ja“ fließen Titel, Zeiten, Hinweise, Flyer und Line-up in die nächste Veröffentlichung.',
    recht: 'planung.schreiben',
    sortierung: { feld: 'datum', absteigend: true },
    felder: [
      { key: 'datum', titel: 'Datum', typ: 'datum', pflicht: true },
      { key: 'titel', titel: 'Titel', typ: 'text', pflicht: true },
      { key: 'status', titel: 'Status', typ: 'auswahl', optionen: STATUS_VERANSTALTUNG, pflicht: true, standard: 'Planung' },
      { key: 'location', titel: 'Location', typ: 'text', standard: 'GRNGR (Eule)', liste: false },
      { key: 'adresse', titel: 'Adresse', typ: 'text', standard: 'Josefigasse 47, 8020 Graz', liste: false },
      { key: 'einlass', titel: 'Einlass', typ: 'zeit', standard: '22:00', liste: false },
      { key: 'ende', titel: 'Ende', typ: 'zeit', standard: '06:00', liste: false },
      { key: 'kapazitaet', titel: 'Kapazität', typ: 'zahl', hilfe: 'Höchstzahl Gäste (Bändchen-Kontingent)' },
      { key: 'eintritt', titel: 'Eintritt €', typ: 'geld', hilfe: 'Betrag pro Person an der Tür' },
      { key: 'website', titel: 'Auf Website', typ: 'janein' },
      { key: 'untertitel', titel: 'Untertitel', typ: 'text', liste: false },
      { key: 'preistext', titel: 'Preistext', typ: 'text', liste: false, hilfe: 'So steht es auf der Website, z. B. „10 € Eintritt, nur bar“' },
      {
        key: 'anmeldung',
        titel: 'Anmeldung',
        typ: 'auswahl',
        optionen: ['offen', 'bald', 'geschlossen'],
        standard: 'offen',
        liste: false,
      },
      { key: 'flyer', titel: 'Flyer (Drive-ID)', typ: 'text', liste: false, hilfe: 'Am einfachsten in der Galerie „Als Flyer“ wählen.' },
      { key: 'hinweise', titel: 'Hinweise', typ: 'lang', liste: false, breit: true, hilfe: 'Ein Hinweis pro Zeile, erscheint im Info-Block.' },
      { key: 'beschreibung', titel: 'Beschreibung', typ: 'lang', liste: false, breit: true },
      { key: 'gaeste', titel: 'Gäste (Einlass)', typ: 'zahl', hilfe: 'Nach der Party: gezählte Gäste' },
      { key: 'einnahmen', titel: 'Einnahmen € (Archiv)', typ: 'geld', liste: false, hilfe: 'Nur für Partys vor dem Kassabuch' },
      { key: 'ausgaben', titel: 'Ausgaben € (Archiv)', typ: 'geld', liste: false, hilfe: 'Nur für Partys vor dem Kassabuch' },
      { key: 'gezaehlt', titel: 'Gezählt € (Archiv)', typ: 'geld', liste: false, hilfe: 'Gezählter Überschuss laut Kassensturz' },
      { key: 'notiz', titel: 'Notiz', typ: 'lang', liste: false, breit: true },
    ],
  }),

  lineup: t({
    key: 'lineup',
    blatt: 'Line-up',
    titel: 'Line-up',
    beschreibung: 'DJs und Slots je Party. Nur Zeilen mit „Auf Website: ja“ erscheinen nach der Veröffentlichung auf ntgl.at.',
    recht: 'planung.schreiben',
    bereich: 'Musik & Booking',
    sortierung: { feld: 'start' },
    felder: [
      { key: 'veranstaltung', titel: 'Veranstaltung', typ: 'veranstaltung', pflicht: true },
      { key: 'start', titel: 'Start', typ: 'zeit' },
      { key: 'ende', titel: 'Ende', typ: 'zeit' },
      { key: 'artist', titel: 'Artist', typ: 'text', pflicht: true },
      { key: 'genre', titel: 'Genre', typ: 'text' },
      { key: 'bpm', titel: 'BPM', typ: 'text', liste: false },
      { key: 'status', titel: 'Status', typ: 'auswahl', optionen: STATUS_LINEUP, pflicht: true, standard: 'Kandidat' },
      { key: 'website', titel: 'Auf Website', typ: 'janein' },
      { key: 'linkTitel', titel: 'Link-Titel', typ: 'text', liste: false, hilfe: 'z. B. SoundCloud' },
      { key: 'link', titel: 'Link', typ: 'link', liste: false },
      { key: 'gage', titel: 'Gage €', typ: 'geld', liste: false },
      { key: 'notiz', titel: 'Notiz', typ: 'lang', liste: false, breit: true },
    ],
  }),

  dienstplan: t({
    key: 'dienstplan',
    blatt: 'Dienstplan',
    titel: 'Dienstplan',
    beschreibung: 'Wer an welchem Abend welchen Dienst übernimmt (Kassa, Garderobe, Security, Awareness …).',
    recht: 'planung.schreiben',
    bereich: 'Einlass & Kassa',
    sortierung: { feld: 'von' },
    felder: [
      { key: 'veranstaltung', titel: 'Veranstaltung', typ: 'veranstaltung', pflicht: true },
      { key: 'dienst', titel: 'Dienst', typ: 'auswahl', optionen: DIENSTE, pflicht: true },
      { key: 'name', titel: 'Name', typ: 'person', pflicht: true },
      { key: 'von', titel: 'Von', typ: 'zeit' },
      { key: 'bis', titel: 'Bis', typ: 'zeit' },
      { key: 'entlohnung', titel: 'Entlohnung €', typ: 'geld' },
      { key: 'bestaetigt', titel: 'Bestätigt', typ: 'janein' },
      { key: 'notiz', titel: 'Notiz', typ: 'lang', liste: false, breit: true },
    ],
  }),

  aufgaben: t({
    key: 'aufgaben',
    blatt: 'Aufgaben',
    titel: 'Aufgaben',
    beschreibung: 'Rollenaufgaben und To-dos. Eingetragene Personen können den Status ihrer Aufgaben selbst ändern.',
    recht: 'aufgaben.verwalten',
    eigene: { feld: 'verantwortlich', felder: ['status', 'notiz'] },
    sortierung: { feld: 'faellig' },
    felder: [
      { key: 'aufgabe', titel: 'Aufgabe', typ: 'text', pflicht: true, breit: true },
      {
        key: 'bereich',
        titel: 'Bereich',
        typ: 'auswahl',
        optionen: [...BEREICHE, 'Verein & Recht', 'Finanzen', 'Allgemein'],
        standard: 'Allgemein',
      },
      { key: 'verantwortlich', titel: 'Verantwortlich', typ: 'person', hilfe: 'Mehrere Namen mit Komma trennen' },
      { key: 'faellig', titel: 'Fällig', typ: 'datum' },
      { key: 'status', titel: 'Status', typ: 'auswahl', optionen: STATUS_AUFGABE, pflicht: true, standard: 'offen' },
      { key: 'prioritaet', titel: 'Priorität', typ: 'auswahl', optionen: ['hoch', 'normal', 'niedrig'], standard: 'normal' },
      { key: 'veranstaltung', titel: 'Veranstaltung', typ: 'veranstaltung', liste: false },
      { key: 'quelle', titel: 'Quelle', typ: 'text', liste: false, hilfe: 'Woher die Aufgabe stammt (Dokument, Sitzung)' },
      { key: 'notiz', titel: 'Notiz', typ: 'lang', liste: false, breit: true },
    ],
  }),

  equipment: t({
    key: 'equipment',
    blatt: 'Equipment',
    titel: 'Equipment',
    beschreibung: 'Was wir haben, was fehlt und was zur nächsten Party mitmuss.',
    recht: 'equipment.schreiben',
    sortierung: { feld: 'kategorie' },
    felder: [
      { key: 'gegenstand', titel: 'Gegenstand', typ: 'text', pflicht: true },
      {
        key: 'kategorie',
        titel: 'Kategorie',
        typ: 'auswahl',
        optionen: ['Technik', 'Licht & Visuals', 'Goodies', 'Health & Awareness', 'Kassa & Einlass', 'Deko', 'Sonstiges'],
        standard: 'Sonstiges',
      },
      { key: 'anzahl', titel: 'Anzahl', typ: 'zahl' },
      { key: 'zustand', titel: 'Zustand', typ: 'auswahl', optionen: ZUSTAND_EQUIPMENT, pflicht: true, standard: 'vorhanden' },
      { key: 'eigentum', titel: 'Eigentum', typ: 'auswahl', optionen: ['Verein', 'privat', 'geliehen', 'Location'], liste: false },
      { key: 'bei', titel: 'Bei wem', typ: 'person' },
      { key: 'naechste', titel: 'Für nächste Party', typ: 'janein' },
      { key: 'wert', titel: 'Wert €', typ: 'geld', liste: false },
      { key: 'notiz', titel: 'Notiz', typ: 'lang', liste: false, breit: true },
    ],
  }),

  buchungen: t({
    key: 'buchungen',
    blatt: 'Kassabuch',
    titel: 'Kassabuch',
    beschreibung:
      'Jede Einnahme und Ausgabe mit Beleg. Buchungen werden nicht geändert oder gelöscht; ein Fehler wird storniert und neu gebucht.',
    recht: 'finanzen.schreiben',
    unveraenderbar: true,
    sortierung: { feld: 'datum', absteigend: true },
    felder: [
      { key: 'datum', titel: 'Datum', typ: 'datum', pflicht: true },
      { key: 'art', titel: 'Art', typ: 'auswahl', optionen: ['Einnahme', 'Ausgabe'], pflicht: true },
      { key: 'betrag', titel: 'Betrag €', typ: 'geld', pflicht: true, hilfe: 'Immer positiv, die Art bestimmt das Vorzeichen' },
      {
        key: 'kategorie',
        titel: 'Kategorie',
        typ: 'auswahl',
        optionen: [...KATEGORIEN_EINNAHME, ...KATEGORIEN_AUSGABE],
        pflicht: true,
      },
      { key: 'konto', titel: 'Konto', typ: 'auswahl', optionen: ['Kassa', 'Bank'], pflicht: true, standard: 'Kassa' },
      { key: 'veranstaltung', titel: 'Veranstaltung', typ: 'veranstaltung' },
      { key: 'beschreibung', titel: 'Beschreibung', typ: 'text', pflicht: true, breit: true },
      { key: 'mitglied', titel: 'Mitglied', typ: 'person', liste: false, hilfe: 'Bei Mitgliedsbeiträgen: wer gezahlt hat' },
      { key: 'beleg', titel: 'Beleg', typ: 'link', liste: false, hilfe: 'Link zum Beleg in Drive' },
      { key: 'storno', titel: 'Storno von', typ: 'text', system: true, liste: false },
    ],
  }),

  budget: t({
    key: 'budget',
    blatt: 'Budget',
    titel: 'Budget',
    beschreibung: 'Geplante Einnahmen und Ausgaben je Party und Kategorie. Das Ist kommt aus dem Kassabuch.',
    recht: 'finanzen.schreiben',
    sortierung: { feld: 'kategorie' },
    felder: [
      { key: 'veranstaltung', titel: 'Veranstaltung', typ: 'veranstaltung', pflicht: true },
      { key: 'art', titel: 'Art', typ: 'auswahl', optionen: ['Ausgabe', 'Einnahme'], pflicht: true, standard: 'Ausgabe' },
      {
        key: 'kategorie',
        titel: 'Kategorie',
        typ: 'auswahl',
        optionen: [...KATEGORIEN_AUSGABE, ...KATEGORIEN_EINNAHME],
        pflicht: true,
      },
      { key: 'plan', titel: 'Plan €', typ: 'geld' },
      { key: 'archiv', titel: 'Ist € (Archiv)', typ: 'geld', hilfe: 'Nur für Partys vor dem Kassabuch, aus den alten Kostenaufstellungen' },
      { key: 'notiz', titel: 'Notiz', typ: 'text', breit: true },
    ],
  }),

  kassensturz: t({
    key: 'kassensturz',
    blatt: 'Abendkassa',
    titel: 'Abendkassa',
    beschreibung: 'Kassensturz am Abend, immer zu zweit: Bändchen zählen, Restumsatz ins beschriftete Kuvert, Wechselgeld bleibt in der Kassa.',
    recht: 'finanzen.schreiben',
    bereich: 'Einlass & Kassa',
    sortierung: { feld: 'uhrzeit' },
    felder: [
      { key: 'veranstaltung', titel: 'Veranstaltung', typ: 'veranstaltung', pflicht: true },
      { key: 'uhrzeit', titel: 'Uhrzeit', typ: 'zeit', pflicht: true },
      { key: 'rot', titel: 'Bändchen rot', typ: 'zahl', hilfe: 'Ausgegebene Eintrittsbändchen seit Beginn' },
      { key: 'blau', titel: 'Bändchen blau', typ: 'zahl', hilfe: 'Ausgegebene Halbpreisbändchen seit Beginn' },
      { key: 'gratis', titel: 'Gratis (Bruchliste)', typ: 'zahl' },
      { key: 'restumsatz', titel: 'Restumsatz €', typ: 'geld', pflicht: true },
      { key: 'wechselgeld', titel: 'Wechselgeld €', typ: 'geld', standard: '100' },
      { key: 'gezaehlt', titel: 'Gezählt von', typ: 'person', pflicht: true },
      { key: 'zweite', titel: 'Zweite Person', typ: 'person', pflicht: true },
      { key: 'notiz', titel: 'Notiz', typ: 'lang', liste: false, breit: true },
    ],
  }),

  beschluesse: t({
    key: 'beschluesse',
    blatt: 'Beschlüsse',
    titel: 'Beschlüsse',
    beschreibung: 'Entscheid-Register: was beschlossen wurde, von wem und warum.',
    recht: 'verein.schreiben',
    sortierung: { feld: 'datum', absteigend: true },
    felder: [
      { key: 'datum', titel: 'Datum', typ: 'datum', pflicht: true },
      { key: 'gremium', titel: 'Gremium', typ: 'auswahl', optionen: ['Team', 'Vorstand', 'Mitgliederversammlung'], standard: 'Team' },
      { key: 'thema', titel: 'Thema', typ: 'text', pflicht: true },
      { key: 'beschluss', titel: 'Beschluss', typ: 'lang', pflicht: true, breit: true },
      { key: 'begruendung', titel: 'Begründung', typ: 'lang', liste: false, breit: true },
      { key: 'abstimmung', titel: 'Abstimmung', typ: 'text', hilfe: 'z. B. 4:0' },
      { key: 'protokoll', titel: 'Protokoll', typ: 'link', liste: false },
      { key: 'status', titel: 'Status', typ: 'auswahl', optionen: ['gültig', 'aufgehoben'], standard: 'gültig' },
    ],
  }),

  verein: t({
    key: 'verein',
    blatt: 'Verein',
    titel: 'Vereinsgründung & Fristen',
    beschreibung: 'Schritte der Gründung und wiederkehrende Pflichten nach dem Vereinsgesetz.',
    recht: 'verein.schreiben',
    sortierung: { feld: 'nr' },
    felder: [
      { key: 'nr', titel: 'Nr', typ: 'zahl', liste: false },
      { key: 'schritt', titel: 'Schritt', typ: 'text', pflicht: true, breit: true },
      {
        key: 'phase',
        titel: 'Phase',
        typ: 'auswahl',
        optionen: ['Vorbereitung', 'Gründung', 'Anzeige', 'Nach ZVR', 'Laufend'],
        standard: 'Vorbereitung',
      },
      { key: 'status', titel: 'Status', typ: 'auswahl', optionen: STATUS_AUFGABE, pflicht: true, standard: 'offen' },
      { key: 'faellig', titel: 'Fällig', typ: 'datum' },
      { key: 'verantwortlich', titel: 'Verantwortlich', typ: 'person' },
      { key: 'link', titel: 'Link', typ: 'link', liste: false },
      { key: 'grundlage', titel: 'Grundlage', typ: 'text', liste: false, hilfe: 'Paragraf oder Quelle' },
      { key: 'notiz', titel: 'Notiz', typ: 'lang', liste: false, breit: true },
    ],
  }),

  galerie: t({
    key: 'galerie',
    blatt: 'Galerie',
    titel: 'Galerie-Freigaben',
    beschreibung: 'Welche Fotos aus dem Drive-Ordner auf ntgl.at gezeigt werden dürfen.',
    recht: 'galerie.freigeben',
    bereich: 'Marketing & Web',
    felder: [
      { key: 'drive', titel: 'Drive-ID', typ: 'text', pflicht: true },
      { key: 'titel', titel: 'Titel', typ: 'text' },
      { key: 'veranstaltung', titel: 'Veranstaltung', typ: 'veranstaltung' },
      { key: 'website', titel: 'Auf Website', typ: 'janein' },
      { key: 'credit', titel: 'Foto von', typ: 'text' },
    ],
  }),

  einstellungen: t({
    key: 'einstellungen',
    blatt: 'Einstellungen',
    titel: 'Einstellungen',
    beschreibung: 'Werte, die das System nutzt (Beitrag, Kapazität, Ordner).',
    recht: 'einstellungen.schreiben',
    sortierung: { feld: 'schluessel' },
    felder: [
      { key: 'schluessel', titel: 'Schlüssel', typ: 'text', pflicht: true },
      { key: 'wert', titel: 'Wert', typ: 'text', breit: true },
      { key: 'beschreibung', titel: 'Beschreibung', typ: 'text', breit: true },
    ],
  }),

  journal: t({
    key: 'journal',
    blatt: 'Journal',
    titel: 'Journal',
    beschreibung: 'Jede Änderung im Mitgliederbereich, mit Zeit und Person. Wird nur vom System geschrieben.',
    recht: 'einstellungen.schreiben',
    nurSystem: true,
    sortierung: { feld: 'zeit', absteigend: true },
    felder: [
      { key: 'zeit', titel: 'Zeit', typ: 'text' },
      { key: 'wer', titel: 'Wer', typ: 'text' },
      { key: 'tabelle', titel: 'Tabelle', typ: 'text' },
      { key: 'aktion', titel: 'Aktion', typ: 'text' },
      { key: 'datensatz', titel: 'Datensatz', typ: 'text' },
      { key: 'details', titel: 'Details', typ: 'lang', breit: true },
    ],
  }),

  freigaben: t({
    key: 'freigaben',
    blatt: 'Freigaben',
    titel: 'Website-Freigaben',
    beschreibung: 'Jede Veröffentlichung als Version. Die Website baut immer aus der jüngsten Freigabe.',
    recht: 'website.veroeffentlichen',
    nurSystem: true,
    sortierung: { feld: 'zeit', absteigend: true },
    felder: [
      { key: 'zeit', titel: 'Zeit', typ: 'text' },
      { key: 'wer', titel: 'Wer', typ: 'text' },
      { key: 'zusammenfassung', titel: 'Zusammenfassung', typ: 'text', breit: true },
      { key: 'inhalt', titel: 'Inhalt (JSON)', typ: 'lang', liste: false },
    ],
  }),
} satisfies Record<string, Tabelle>;

export type TabellenKey = keyof typeof TABELLEN;

export const tabelle = (key: string): Tabelle | undefined => (TABELLEN as Record<string, Tabelle>)[key];

/** Alle Spalten einer Tabelle in Sheet-Reihenfolge: ID, Fachfelder, Systemfelder */
export function spalten(def: Tabelle): Feld[] {
  return [ID_FELD, ...def.felder, ...(def.nurSystem ? [] : SYSTEM_FELDER)];
}

/** Bekannte Einstellungen mit Bedeutung (werden bei der Einrichtung angelegt) */
export const EINSTELLUNGEN: Array<{ schluessel: string; wert: string; beschreibung: string }> = [
  { schluessel: 'vereinsname', wert: 'NTGL (Arbeitstitel)', beschreibung: 'Name des Vereins laut Statuten, sobald beschlossen' },
  { schluessel: 'vereinsstatus', wert: 'Gründung in Vorbereitung', beschreibung: 'Gründung in Vorbereitung · angezeigt · ZVR erteilt' },
  { schluessel: 'zvr', wert: '', beschreibung: 'ZVR-Zahl nach der Eintragung' },
  { schluessel: 'mitgliedsbeitrag', wert: '', beschreibung: 'Jahresbeitrag in Euro; leer = noch nicht beschlossen' },
  { schluessel: 'kapazitaet', wert: '200', beschreibung: 'Standard-Kapazität je Party (Bändchen-Kontingent laut Eventplan)' },
  { schluessel: 'wechselgeld', wert: '100', beschreibung: 'Wechselgeld in der Abendkassa in Euro (laut Eventplan)' },
  { schluessel: 'kassensturz', wert: '01:00, 03:00', beschreibung: 'Feste Zeiten für den Kassensturz (laut Eventplan)' },
  { schluessel: 'galerie_ordner', wert: '', beschreibung: 'Drive-Ordner-ID(s) der Galerie, mit Komma getrennt' },
  { schluessel: 'verein_ordner', wert: '', beschreibung: 'Link zum Drive-Ordner mit den Vereinsunterlagen' },
  { schluessel: 'iban', wert: '', beschreibung: 'IBAN des Vereinskontos, sobald eröffnet' },
];
