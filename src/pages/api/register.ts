import type { APIRoute } from 'astro';
import { handleRegistration } from '../../lib/registration';

// Läuft als Serverless Function auf Vercel, nicht statisch.
export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request, redirect, clientAddress }) => {
  const contentType = request.headers.get('content-type') ?? '';
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');

  let input: Record<string, string> = {};
  try {
    if (contentType.includes('application/json')) {
      const raw = (await request.json()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(raw)) input[k] = typeof v === 'string' ? v : String(v ?? '');
    } else {
      const fd = await request.formData();
      for (const [k, v] of fd.entries()) input[k] = typeof v === 'string' ? v : '';
    }
  } catch {
    return wantsJson ? json({ ok: false, error: 'Ungültige Anfrage.' }, 400) : redirect('/?fehler=anfrage#anmeldung', 303);
  }

  let ip = clientAddress;
  try {
    ip = request.headers.get('x-forwarded-for') ?? clientAddress;
  } catch {
    ip = '';
  }

  const result = await handleRegistration(input, {
    ip: ip ?? '',
    ua: request.headers.get('user-agent') ?? '',
  });

  if (!wantsJson) {
    return result.ok
      ? redirect('/danke', 303)
      : redirect(`/?fehler=${encodeURIComponent(result.error)}#anmeldung`, 303);
  }
  return json(result, result.ok ? 200 : 400);
};

export const GET: APIRoute = () => json({ ok: false, error: 'Nur POST.' }, 405);
