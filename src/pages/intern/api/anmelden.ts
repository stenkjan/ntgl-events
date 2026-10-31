import type { APIRoute } from 'astro';
import { authBereit, findeMitglied, linkSenden, loginToken, sichererPfad } from '../../../lib/intern/auth';

export const prerender = false;

/**
 * Login-Link anfordern. Die Antwort ist immer gleich, egal ob die Adresse eingetragen ist,
 * damit niemand ausprobieren kann, wer Mitglied ist.
 */
export const POST: APIRoute = async ({ request, redirect, url }) => {
  const fd = await request.formData();
  const weiter = sichererPfad(String(fd.get('weiter') ?? ''));
  const email = String(fd.get('email') ?? '')
    .trim()
    .toLowerCase();
  const gesendet = `/intern/anmelden?gesendet=1&weiter=${encodeURIComponent(weiter)}`;

  if (!authBereit()) return redirect('/intern/anmelden?fehler=Login%20ist%20noch%20nicht%20eingerichtet.', 303);
  if (String(fd.get('website') ?? '') !== '') return redirect(gesendet, 303);
  const start = Number(fd.get('ts') ?? 0);
  if (start && Date.now() - start < 1500) return redirect(gesendet, 303);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return redirect(`/intern/anmelden?fehler=${encodeURIComponent('Bitte eine gültige E-Mail-Adresse angeben.')}`, 303);
  }

  try {
    const m = await findeMitglied(email);
    if (!m) return redirect(gesendet, 303);
    const link = new URL('/intern/anmelden/link', url.origin);
    link.searchParams.set('t', loginToken(m.email));
    link.searchParams.set('weiter', weiter);
    const versand = await linkSenden(m.email, link.toString(), m.name);
    if (versand.art === 'entwicklung') return redirect(`${gesendet}&dev=${encodeURIComponent(versand.link)}`, 303);
    if (versand.art === 'fehler') console.error('[intern/anmelden] Versand fehlgeschlagen', versand.grund);
  } catch (e) {
    console.error('[intern/anmelden]', (e as Error).message);
  }
  return redirect(gesendet, 303);
};
