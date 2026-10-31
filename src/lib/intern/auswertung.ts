import { env } from '../env';
import { freigabeLesen } from '../website';
import {
  anmeldungenFuer,
  betrifft,
  budgetFuer,
  historie,
  kapazitaet,
  kontostand,
  lineupFuer,
  naechsteVeranstaltung,
  vergangene,
  type Lage,
} from './daten';
import { datumKurz, euro, inTagen, plural, prozent, tageBis } from './format';
import { HAUPTROLLEN, ROLLEN, rolleAusText } from './rollen';
import type { Zeile } from './sheets';

/**
 * Auswertung: Kennzahlen, Countdown je Party und Vorschläge.
 * Jeder Vorschlag nennt seine Regel und den Beleg aus den Daten; entscheiden tut ein Mensch.
 * Trendaussagen erst ab fünf vergleichbaren Partys.
 */

export type Stufe = 'kritisch' | 'wichtig' | 'hinweis';

export interface Vorschlag {
  stufe: Stufe;
  titel: string;
  begruendung: string;
  link: string;
  linkText: string;
}

export interface Kennzahlen {
  naechste?: {
    v: Zeile;
    tage: number;
    anmeldungen: number;
    newsletter: number;
    kapazitaet: number | null;
    auslastung: number | null;
    lineupZugesagt: number;
    lineupGesamt: number;
    aufWebsite: boolean;
    planAusgaben: number;
    istAusgaben: number;
    planEinnahmen: number;
    breakEvenGaeste: number | null;
  };
  konto: { kassa: number; bank: number; gesamt: number };
  aufgaben: { offen: number; ueberfaellig: number; ohneVerantwortung: number };
  team: Array<{ name: string; offen: number }>;
  equipment: { gesamt: number; fehlt: number; fuerNaechste: number; fehltFuerNaechste: Zeile[] };
  verein: { erledigt: number; gesamt: number; naechster?: Zeile };
  historieN: number;
}

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const offen = (z: Zeile) => s(z.status) !== 'erledigt';

export function kennzahlen(lage: Lage, jetzt = new Date()): Kennzahlen {
  const v = naechsteVeranstaltung(lage, jetzt);
  const heute = jetzt.toISOString().slice(0, 10);

  let naechste: Kennzahlen['naechste'];
  if (v) {
    const datum = s(v.datum);
    const anm = anmeldungenFuer(lage, datum);
    const kap = kapazitaet(lage, v);
    const lineup = lineupFuer(lage, datum).filter((l) => s(l.status) !== 'Abgesagt');
    const budget = budgetFuer(lage, datum);
    const planAusgaben = budget.filter((b) => b.art === 'Ausgabe').reduce((a, b) => a + (b.plan ?? 0), 0);
    const istAusgaben = budget.filter((b) => b.art === 'Ausgabe').reduce((a, b) => a + b.ist, 0);
    const planEinnahmen = budget.filter((b) => b.art === 'Einnahme').reduce((a, b) => a + (b.plan ?? 0), 0);
    const eintritt = n(v.eintritt);
    naechste = {
      v,
      tage: tageBis(datum, jetzt),
      anmeldungen: anm.length,
      newsletter: anm.filter((a) => a.newsletter).length,
      kapazitaet: kap,
      auslastung: kap ? anm.length / kap : null,
      lineupZugesagt: lineup.filter((l) => s(l.status) === 'Zugesagt').length,
      lineupGesamt: lineup.length,
      aufWebsite: v.website === true,
      planAusgaben,
      istAusgaben,
      planEinnahmen,
      breakEvenGaeste: eintritt > 0 && planAusgaben > 0 ? Math.ceil(planAusgaben / eintritt) : null,
    };
  }

  const offeneAufgaben = lage.t.aufgaben.filter(offen);
  const teamMap = new Map<string, number>();
  for (const m of lage.t.mitglieder.filter((m) => s(m.status || 'aktiv') === 'aktiv')) teamMap.set(s(m.name), 0);
  for (const a of offeneAufgaben) {
    for (const name of teamMap.keys()) if (betrifft(a.verantwortlich, name)) teamMap.set(name, (teamMap.get(name) ?? 0) + 1);
  }

  const fuerNaechste = lage.t.equipment.filter((e) => e.naechste === true);
  const fehlt = (e: Zeile) => ['benötigt', 'defekt'].includes(s(e.zustand));
  const schritte = [...lage.t.verein].sort((a, b) => n(a.nr) - n(b.nr));

  return {
    naechste,
    konto: kontostand(lage),
    aufgaben: {
      offen: offeneAufgaben.length,
      ueberfaellig: offeneAufgaben.filter((a) => s(a.faellig) && s(a.faellig) < heute).length,
      ohneVerantwortung: offeneAufgaben.filter((a) => !s(a.verantwortlich)).length,
    },
    team: [...teamMap.entries()].map(([name, o]) => ({ name, offen: o })).sort((a, b) => b.offen - a.offen),
    equipment: {
      gesamt: lage.t.equipment.length,
      fehlt: lage.t.equipment.filter(fehlt).length,
      fuerNaechste: fuerNaechste.length,
      fehltFuerNaechste: fuerNaechste.filter(fehlt),
    },
    verein: {
      erledigt: schritte.filter((z) => s(z.status) === 'erledigt').length,
      gesamt: schritte.length,
      naechster: schritte.find(offen),
    },
    historieN: historie(lage, jetzt).length,
  };
}

