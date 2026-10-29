import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Eine Datei pro Veranstaltung unter src/content/events/.
 * Die Startseite zeigt automatisch die nächste Veranstaltung (siehe src/lib/events.ts).
 */
const events = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    /** Veranstaltungstag (ISO, z. B. 2026-12-18) */
    date: z.coerce.date(),
    /** false = nur Monat anzeigen, "Datum folgt" */
    dateConfirmed: z.boolean().default(true),
    doors: z.string().default('22:00'),
    end: z.string().optional(),
    location: z.object({
      name: z.string(),
      address: z.string(),
      mapsUrl: z.url().optional(),
    }),
    price: z.string().optional(),
    /** Pfad unter /public, z. B. /flyers/2026-12.jpg */
    flyer: z.string().optional(),
    flyerAlt: z.string().optional(),
    lineup: z
      .array(
        z.object({
          time: z.string().optional(),
          artist: z.string(),
          genre: z.string().optional(),
          links: z.array(z.object({ label: z.string(), url: z.url() })).default([]),
        }),
      )
      .default([]),
    /** Kurze Hinweise (Regeln, Bargeld, Garderobe ...) */
    notes: z.array(z.string()).default([]),
    registration: z.enum(['open', 'closed', 'soon']).default('open'),
    published: z.boolean().default(true),
  }),
});

export const collections = { events };
