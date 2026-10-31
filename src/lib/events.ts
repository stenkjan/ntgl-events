import { getCollection, type CollectionEntry } from 'astro:content';
import { medienUrl, type FreigabeInhalt, type OeffentlicheVeranstaltung } from './website';

export type EventEntry = CollectionEntry<'events'>;
export type EventData = EventEntry['data'];

/** Eine Party für die Startseite: aus der Markdown-Datei, aus der Freigabe des Mitgliederbereichs oder aus beidem. */
export interface EventView {
  id: string;
  data: EventData;
  /** Markdown-Eintrag für den Freitext (render) */
  entry?: EventEntry;
  /** Freitext aus der Freigabe, ersetzt den Markdown-Text */
  beschreibung?: string;
  quelle: 'datei' | 'freigabe' | 'beide';
}

const TZ = 'Europe/Vienna';
/** Eine Veranstaltung gilt bis 12 Uhr des Folgetags als aktuell (Party geht bis 6 Uhr). */
const GRACE_MS = 36 * 60 * 60 * 1000;

function anwenden(basis: EventData | undefined, f: OeffentlicheVeranstaltung): EventData {
  const titel = f.titel || basis?.title || 'NTGL';
  const adresse = f.adresse ?? basis?.location.address ?? '';
  return {
    title: titel,
    subtitle: f.untertitel ?? basis?.subtitle,
    date: basis?.date ?? new Date(`${f.datum}T00:00:00Z`),
    dateConfirmed: f.datumFix,
    doors: f.einlass ?? basis?.doors ?? '22:00',
    end: f.ende ?? basis?.end,
    location: {
      name: f.location ?? basis?.location.name ?? 'GRNGR (Eule)',
      address: adresse,
      mapsUrl:
        basis?.location.mapsUrl && adresse === basis.location.address
          ? basis.location.mapsUrl
          : adresse
            ? `https://maps.google.com/?q=${encodeURIComponent(adresse)}`
            : undefined,
    },
    price: f.preistext ?? basis?.price,
    flyer: f.flyer ? medienUrl(f.flyer) : basis?.flyer,
    flyerAlt: f.flyer ? `Flyer ${titel}` : basis?.flyerAlt,
    lineup: f.lineup.length ? f.lineup : (basis?.lineup ?? []),
    notes: f.hinweise?.length ? f.hinweise : (basis?.notes ?? []),
    registration: f.anmeldung ?? basis?.registration ?? 'open',
    published: true,
  };
}

/** Alle veröffentlichten Partys, Markdown-Dateien ergänzt um die jüngste Freigabe. */
export async function alleEvents(freigabe?: FreigabeInhalt | null): Promise<EventView[]> {
  const nachDatum = new Map<string, EventView>();
  for (const e of await getCollection('events', (e) => e.data.published)) {
    nachDatum.set(isoDate(e.data.date), { id: e.id, data: e.data, entry: e, quelle: 'datei' });
  }
  for (const f of freigabe?.veranstaltungen ?? []) {
    const basis = nachDatum.get(f.datum);
    nachDatum.set(f.datum, {
      id: basis?.id ?? `freigabe-${f.datum}`,
      data: anwenden(basis?.data, f),
      entry: basis?.entry,
      beschreibung: f.beschreibung,
      quelle: basis ? 'beide' : 'freigabe',
    });
  }
  return [...nachDatum.values()].sort((a, b) => a.data.date.getTime() - b.data.date.getTime());
}

/**
 * Liefert die nächste veröffentlichte Veranstaltung.
 * Gibt es keine kommende, wird die letzte vergangene mit isPast = true geliefert.
 * Achtung: Die Seite ist statisch, "jetzt" ist der Build-Zeitpunkt. Der tägliche Cron baut neu,
 * sobald sich dadurch die gezeigte Party ändern würde.
 */
export async function pickCurrentEvent(
  now: Date = new Date(),
  freigabe?: FreigabeInhalt | null,
): Promise<{ event: EventView | null; isPast: boolean }> {
  const all = await alleEvents(freigabe);
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
