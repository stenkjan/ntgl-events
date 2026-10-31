import { EINSTELLUNGEN, spalten, TABELLEN, type Tabelle } from './schema';
import { anhaengenViele, batchUpdate, blaetter, internSheetId, lesenEins, neueId, rohLesen, vergessen, type Wert } from './sheets';

/**
 * Legt fehlende Blätter und Spalten an, setzt Auswahllisten und fixiert die Kopfzeile.
 * Bestehende Daten werden nie verändert. Startdaten landen nur in leeren Blättern.
 */
export interface Bericht {
  angelegt: string[];
  spaltenErgaenzt: string[];
  startdaten: string[];
  hinweise: string[];
}

const LIESMICH = [
  ['NTGL Verein Daten'],
  [''],
  ['Diese Tabelle ist die Datenquelle des Mitgliederbereichs (ntgl.at/intern).'],
  ['Jedes Blatt ist eine Tabelle; Zeile 1 enthält die Spaltentitel, Spalte A die ID.'],
  ['Spaltentitel nicht umbenennen. Neue Zeilen am besten im Mitgliederbereich anlegen, dann stimmt das Journal.'],
  ['Eingaben: alle Spalten außer ID, Erstellt am, Erstellt von, Geändert am (die setzt das System).'],
  ['Datum als JJJJ-MM-TT, Uhrzeit als HH:MM, Beträge als Zahl in Euro.'],
  ['Die Website liest nur das Blatt „Freigaben“ (jüngste Zeile), nie die Arbeitsblätter direkt.'],
];

/**
 * @param anhaengen Startdaten auch an Blätter mit Bestand anhängen; Zeilen, deren Schlüsseltext
 * (erstes Pflicht-Textfeld, je Veranstaltung) schon existiert, werden übersprungen.
 */
