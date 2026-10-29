// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://ntgl.at',
  // Statische Seite; nur /api/* läuft als Serverless Function (prerender = false).
  adapter: vercel(),
  vite: {
    plugins: [tailwindcss()],
  },
});
