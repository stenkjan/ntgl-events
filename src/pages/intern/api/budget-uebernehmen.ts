import type { APIRoute } from 'astro';
import { budgetFuer, ladeLage } from '../../../lib/intern/daten';
import { darfSchreiben } from '../../../lib/intern/formular';
import { protokollieren } from '../../../lib/intern/journal';
import { TABELLEN } from '../../../lib/intern/schema';
import { anhaengenViele, neueId } from '../../../lib/intern/sheets';

export const prerender = false;

/** Vorschläge (Ø der Archivwerte) als Plan-Zeilen anlegen, nur für Kategorien ohne Plan. */
export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const m = locals.mitglied!;
  const v = String((await request.formData()).get('v') ?? '');
  const zurueck = (art: 'ok' | 'fehler', text: string) =>
    redirect(`/intern/finanzen/budget?v=${encodeURIComponent(v)}&${art}=${encodeURIComponent(text)}`, 303);
  if (!darfSchreiben(m, TABELLEN.budget)) return zurueck('fehler', 'Budget planen dürfen Kassier:in und Obmann/Obfrau.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return zurueck('fehler', 'Keine Party gewählt.');

  const lage = await ladeLage([TABELLEN.budget, TABELLEN.buchungen, TABELLEN.veranstaltungen]);
  const neu = budgetFuer(lage, v).filter((z) => z.plan === null && z.vorschlag !== null);
  if (neu.length === 0) return zurueck('ok', 'Nichts zu übernehmen.');
  const jetzt = new Date().toISOString();
  await anhaengenViele(
    TABELLEN.budget,
    neu.map((z) => ({
      id: neueId(),
      veranstaltung: v,
      art: z.art,
      kategorie: z.kategorie,
      plan: z.vorschlag,
      notiz: `Vorschlag: Ø aus ${z.vorschlagN === 1 ? 'einer früheren Party' : `${z.vorschlagN} früheren Partys`}`,
      erstellt: jetzt,
      von: `${m.name} <${m.email}>`,
    })),
  );
  await protokollieren(m, 'budget', 'Vorschläge übernommen', v, neu.map((z) => `${z.kategorie} ${z.vorschlag}`).join(', '));
  return zurueck('ok', `${neu.length} Plan-Zeilen angelegt. Bitte prüfen und anpassen.`);
};