/* ---------- Countdown je Party ---------- */

export interface Punkt {
  titel: string;
  /** Tage relativ zur Party, an denen der Punkt erledigt sein sollte (negativ = vorher) */
  tag: number;
  /** true erledigt · false offen · null von Hand abhaken (Aufgabe anlegen) */
  erledigt: boolean | null;
  beleg: string;
  link: string;
}

/**
 * Pflichtschritte je Party aus der Recherche Veranstaltungsrecht (30.10.2026) stehen als Aufgaben mit
 * festem Präfix im Blatt „Aufgaben“ (z. B. „Behörde: …“). Der Countdown fasst sie je Präfix zusammen.
 */
const PFLICHTSCHRITTE: Array<{ praefix: string; titel: string; tag: number }> = [
  { praefix: 'Lokal:', titel: 'Mit dem Lokal geklärt: Betriebsart, Veranstalterrolle, Höchstzahl', tag: -49 },
  { praefix: 'Sicherheit:', titel: 'Sicherheit: Versicherung, Ordner, Awareness, Gehörschutz, Verbandkasten', tag: -28 },
  { praefix: 'Behörde:', titel: 'Behördenweg (Anzeige bis 6 Wochen bzw. Meldung bis 2 Wochen vorher)', tag: -14 },
  { praefix: 'Aushänge:', titel: 'Aushänge und Raucherbereich vorbereitet', tag: -7 },
  { praefix: 'AKM:', titel: 'AKM angemeldet (spätestens 3 Tage vorher)', tag: -3 },
  { praefix: 'Team:', titel: 'Team-Belehrung mit Unterschriften', tag: -1 },
];

function pflichtStand(lage: Lage, datum: string, praefix: string): { erledigt: boolean | null; beleg: string } {
  const liste = lage.t.aufgaben.filter((a) => s(a.veranstaltung) === datum && s(a.aufgabe).startsWith(praefix));
  if (liste.length === 0) return { erledigt: null, beleg: `keine Aufgabe „${praefix} …“ angelegt` };
  const offen = liste.filter((a) => s(a.status) !== 'erledigt');
  return {
    erledigt: offen.length === 0,
    beleg: offen.length ? `${offen.length} von ${liste.length} Aufgaben offen` : `${plural(liste.length, 'Aufgabe', 'Aufgaben')} erledigt`,
  };
}

