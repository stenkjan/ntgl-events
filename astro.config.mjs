// @ts-check
import { readFile, writeFile } from 'node:fs/promises';
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

/**
 * Vercel-Cron für den täglichen Neuaufbau (src/pages/api/cron/taeglich.ts).
 * Der Adapter übernimmt keine Crons in die Build-Ausgabe, darum tragen wir sie nach seinem
 * astro:build:done direkt in .vercel/output/config.json ein (Build Output API, Feld „crons“).
 */
const CRONS = [{ path: '/api/cron/taeglich', schedule: '0 4 * * *' }];

const vercelCrons = () => ({
  name: 'ntgl-vercel-crons',
  hooks: {
    'astro:build:done': async () => {
      const pfad = new URL('./.vercel/output/config.json', import.meta.url);
      try {
        const config = JSON.parse(await readFile(pfad, 'utf8'));
        config.crons = CRONS;
        await writeFile(pfad, JSON.stringify(config, null, 2));
      } catch {
        // Kein Vercel-Output (z. B. anderer Adapter): nichts zu tun.
      }
    },
  },
});

// https://astro.build/config
export default defineConfig({
  site: 'https://ntgl.at',
  // Öffentliche Seite statisch; /api/*, /media/* und der Mitgliederbereich /intern/* laufen
  // als Serverless Function (prerender = false).
  adapter: vercel(),
  integrations: [vercelCrons()],
  vite: {
    plugins: [tailwindcss()],
    define: {
      // Für den täglichen Cron: Wann wurde die statische Seite zuletzt gebaut?
      'import.meta.env.BUILD_TIME': JSON.stringify(new Date().toISOString()),
    },
  },
});
