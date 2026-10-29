import { Resend } from 'resend';
import { createSign } from 'node:crypto';

type Input = Record<string, string | undefined>;
export type Result = { ok: true; stored: Array<'sheet' | 'mail'> } | { ok: false; error: string };

const env = (key: string): string => {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[key];
  return (fromMeta ?? process.env[key] ?? '').trim();
};

const truthy = (v: string | undefined) => v === 'on' || v === 'true' || v === '1' || v === 'ja';

export interface RegistrationRow {
  ts: string;
  event: string;
  name: string;
  email: string;
  newsletter: boolean;
  ip: string;
}

export async function handleRegistration(input: Input, meta: { ip: string; ua: string }): Promise<Result> {
  // Honigtopf: echte Menschen füllen das versteckte Feld nicht aus.
  if ((input.website ?? '').trim() !== '') return { ok: true, stored: [] };
  // Zeitfalle: schneller als 2,5 s nach Seitenaufruf ist kein Mensch.
  const started = Number(input.ts ?? 0);
  if (started && Date.now() - started < 2500) return { ok: false, error: 'Bitte noch einmal absenden.' };

  const name = (input.name ?? '').trim();
  const email = (input.email ?? '').trim().toLowerCase();
  const event = (input.event ?? '').trim().slice(0, 120);
  const consent = truthy(input.consent);
  const newsletter = truthy(input.newsletter);

  if (name.length < 2 || name.length > 80) return { ok: false, error: 'Bitte einen Namen angeben.' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, error: 'Bitte eine gültige E-Mail-Adresse angeben.' };
  }
  if (!consent) {
    return { ok: false, error: 'Ohne Einwilligung in die Datenverarbeitung ist keine Anmeldung möglich.' };
  }

  const row: RegistrationRow = {
    ts: new Date().toISOString(),
    event,
    name,
    email,
    newsletter,
    ip: meta.ip.split(',')[0]?.trim() ?? '',
  };

  const stored: Array<'sheet' | 'mail'> = [];
  const problems: string[] = [];

  try {
    if (await appendToSheet(row)) stored.push('sheet');
  } catch (e) {
    problems.push(`sheet: ${(e as Error).message}`);
  }
  try {
    if (await sendMails(row)) stored.push('mail');
  } catch (e) {
    problems.push(`mail: ${(e as Error).message}`);
  }

  if (stored.length === 0) {
    console.error(
      '[register] nicht gespeichert',
      problems.length ? problems : 'kein Speicherziel konfiguriert (RESEND_API_KEY / SHEET_ID)',
    );
    return {
      ok: false,
      error:
        'Die Anmeldung konnte gerade nicht gespeichert werden. Bitte später noch einmal versuchen oder an info.ntgl@proton.me schreiben.',
    };
  }
  if (problems.length) console.warn('[register] teilweise gespeichert', stored, problems);
  return { ok: true, stored };
}

/* ---------- Google Sheets über Service-Account (ohne zusätzliche Abhängigkeit) ---------- */

async function googleAccessToken(): Promise<string | null> {
  const email = env('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  let key = env('GOOGLE_PRIVATE_KEY');
  if (!email || !key) return null;
  key = key.replace(/\\n/g, '\n');

  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`google token ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  return json.access_token ?? null;
}

async function appendToSheet(row: RegistrationRow): Promise<boolean> {
  const sheetId = env('SHEET_ID');
  if (!sheetId) return false;
  const token = await googleAccessToken();
  if (!token) return false;

  const tab = env('SHEET_TAB') || 'Anmeldungen';
  const range = encodeURIComponent(`${tab}!A:F`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      values: [[row.ts, row.event, row.name, row.email, row.newsletter ? 'ja' : 'nein', row.ip]],
    }),
  });
  if (!res.ok) throw new Error(`sheets ${res.status} ${(await res.text()).slice(0, 200)}`);
  return true;
}

/* ---------- E-Mail über Resend ---------- */

async function sendMails(row: RegistrationRow): Promise<boolean> {
  const apiKey = env('RESEND_API_KEY');
  if (!apiKey) return false;
  const from = env('MAIL_FROM') || 'NTGL <onboarding@resend.dev>';
  const to = env('MAIL_TO')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const resend = new Resend(apiKey);

  if (to.length) {
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Anmeldung ${row.event || 'NTGL'}: ${row.name}`,
      text: [
        'Neue Anmeldung',
        '',
        `Veranstaltung: ${row.event || '-'}`,
        `Name: ${row.name}`,
        `E-Mail: ${row.email}`,
        `Newsletter: ${row.newsletter ? 'ja' : 'nein'}`,
        `Zeit: ${row.ts}`,
      ].join('\n'),
    });
    if (error) throw new Error(`resend ${error.name}: ${error.message}`);
  }

  // Bestätigung an die Person braucht eine verifizierte Absenderdomain, darum nur "best effort".
  try {
    await resend.emails.send({
      from,
      to: row.email,
      replyTo: to[0],
      subject: `Du bist dabei: ${row.event || 'NTGL'}`,
      text: [
        `Hi ${row.name},`,
        '',
        `deine Anmeldung für ${row.event || 'die nächste NTGL-Party'} ist eingegangen.`,
        'Alle Infos zu Ort, Zeit und Line-up findest du auf https://ntgl.at',
        '',
        'Bis bald,',
        'NTGL',
      ].join('\n'),
    });
  } catch (e) {
    console.warn('[register] Bestätigungsmail fehlgeschlagen', (e as Error).message);
  }
  return true;
}