export function countdown(lage: Lage, v: Zeile, jetzt = new Date()): Punkt[] {
  const datum = s(v.datum);
  const pflicht: Punkt[] = PFLICHTSCHRITTE.map((p) => ({
    titel: p.titel,
    tag: p.tag,
    ...pflichtStand(lage, datum, p.praefix),
    link: `/intern/verwaltung/aufgaben?filter=alle&q=${encodeURIComponent(p.praefix)}`,
  }));
  const lineup = lineupFuer(lage, datum).filter((l) => s(l.status) !== 'Abgesagt');
  const dienste = new Set(lage.t.dienstplan.filter((d) => s(d.veranstaltung) === datum).map((d) => s(d.dienst)));
  const pflichtDienste = ['Kassa', 'Garderobe', 'Security', 'Awareness'];
  const fehlendeDienste = pflichtDienste.filter((d) => !dienste.has(d));
  const budget = budgetFuer(lage, datum).filter((b) => b.plan !== null);
  const freigabe = juengsteFreigabe(lage);
  const veroeffentlicht = Boolean(freigabe?.veranstaltungen?.some((e) => e.datum === datum));
  const equipmentFehlt = lage.t.equipment.filter((e) => e.naechste === true && ['benötigt', 'defekt'].includes(s(e.zustand)));
  const kassensturz = lage.t.kassensturz.filter((k) => s(k.veranstaltung) === datum);
  const buchungen = lage.t.buchungen.filter((b) => s(b.veranstaltung) === datum);
  const anm = anmeldungenFuer(lage, datum);
  const zuLoeschen = anm.filter((a) => !a.newsletter).length;
  const vorbei = tageBis(datum, jetzt) < 0;

  const eigene: Punkt[] = [
    {
      titel: 'Termin mit der Location fix',
      tag: -56,
      erledigt: ['Bestätigt', 'Abgeschlossen'].includes(s(v.status)),
      beleg: `Status „${s(v.status) || '–'}“`,
      link: '/intern/verwaltung/planung',
    },
    {
      titel: 'Line-up zugesagt',
      tag: -42,
      erledigt: lineup.some((l) => s(l.status) === 'Zugesagt'),
      beleg: `${lineup.filter((l) => s(l.status) === 'Zugesagt').length} von ${lineup.length} Slots zugesagt`,
      link: `/intern/verwaltung/lineup?v=${datum}`,
    },
    {
      titel: 'Budget geplant',
      tag: -35,
      erledigt: budget.length > 0,
      beleg: budget.length ? `${budget.length} Kategorien mit Plan` : 'noch kein Plan-Wert',
      link: `/intern/finanzen/budget?v=${datum}`,
    },
    {
      titel: 'Flyer gewählt',
      tag: -28,
      erledigt: Boolean(s(v.flyer)),
      beleg: s(v.flyer) ? 'Flyer aus der Galerie gesetzt' : 'kein Flyer gesetzt',
      link: '/intern/galerie',
    },
    {
      titel: 'Party auf der Website veröffentlicht',
      tag: -28,
      erledigt: veroeffentlicht,
      beleg: veroeffentlicht ? 'in der jüngsten Freigabe enthalten' : 'nicht in der jüngsten Freigabe',
      link: '/intern/verwaltung/website',
    },
    {
      titel: 'Dienstplan besetzt (Kassa, Garderobe, Security, Awareness)',
      tag: -7,
      erledigt: fehlendeDienste.length === 0,
      beleg: fehlendeDienste.length ? `offen: ${fehlendeDienste.join(', ')}` : 'alle vier Dienste eingetragen',
      link: `/intern/verwaltung/dienstplan?v=${datum}`,
    },
    {
      titel: 'Equipment-Check',
      tag: -3,
      erledigt: lage.t.equipment.some((e) => e.naechste === true) ? equipmentFehlt.length === 0 : null,
      beleg: equipmentFehlt.length ? `${plural(equipmentFehlt.length, 'Ding fehlt', 'Dinge fehlen')}` : 'Packliste über „Für nächste Party“',
      link: '/intern/verwaltung/equipment',
    },
    {
      titel: 'Kassensturz zu zweit eingetragen',
      tag: 0,
      erledigt: vorbei ? kassensturz.length > 0 : null,
      beleg: kassensturz.length ? plural(kassensturz.length, 'Eintrag', 'Einträge') : 'am Abend, z. B. 01:00 und 03:00',
      link: `/intern/finanzen/abendkassa?v=${datum}`,
    },
    {
      titel: 'Gäste gezählt eingetragen',
      tag: 2,
      erledigt: vorbei ? typeof v.gaeste === 'number' : null,
      beleg: typeof v.gaeste === 'number' ? `${v.gaeste} Gäste` : 'Feld „Gäste (Einlass)“',
      link: '/intern/verwaltung/planung',
    },
    {
      titel: 'Abrechnung im Kassabuch',
      tag: 5,
      erledigt: vorbei ? buchungen.length > 0 : null,
      beleg: buchungen.length ? plural(buchungen.length, 'Buchung', 'Buchungen') : 'Einnahmen und Ausgaben mit Beleg',
      link: `/intern/finanzen/kassabuch?v=${datum}`,
    },
    {
      titel: 'Gästeliste ohne Newsletter gelöscht (30 Tage)',
      tag: 30,
      erledigt: vorbei ? zuLoeschen === 0 : null,
      beleg: zuLoeschen ? `${zuLoeschen} Anmeldungen ohne Newsletter` : 'nichts zu löschen',
      link: `/intern/daten/anmeldungen?v=${datum}`,
    },
  ];
  return [...eigene, ...pflicht].sort((a, b) => a.tag - b.tag);
}

