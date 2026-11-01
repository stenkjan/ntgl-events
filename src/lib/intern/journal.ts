import type { Mitglied } from './rollen';
import { TABELLEN } from './schema';
import { anhaengen, datenBereit, neueId } from './sheets';

/** Jede Änderung landet im Journal (Zeit, Person, Tabelle, Aktion, Datensatz, Details). */
export async function protokollieren(
  wer: Mitglied | string,
  tabelle: string,
  aktion: string,
  datensatz: string,
  details: unknown = '',
) {
  if (!datenBereit()) return;
  const text = typeof details === 'string' ? details : JSON.stringify(details);
  try {
    await anhaengen(TABELLEN.journal, {
      id: neueId(),
      zeit: new Date().toISOString(),
      wer: typeof wer === 'string' ? wer : `${wer.name} <${wer.email}>`,
      tabelle,
      aktion,
      datensatz,
      details: text.length > 2000 ? `${text.slice(0, 2000)} …` : text,
    });
  } catch (e) {
    // Das Journal darf eine Änderung nie verhindern, Fehler nur loggen.
    console.error('[journal]', (e as Error).message);
  }
}