export async function einrichten(startdaten?: Record<string, Array<Record<string, Wert>>>, anhaengen = false): Promise<Bericht> {
  const sheetId = internSheetId();
  const bericht: Bericht = { angelegt: [], spaltenErgaenzt: [], startdaten: [], hinweise: [] };
  const defs: Tabelle[] = Object.values(TABELLEN);

  let vorhanden = await blaetter(sheetId);
  const titel = new Set(vorhanden.map((b) => b.properties.title));

  // 1. Standardblatt in „Liesmich“ umbenennen, fehlende Blätter anlegen
  const anlegen: unknown[] = [];
  const erstes = vorhanden[0];
  if (!titel.has('Liesmich') && erstes && /^(Sheet1|Tabellenblatt1|Blatt1|Tabelle1)$/.test(erstes.properties.title)) {
    anlegen.push({ updateSheetProperties: { properties: { sheetId: erstes.properties.sheetId, title: 'Liesmich' }, fields: 'title' } });
    titel.add('Liesmich');
  } else if (!titel.has('Liesmich')) {
    anlegen.push({ addSheet: { properties: { title: 'Liesmich', index: 0 } } });
    titel.add('Liesmich');
  }
  for (const d of defs) {
    if (!titel.has(d.blatt)) {
      anlegen.push({ addSheet: { properties: { title: d.blatt, gridProperties: { frozenRowCount: 1 } } } });
      bericht.angelegt.push(d.blatt);
    }
  }
  if (anlegen.length) await batchUpdate(anlegen, sheetId);
  vorhanden = await blaetter(sheetId);
  const idVon = new Map(vorhanden.map((b) => [b.properties.title, b.properties.sheetId]));

  // 2. Kopfzeilen schreiben bzw. fehlende Spalten hinten anfügen
  const formate: unknown[] = [];
  for (const d of defs) {
    const kopf = ((await rohLesen(sheetId, d.blatt))[0] ?? []).map((v) => String(v ?? '').trim());
    const soll = spalten(d).map((f) => f.titel);
    const fehlt = soll.filter((t) => !kopf.some((k) => k.toLowerCase() === t.toLowerCase()));
    const neu = kopf.length === 0 ? soll : [...kopf, ...fehlt];
    if (fehlt.length) {
      if (kopf.length) bericht.spaltenErgaenzt.push(`${d.blatt}: ${fehlt.join(', ')}`);
      formate.push({
        updateCells: {
          range: { sheetId: idVon.get(d.blatt), startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: neu.length },
          rows: [{ values: neu.map((t) => ({ userEnteredValue: { stringValue: t } })) }],
          fields: 'userEnteredValue',
        },
      });
    }
    const sid = idVon.get(d.blatt);
    formate.push(
      { updateSheetProperties: { properties: { sheetId: sid, gridProperties: { frozenRowCount: 1 } }, fields: 'gridProperties.frozenRowCount' } },
      {
        repeatCell: {
          range: { sheetId: sid, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.91, green: 0.93, blue: 0.93 } } },
          fields: 'userEnteredFormat.textFormat.bold,userEnteredFormat.backgroundColor',
        },
      },
    );
    // Auswahllisten für Auswahl- und Ja/Nein-Spalten (Spaltenposition laut neuer Kopfzeile)
    for (const f of spalten(d)) {
      const optionen = f.typ === 'auswahl' ? f.optionen : f.typ === 'janein' ? ['ja', 'nein'] : undefined;
      if (!optionen) continue;
      const i = neu.findIndex((t) => t.toLowerCase() === f.titel.toLowerCase());
      if (i < 0) continue;
      formate.push({
        setDataValidation: {
          range: { sheetId: sid, startRowIndex: 1, startColumnIndex: i, endColumnIndex: i + 1 },
          rule: {
            condition: { type: 'ONE_OF_LIST', values: optionen.map((o) => ({ userEnteredValue: o })) },
            strict: false,
            showCustomUi: true,
          },
        },
      });
    }
  }
  // Liesmich-Text
  formate.push({
    updateCells: {
      range: { sheetId: idVon.get('Liesmich'), startRowIndex: 0, endRowIndex: LIESMICH.length, startColumnIndex: 0, endColumnIndex: 1 },
      rows: LIESMICH.map((r, i) => ({
        values: [{ userEnteredValue: { stringValue: r[0] }, userEnteredFormat: { textFormat: { bold: i === 0, fontSize: i === 0 ? 14 : 10 } } }],
      })),
      fields: 'userEnteredValue,userEnteredFormat.textFormat',
    },
  });
  await batchUpdate(formate, sheetId);
  vergessen(sheetId);

  // 3. Einstellungen mit Standardwerten ergänzen
  const einst = await lesenEins(TABELLEN.einstellungen, sheetId);
  const da = new Set(einst.map((z) => String(z.schluessel)));
  const neuEinst = EINSTELLUNGEN.filter((e) => !da.has(e.schluessel)).map((e) => ({ ...e, id: neueId(), erstellt: new Date().toISOString(), von: 'System' }));
  if (neuEinst.length) {
    await anhaengenViele(TABELLEN.einstellungen, neuEinst, sheetId);
    bericht.startdaten.push(`Einstellungen: ${neuEinst.length}`);
  }

  // 4. Startdaten nur in leere Blätter
  for (const [key, zeilen] of Object.entries(startdaten ?? {})) {
    const d = (TABELLEN as Record<string, Tabelle>)[key];
    if (!d || d.nurSystem || !Array.isArray(zeilen) || zeilen.length === 0) continue;
    if (key === 'einstellungen') {
      bericht.hinweise.push('Einstellungen werden nicht über Startdaten gesetzt.');
      continue;
    }
    const bestand = await lesenEins(d, sheetId);
    if (bestand.length && !anhaengen) {
      bericht.hinweise.push(`${d.blatt}: hat schon ${bestand.length} Zeilen, Startdaten übersprungen.`);
      continue;
    }
    const schluesselFeld = d.felder.find((f) => f.pflicht && f.typ === 'text')?.key;
    const kennung = (z: Record<string, Wert | undefined>) =>
      schluesselFeld ? `${String(z.veranstaltung ?? '')}|${String(z[schluesselFeld] ?? '').trim().toLowerCase()}` : '';
    const vorhanden = new Set(bestand.map((z) => kennung(z)));
    const neu = schluesselFeld ? zeilen.filter((z) => !vorhanden.has(kennung(z))) : zeilen;
    if (neu.length === 0) {
      bericht.hinweise.push(`${d.blatt}: alle Startdaten schon vorhanden.`);
      continue;
    }
    const jetzt = new Date().toISOString();
    await anhaengenViele(
      d,
      neu.map((z) => ({ ...z, id: String(z.id || neueId()), erstellt: jetzt, von: 'Startdaten (Drive-Ordner NTGL)' })),
      sheetId,
    );
    bericht.startdaten.push(`${d.blatt}: ${neu.length}`);
  }
  vergessen(sheetId);
  return bericht;
}