/* ---------- Vorschläge ---------- */

export const juengsteFreigabe = (lage: Lage) => freigabeLesen(lage.t.freigaben);

export function vorschlaege(lage: Lage, k: Kennzahlen, jetzt = new Date()): Vorschlag[] {
  const liste: Vorschlag[] = [];
  const add = (v: Vorschlag) => liste.push(v);
  const heute = jetzt.toISOString().slice(0, 10);

  // Vorstand: die drei Hauptrollen
  const besetzt = new Set(lage.t.mitglieder.filter((m) => s(m.status || 'aktiv') === 'aktiv').map((m) => rolleAusText(s(m.rolle))));
  const fehlend = HAUPTROLLEN.filter((r) => !besetzt.has(r));
  if (fehlend.length) {
    add({
      stufe: 'wichtig',
      titel: `Hauptrollen besetzen: ${fehlend.map((r) => ROLLEN[r].titel).join(', ')}`,
      begruendung:
        'Ein Verein braucht ein Leitungsorgan aus mindestens zwei Personen; mit drei Funktionen (Leitung, Finanzen, Organisation) ist jede Aufgabe einer Person zugeordnet. Bis zur Wahl sind die Rollen vorläufig.',
      link: '/intern/daten/mitglieder',
      linkText: 'Mitglieder',
    });
  }
  const pruefer = lage.t.mitglieder.filter((m) => /rechnungspr/i.test(s(m.funktion))).length;
  if (pruefer < 2) {
    add({
      stufe: 'hinweis',
      titel: `Zwei Rechnungsprüfer:innen festlegen (eingetragen: ${pruefer})`,
      begruendung: 'Das Vereinsgesetz verlangt zwei unabhängige Rechnungsprüfer:innen, die nicht im Vorstand sitzen.',
      link: '/intern/daten/mitglieder',
      linkText: 'Mitglieder',
    });
  }

  const nx = k.naechste;
  if (!nx) {
    add({
      stufe: 'hinweis',
      titel: 'Keine Party geplant',
      begruendung: 'In „Veranstaltungen“ steht keine kommende Party mit Status Planung oder Bestätigt.',
      link: '/intern/verwaltung/planung?neu=1',
      linkText: 'Party anlegen',
    });
  } else {
    const datum = s(nx.v.datum);
    const wann = inTagen(nx.tage);
    if (nx.lineupZugesagt === 0) {
      add({
        stufe: nx.tage < 21 ? 'kritisch' : nx.tage < 42 ? 'wichtig' : 'hinweis',
        titel: 'Line-up bestätigen',
        begruendung: `Die Party ist ${wann}; ${nx.lineupGesamt ? `${nx.lineupGesamt} Slots geplant, keiner zugesagt` : 'noch kein Slot eingetragen'}. Ohne Zusage zeigt die Website „Line-up folgt“.`,
        link: `/intern/verwaltung/lineup?v=${datum}`,
        linkText: 'Line-up',
      });
    }
    const zugesagtNichtOnline = lage.t.lineup.filter(
      (l) => s(l.veranstaltung) === datum && s(l.status) === 'Zugesagt' && l.website !== true,
    ).length;
    if (zugesagtNichtOnline) {
      add({
        stufe: 'hinweis',
        titel: `${plural(zugesagtNichtOnline, 'zugesagter Act fehlt', 'zugesagte Acts fehlen')} auf der Website`,
        begruendung: 'Zusagen sind eingetragen, aber nicht als „Auf Website“ markiert.',
        link: `/intern/verwaltung/lineup?v=${datum}`,
        linkText: 'Line-up',
      });
    }
    if (!s(nx.v.flyer)) {
      add({
        stufe: nx.tage < 28 ? 'wichtig' : 'hinweis',
        titel: 'Flyer für die nächste Party wählen',
        begruendung: `Für die Party ${wann} ist kein Flyer gesetzt; die Website zeigt sonst den Platzhalter.`,
        link: '/intern/galerie',
        linkText: 'Galerie',
      });
    }
    if (nx.planAusgaben === 0) {
      add({
        stufe: nx.tage < 35 ? 'wichtig' : 'hinweis',
        titel: 'Budget für die nächste Party planen',
        begruendung: 'Noch kein Plan-Wert. Das Budget-Modul schlägt Werte aus den Kostenaufstellungen früherer Partys vor.',
        link: `/intern/finanzen/budget?v=${datum}`,
        linkText: 'Budget',
      });
    } else if (nx.breakEvenGaeste !== null) {
      const gaeste = historie(lage, jetzt)
        .map((h) => h.gaeste)
        .filter((g): g is number => g !== null);
      const schnitt = gaeste.length ? Math.round(gaeste.reduce((a, b) => a + b, 0) / gaeste.length) : null;
      add({
        stufe: schnitt !== null && nx.breakEvenGaeste > schnitt * 0.9 ? 'wichtig' : 'hinweis',
        titel: `Kostendeckung ab ${nx.breakEvenGaeste} zahlenden Gästen`,
        begruendung: `Geplante Ausgaben ${euro(nx.planAusgaben, true)} geteilt durch ${euro(n(nx.v.eintritt))} Eintritt. Aktuell ${nx.anmeldungen} Anmeldungen${nx.kapazitaet ? ` bei ${nx.kapazitaet} Plätzen` : ''}.${schnitt !== null ? ` Frühere Partys: Ø ${schnitt} Gäste (${plural(gaeste.length, 'Party', 'Partys')}, Einzelwerte, kein Trend).` : ''}`,
        link: `/intern/finanzen/budget?v=${datum}`,
        linkText: 'Budget',
      });
    }
    // Wissen aus der Recherche (Steuern, 30.10.2026): Eine Zahlung als Einlassbedingung ist Entgelt, keine Spende.
    if (/spende/i.test(`${s(nx.v.preistext)} ${s(nx.v.hinweise)}`)) {
      add({
        stufe: 'hinweis',
        titel: '„Musikspende“ ist steuerlich Eintritt',
        begruendung:
          'Wer ohne Zahlung nicht hineinkommt, zahlt ein Entgelt, keine Spende (§ 4 UStG, § 21 BAO; Recherche im Ordner Verein). Vorschlag: „Eintritt“ oder „Unkostenbeitrag“ in Preistext und Hinweisen, Entscheidung im Team.',
        link: '/intern/verwaltung/planung',
        linkText: 'Planung',
      });
    }
    if (nx.istAusgaben > 0 && nx.planAusgaben > 0 && nx.istAusgaben > nx.planAusgaben) {
      add({
        stufe: 'wichtig',
        titel: `Budget überschritten um ${euro(nx.istAusgaben - nx.planAusgaben, true)}`,
        begruendung: `Ist ${euro(nx.istAusgaben, true)} gegen Plan ${euro(nx.planAusgaben, true)} (${prozent(nx.istAusgaben / nx.planAusgaben)}).`,
        link: `/intern/finanzen/budget?v=${datum}`,
        linkText: 'Budget',
      });
    }
    if (nx.auslastung !== null && nx.auslastung >= 0.9) {
      add({
        stufe: 'wichtig',
        titel: `Fast voll: ${prozent(nx.auslastung)} der Plätze angemeldet`,
        begruendung: `${nx.anmeldungen} Anmeldungen bei ${nx.kapazitaet} Plätzen. Anmeldung schließen oder Kapazität mit der Location klären.`,
        link: '/intern/verwaltung/planung',
        linkText: 'Planung',
      });
    }
    if (!nx.aufWebsite) {
      add({
        stufe: nx.tage < 28 ? 'wichtig' : 'hinweis',
        titel: 'Party ist nicht für die Website markiert',
        begruendung: '„Auf Website“ steht auf nein; Änderungen an Titel, Hinweisen und Line-up gehen so nicht online.',
        link: '/intern/verwaltung/planung',
        linkText: 'Planung',
      });
    }
    // Countdown-Punkte, deren Tag erreicht ist (Line-up, Budget, Flyer haben oben eigene Vorschläge)
    const schonDa = ['Line-up zugesagt', 'Budget geplant', 'Flyer gewählt'];
    const punkte = countdown(lage, nx.v, jetzt).filter(
      (p) => p.erledigt === false && p.tag <= 0 && nx.tage <= -p.tag && !schonDa.includes(p.titel),
    );
    for (const p of punkte) {
      add({
        stufe: nx.tage < 7 ? 'kritisch' : 'wichtig',
        titel: p.titel,
        begruendung: `Laut Countdown ${Math.abs(p.tag)} Tage vor der Party fällig; ${p.beleg}.`,
        link: p.link,
        linkText: 'Öffnen',
      });
    }
  }

  // Nachbereitung der letzten Party (Kassensturz, Gäste, Abrechnung)
  const letzte = vergangene(lage, jetzt).at(-1);
  if (letzte && tageBis(s(letzte.datum), jetzt) >= -45) {
    const seit = -tageBis(s(letzte.datum), jetzt);
    for (const p of countdown(lage, letzte, jetzt).filter((p) => p.tag > 0 && p.tag < 30 && seit >= p.tag && p.erledigt === false)) {
      add({
        stufe: 'wichtig',
        titel: `Nachbereitung: ${p.titel}`,
        begruendung: `Party vom ${s(letzte.datum)}; ${p.beleg}.`,
        link: p.link,
        linkText: 'Öffnen',
      });
    }
  }

  // Aufgaben
  if (k.aufgaben.ueberfaellig) {
    add({
      stufe: 'wichtig',
      titel: `${plural(k.aufgaben.ueberfaellig, 'Aufgabe ist', 'Aufgaben sind')} überfällig`,
      begruendung: 'Fälligkeitsdatum liegt vor heute, Status ist nicht „erledigt“.',
      link: '/intern/verwaltung/aufgaben?filter=ueberfaellig',
      linkText: 'Aufgaben',
    });
  }
  const bald = lage.t.aufgaben
    .filter((a) => offen(a) && s(a.faellig) >= heute && tageBis(s(a.faellig), jetzt) <= 7)
    .sort((a, b) => s(a.faellig).localeCompare(s(b.faellig)));
  if (bald.length) {
    add({
      stufe: bald.some((a) => s(a.prioritaet) === 'hoch') ? 'wichtig' : 'hinweis',
      titel: `${plural(bald.length, 'Aufgabe ist', 'Aufgaben sind')} in den nächsten 7 Tagen fällig`,
      begruendung: `${bald
        .slice(0, 3)
        .map((a) => `${s(a.aufgabe)} (${datumKurz(s(a.faellig))})`)
        .join(' · ')}${bald.length > 3 ? ' …' : ''}`,
      link: '/intern/verwaltung/aufgaben?filter=bald',
      linkText: 'Aufgaben',
    });
  }
  if (k.aufgaben.ohneVerantwortung) {
    add({
      stufe: 'hinweis',
      titel: `${plural(k.aufgaben.ohneVerantwortung, 'offene Aufgabe hat', 'offene Aufgaben haben')} niemanden zuständig`,
      begruendung: 'Ohne Namen bleibt eine Aufgabe erfahrungsgemäß liegen.',
      link: '/intern/verwaltung/aufgaben?filter=ohne',
      linkText: 'Aufgaben',
    });
  }
  const aktivTeam = k.team.filter((t) => t.name);
  if (aktivTeam.length >= 3) {
    const schnitt = aktivTeam.reduce((a, t) => a + t.offen, 0) / aktivTeam.length;
    const top = aktivTeam[0]!;
    if (top.offen >= 4 && top.offen > schnitt * 2) {
      add({
        stufe: 'hinweis',
        titel: `${top.name} trägt ${top.offen} offene Aufgaben`,
        begruendung: `Mehr als doppelt so viele wie der Schnitt im Team (${schnitt.toFixed(1)}). Umverteilen?`,
        link: '/intern/verwaltung/aufgaben',
        linkText: 'Aufgaben',
      });
    }
  }

  // Geld
  if (k.konto.kassa < 0) {
    add({
      stufe: 'kritisch',
      titel: `Kassa im Minus (${euro(k.konto.kassa)})`,
      begruendung: 'Eine Bargeldkassa kann nicht negativ sein: eine Einnahme fehlt oder eine Ausgabe ist doppelt gebucht.',
      link: '/intern/finanzen/kassabuch',
      linkText: 'Kassabuch',
    });
  }
  const ohneBeleg = lage.t.buchungen.filter((b) => s(b.art) === 'Ausgabe' && !s(b.beleg) && !s(b.storno) && s(b.kategorie) !== 'Übertrag');
  if (ohneBeleg.length) {
    add({
      stufe: 'hinweis',
      titel: `${plural(ohneBeleg.length, 'Ausgabe ohne Beleg', 'Ausgaben ohne Beleg')}`,
      begruendung: 'Belege gehören zur Einnahmen-Ausgaben-Rechnung und zur Rechnungsprüfung. Foto in Drive, Link ins Kassabuch.',
      link: '/intern/finanzen/kassabuch',
      linkText: 'Kassabuch',
    });
  }
  const bar = k.konto.kassa;
  if (bar > 500 && s(lage.einstellungen.iban)) {
    add({
      stufe: 'hinweis',
      titel: `${euro(bar, true)} Bargeld auf das Vereinskonto einzahlen`,
      begruendung: 'Viel Bargeld bei einer Person ist ein Risiko; auf dem Konto ist jede Bewegung belegt.',
      link: '/intern/finanzen/kassabuch',
      linkText: 'Kassabuch',
    });
  }
  const beitrag = Number(lage.einstellungen.mitgliedsbeitrag);
  if (Number.isFinite(beitrag) && beitrag > 0) {
    const jahr = heute.slice(0, 4);
    const zahler = new Set(
      lage.t.buchungen
        .filter((b) => s(b.kategorie) === 'Mitgliedsbeitrag' && s(b.datum).startsWith(jahr))
        .map((b) => s(b.mitglied).toLowerCase()),
    );
    const offenB = lage.t.mitglieder.filter(
      (m) => s(m.status || 'aktiv') === 'aktiv' && !zahler.has(s(m.name).toLowerCase()) && !zahler.has(s(m.email).toLowerCase()),
    );
    if (offenB.length) {
      add({
        stufe: 'hinweis',
        titel: `Mitgliedsbeitrag ${jahr} offen: ${plural(offenB.length, 'Person', 'Personen')}`,
        begruendung: `Beitrag laut Einstellungen ${euro(beitrag)}; im Kassabuch fehlt eine Buchung „Mitgliedsbeitrag“ für ${offenB
          .slice(0, 4)
          .map((m) => s(m.name))
          .join(', ')}${offenB.length > 4 ? ' …' : ''}.`,
        link: '/intern/finanzen/beitraege',
        linkText: 'Beiträge',
      });
    }
  }

  // Historie: Kassendifferenzen aus dem Archiv
  const diffs = historie(lage, jetzt).filter((h) => h.differenz !== null && Math.abs(h.differenz) >= 50);
  if (diffs.length) {
    const groesste = diffs.reduce((a, b) => (Math.abs(b.differenz!) > Math.abs(a.differenz!) ? b : a));
    add({
      stufe: 'hinweis',
      titel: 'Kassensturz zu zweit einführen',
      begruendung: `Bei ${plural(diffs.length, 'früheren Party', 'früheren Partys')} wich der gezählte Überschuss um mindestens 50 € vom berechneten ab (größte Abweichung ${euro(groesste.differenz, true)}). Abendkassa mit Bändchen-Zählung und zweiter Person schließt diese Lücke.`,
      link: '/intern/finanzen/abendkassa',
      linkText: 'Abendkassa',
    });
  }

  // Equipment
  if (k.equipment.fehltFuerNaechste.length) {
    add({
      stufe: nx && nx.tage < 7 ? 'wichtig' : 'hinweis',
      titel: `${plural(k.equipment.fehltFuerNaechste.length, 'Ding fehlt', 'Dinge fehlen')} für die nächste Party`,
      begruendung: k.equipment.fehltFuerNaechste
        .slice(0, 5)
        .map((e) => `${s(e.gegenstand)} (${s(e.zustand)})`)
        .join(', '),
      link: '/intern/verwaltung/equipment',
      linkText: 'Equipment',
    });
  }

  // Verein
  if (k.verein.naechster) {
    const z = k.verein.naechster;
    const faellig = s(z.faellig);
    add({
      stufe: faellig && faellig < heute ? 'wichtig' : 'hinweis',
      titel: `Verein: ${s(z.schritt)}`,
      begruendung: `Nächster offener Schritt (${k.verein.erledigt} von ${k.verein.gesamt} erledigt)${faellig ? `, fällig ${faellig}` : ''}.`,
      link: '/intern/verwaltung/verein',
      linkText: 'Verein',
    });
  }

  // Datenschutz: Löschfrist der Gästeliste (30 Tage nach der Party, laut Datenschutzerklärung)
  const alt = lage.anmeldungen.filter((a) => a.datum && !a.newsletter && tageBis(a.datum, jetzt) < -30);
  if (alt.length) {
    add({
      stufe: 'wichtig',
      titel: `${plural(alt.length, 'Anmeldung', 'Anmeldungen')} über der Löschfrist`,
      begruendung: 'Die Datenschutzerklärung verspricht Löschung 30 Tage nach der Party, außer bei Newsletter-Einwilligung.',
      link: '/intern/daten/anmeldungen',
      linkText: 'Anmeldungen',
    });
  }

  // Wissen aus dem Repo: Absender noch über hoam.space
  if (/hoam\.space/i.test(env('MAIL_FROM'))) {
    add({
      stufe: 'hinweis',
      titel: 'Mails gehen noch über hoam.space',
      begruendung: 'Sobald ntgl.at bei Resend verifiziert ist, MAIL_FROM auf anmeldung@ntgl.at umstellen (siehe docs/stand-ntgl.md).',
      link: '/intern/verwaltung/einstellungen',
      linkText: 'Einstellungen',
    });
  }

  const rang: Record<Stufe, number> = { kritisch: 0, wichtig: 1, hinweis: 2 };
  return liste.sort((a, b) => rang[a.stufe] - rang[b.stufe]);
}

/** Offene Aufgaben einer Person */
export const meineAufgaben = (lage: Lage, name: string) => lage.t.aufgaben.filter((a) => offen(a) && betrifft(a.verantwortlich, name));
