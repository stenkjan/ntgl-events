import type { APIRoute } from 'astro';
import { findeMitglied, loginPruefen, sichererPfad, sitzungSetzen } from '../../../lib/intern/auth';
import { protokollieren } from '../../../lib/intern/journal';

export const prerender = false;

/** Login-Link einlösen: Signatur und Ablauf prüfen, Mitglied muss noch aktiv sein. */
export const GET: APIRoute = async ({ url, cookies, redirect }) => {
  const email = loginPruefen(url.searchParams.get('t') ?? undefined);
  const weiter = sichererPfad(url.searchParams.get('weiter'));
  if (!email) {
    return redirect(`/intern/anmelden?fehler=${encodeURIComponent('Der Link ist abgelaufen oder ungültig. Bitte einen neuen anfordern.')}`, 303);
  }
  const m = await findeMitglied(email);
  if (!m) return redirect(`/intern/anmelden?fehler=${encodeURIComponent('Dieses Konto ist nicht (mehr) aktiv.')}`, 303);
  sitzungSetzen(cookies, m.email);
  await protokollieren(m, 'login', 'angemeldet', m.email);
  return redirect(weiter, 303);
};
