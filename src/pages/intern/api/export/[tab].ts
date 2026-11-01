import type { APIRoute } from 'astro';
import { istVorstand } from '../../../../lib/intern/rollen';
import { spalten, tabelle } from '../../../../lib/intern/schema';
import { lesenEins, schreibenAls } from '../../../../lib/intern/sheets';

export const prerender = false;

/** CSV mit Semikolon und BOM, damit Excel (de-AT) Umlaute und Spalten richtig liest. */
export const GET: APIRoute = async ({ params, locals }) => {
  const m = locals.mitglied!;
  const def = tabelle(params.tab ?? '');
  if (!def || def.key === 'freigaben') return new Response('Nicht gefunden', { status: 404 });
  if (def.key === 'journal' && !istVorstand(m)) return new Response('Nur für den Vorstand', { status: 403 });

  const felder = spalten(def);
  const zeilen = await lesenEins(def);
  const zelle = (v: string | number) => {
    // Text, der mit = + - @ beginnt, führt Excel sonst als Formel aus (CSV-Injection).
    const s = typeof v === 'string' && /^[=+\-@]/.test(v) ? `'${v}` : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    felder.map((f) => zelle(f.titel)).join(';'),
    ...zeilen.map((z) => felder.map((f) => zelle(schreibenAls(f, z[f.key]))).join(';')),
  ].join('\r\n');
  const datum = new Date().toISOString().slice(0, 10);
  return new Response(`﻿${csv}`, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="ntgl-${def.key}-${datum}.csv"`,
    },
  });
};
