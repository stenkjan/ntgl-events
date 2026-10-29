import { getCollection, type CollectionEntry } from 'astro:content';

export type EventEntry = CollectionEntry<'events'>;

const TZ = 'Europe/Vienna';
/** Eine Veranstaltung gilt bis 12 Uhr des Folgetags als aktuell (Party geht bis 6 Uhr). */
const GRACE_MS = 36 * 60 * 60 * 1000;

/**
 * Liefert die nächste veröffentlichte Veranstaltung.
 * Gibt es keine kommende, wird die letzte vergangene mit isPast = true geliefert.
 * Achtung: Die Seite ist statisch, "jetzt" ist der Build-Zeitpunkt. Ein Commit = neuer Stand.
 */
export async function pickCurrentEvent(
  now: Date = new Date(),
): Promise<{ event: EventEntry | null; isPast: boolean }> {
  const all = (await getCollection('events', (e) => e.data.published)).sort(
    (a, b) => a.data.date.getTime() - b.data.date.getTime(),
  );
  const upcoming = all.find((e) => e.data.date.getTime() + GRACE_MS >= now.getTime());
  if (upcoming) return { event: upcoming, isPast: false };
  return { event: all.at(-1) ?? null, isPast: true };
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('de-AT', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ,
  }).format(d);
}

export function formatDateShort(d: Date): string {
  return new Intl.DateTimeFormat('de-AT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: TZ,
  }).format(d);
}

export function formatMonth(d: Date): string {
  return new Intl.DateTimeFormat('de-AT', { month: 'long', year: 'numeric', timeZone: TZ }).format(d);
}

/** YYYY-MM-DD in Wiener Zeit */
export function isoDate(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(d);
}
