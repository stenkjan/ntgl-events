import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AstroCookies } from 'astro';
import { Resend } from 'resend';
import { env, envListe } from '../env';
import { rechteFuer, rolleAusText, type Mitglied } from './rollen';
import { TABELLEN } from './schema';
import { datenBereit, lesenEins } from './sheets';

/**
 * Anmeldung per Link (kein Passwort): Wer in „Mitglieder“ aktiv eingetragen ist oder in
 * INTERN_ADMIN_EMAILS steht, bekommt einen 20 Minuten gültigen, signierten Link.
 * Die Sitzung ist ein signiertes Cookie, das nur unter /intern mitgeschickt wird.
 */

export const COOKIE = 'ntgl_sitzung';
const SITZUNG_TAGE = 30;
const LINK_MINUTEN = 20;

type Zweck = 'login' | 'sitzung';
interface Nutzlast {
  z: Zweck;
  e: string;
  exp: number;
  n?: string;
}

function geheimnis(): string {
  const s = env('AUTH_SECRET');
  if (s.length < 32) throw new Error('AUTH_SECRET fehlt oder ist kürzer als 32 Zeichen.');
  return s;
}

export const authBereit = () => env('AUTH_SECRET').length >= 32;

function signieren(daten: Nutzlast): string {
  const body = Buffer.from(JSON.stringify(daten)).toString('base64url');
  const sig = createHmac('sha256', geheimnis()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

function pruefen(token: string | undefined, zweck: Zweck): Nutzlast | null {
  if (!token || !authBereit()) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const erwartet = createHmac('sha256', geheimnis()).update(body).digest();
  const erhalten = Buffer.from(sig, 'base64url');
  if (erhalten.length !== erwartet.length || !timingSafeEqual(erhalten, erwartet)) return null;
  try {
    const daten = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as Nutzlast;
    if (daten.z !== zweck || typeof daten.e !== 'string' || daten.exp < Date.now()) return null;
    return daten;
  } catch {
    return null;
  }
}

export const loginToken = (email: string) =>
  signieren({ z: 'login', e: email, exp: Date.now() + LINK_MINUTEN * 60_000, n: randomBytes(6).toString('base64url') });

export const loginPruefen = (token: string | undefined) => pruefen(token, 'login')?.e ?? null;

export function sitzungSetzen(cookies: AstroCookies, email: string) {
  const token = signieren({ z: 'sitzung', e: email, exp: Date.now() + SITZUNG_TAGE * 86_400_000 });
  cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: import.meta.env.PROD,
    sameSite: 'lax',
    path: '/intern',
    maxAge: SITZUNG_TAGE * 86_400,
  });
}

export function sitzungBeenden(cookies: AstroCookies) {
  cookies.delete(COOKIE, { path: '/intern' });
}

/* ---------- Mitglied finden ---------- */

let mitgliederGemerkt: { zeit: number; liste: Mitglied[] } | null = null;

export async function alleMitglieder(frisch = false): Promise<Mitglied[]> {
  if (!frisch && mitgliederGemerkt && Date.now() - mitgliederGemerkt.zeit < 60_000) return mitgliederGemerkt.liste;
  const admins = new Set(envListe('INTERN_ADMIN_EMAILS'));
  const liste: Mitglied[] = [];
  if (datenBereit()) {
    for (const z of await lesenEins(TABELLEN.mitglieder)) {
      const email = String(z.email ?? '').trim().toLowerCase();
      if (!email || String(z.status ?? 'aktiv').toLowerCase() !== 'aktiv') continue;
      const rolle = rolleAusText(String(z.rolle ?? ''));
      const startzugang = admins.has(email);
      liste.push({
        email,
        name: String(z.name ?? '') || email.split('@')[0]!,
        rolle,
        funktion: String(z.funktion ?? ''),
        bereiche: Array.isArray(z.bereiche) ? z.bereiche : [],
        startzugang,
        rechte: rechteFuer(rolle, startzugang),
      });
    }
  }
  for (const email of admins) {
    if (liste.some((m) => m.email === email)) continue;
    liste.push({
      email,
      name: email.split('@')[0]!,
      rolle: 'mitglied',
      funktion: '',
      bereiche: [],
      startzugang: true,
      rechte: rechteFuer('mitglied', true),
    });
  }
  mitgliederGemerkt = { zeit: Date.now(), liste };
  return liste;
}

export const mitgliederVergessen = () => {
  mitgliederGemerkt = null;
};

export async function findeMitglied(email: string): Promise<Mitglied | null> {
  const e = email.trim().toLowerCase();
  return (await alleMitglieder()).find((m) => m.email === e) ?? null;
}

export async function sitzungLesen(cookies: AstroCookies): Promise<Mitglied | null> {
  const daten = pruefen(cookies.get(COOKIE)?.value, 'sitzung');
  if (!daten) return null;
  return findeMitglied(daten.e);
}

/* ---------- Link versenden ---------- */

export type Versand = { art: 'mail' } | { art: 'entwicklung'; link: string } | { art: 'fehler'; grund: string };

export async function linkSenden(email: string, link: string, name: string): Promise<Versand> {
  const apiKey = env('RESEND_API_KEY');
  // Lokal ohne Mailversand: Link direkt anzeigen (nie im Produktions-Build).
  if (import.meta.env.DEV && (!apiKey || env('INTERN_DEV_LINK') === '1')) return { art: 'entwicklung', link };
  if (!apiKey) return { art: 'fehler', grund: 'RESEND_API_KEY fehlt' };

  const from = env('MAIL_FROM') || 'NTGL <onboarding@resend.dev>';
  const replyTo = env('MAIL_TO').split(',')[0]?.trim() || undefined;
  const { error } = await new Resend(apiKey).emails.send({
    from,
    to: email,
    replyTo,
    subject: 'Dein Login für NTGL intern',
    text: [
      `Hi ${name},`,
      '',
      'hier ist dein Link für den Mitgliederbereich. Er gilt 20 Minuten und nur für dich:',
      link,
      '',
      'Wenn du den Link nicht angefordert hast, ignoriere diese Mail einfach.',
      '',
      'NTGL',
    ].join('\n'),
    html: `<div style="font-family:system-ui,sans-serif;font-size:16px;line-height:1.5;color:#0b0f10">
<p>Hi ${escapeHtml(name)},</p>
<p>hier ist dein Link für den Mitgliederbereich. Er gilt 20&nbsp;Minuten und nur für dich.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#d7263d;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700">Jetzt anmelden</a></p>
<p style="color:#3a4b4a;font-size:14px">Wenn du den Link nicht angefordert hast, ignoriere diese Mail einfach.</p>
</div>`,
  });
  if (error) return { art: 'fehler', grund: `${error.name}: ${error.message}` };
  return { art: 'mail' };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Nur relative Pfade unter /intern als Rücksprung zulassen */
export function sichererPfad(weiter: string | null | undefined, standard = '/intern'): string {
  if (!weiter || !weiter.startsWith('/intern') || weiter.startsWith('//') || weiter.includes('\\')) return standard;
  return weiter;
}
