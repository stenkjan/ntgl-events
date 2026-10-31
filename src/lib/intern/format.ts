/** Formatierung für den Mitgliederbereich (de-AT, Wiener Zeit). */

const TZ = 'Europe/Vienna';

const euroFmt = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });
const euroRund = new Intl.NumberFormat('de-AT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const zahlFmt = new Intl.NumberFormat('de-AT', { maximumFractionDigits: 1 });

export const euro = (n: number | null | undefined, rund = false) =>
  n === null || n === undefined || Number.isNaN(n) ? '–' : (rund ? euroRund : euroFmt).format(n);

export const zahl = (n: number | null | undefined) =>
  n === null || n === undefined || Number.isNaN(n) ? '–' : zahlFmt.format(n);

export const prozent = (anteil: number | null | undefined) =>
  anteil === null || anteil === undefined || !Number.isFinite(anteil) ? '–' : `${Math.round(anteil * 100)} %`;

/** JJJJ-MM-TT heute in Wien */
export const heuteIso = (jetzt = new Date()) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(jetzt);

const ausIso = (iso: string) => new Date(`${iso}T12:00:00Z`);

export function datumKurz(iso: string | null | undefined): string {
  if (!iso) return '–';
  return new Intl.DateTimeFormat('de-AT', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ }).format(ausIso(iso));
}

export function datumLang(iso: string | null | undefined): string {
  if (!iso) return '–';
  return new Intl.DateTimeFormat('de-AT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: TZ }).format(
    ausIso(iso),
  );
}

export function datumMonat(iso: string): string {
  return new Intl.DateTimeFormat('de-AT', { month: 'short', year: '2-digit', timeZone: TZ }).format(ausIso(iso));
}

export function zeitstempel(iso: string | null | undefined): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('de-AT', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ }).format(d);
}

/** Ganze Tage von heute bis zum Datum (negativ = vergangen) */
export function tageBis(iso: string, jetzt = new Date()): number {
  const heute = ausIso(heuteIso(jetzt)).getTime();
  return Math.round((ausIso(iso).getTime() - heute) / 86_400_000);
}

export function inTagen(tage: number): string {
  if (tage === 0) return 'heute';
  if (tage === 1) return 'morgen';
  if (tage === -1) return 'gestern';
  return tage > 0 ? `in ${tage} Tagen` : `vor ${-tage} Tagen`;
}

export const plural = (n: number, eins: string, mehr: string) => `${n} ${n === 1 ? eins : mehr}`;

/** Für Sortierung: Uhrzeiten nach Mitternacht hinter den Abend stellen */
export function nachtMinuten(zeit: string): number {
  const m = zeit.match(/^(\d{2}):(\d{2})$/);
  if (!m) return 99_999;
  const min = Number(m[1]) * 60 + Number(m[2]);
  return min < 12 * 60 ? min + 24 * 60 : min;
}
