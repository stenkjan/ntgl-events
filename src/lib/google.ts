import { createSign } from 'node:crypto';
import { env } from './env';

/**
 * Google-Zugang über den Service-Account (JWT, ohne Zusatzpaket).
 * Das Token wird je Scope-Kombination zwischengespeichert, solange die Function warm ist.
 */
export const SCOPE_SHEETS = 'https://www.googleapis.com/auth/spreadsheets';
export const SCOPE_DRIVE_LESEN = 'https://www.googleapis.com/auth/drive.readonly';

const tokens = new Map<string, { token: string; bis: number }>();

export function googleKonfiguriert(): boolean {
  return Boolean(env('GOOGLE_SERVICE_ACCOUNT_EMAIL') && env('GOOGLE_PRIVATE_KEY'));
}

export async function googleAccessToken(scopes: string[] = [SCOPE_SHEETS]): Promise<string | null> {
  const email = env('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  let key = env('GOOGLE_PRIVATE_KEY');
  if (!email || !key) return null;

  const scope = scopes.join(' ');
  const gemerkt = tokens.get(scope);
  if (gemerkt && gemerkt.bis > Date.now() + 60_000) return gemerkt.token;

  key = key.replace(/\\n/g, '\n');
  const now = Math.floor(Date.now() / 1000);
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: email,
    scope,
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
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  tokens.set(scope, { token: json.access_token, bis: Date.now() + (json.expires_in ?? 3600) * 1000 });
  return json.access_token;
}
