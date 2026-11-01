import type { APIRoute } from 'astro';
import { sitzungBeenden } from '../../lib/intern/auth';

export const prerender = false;

export const POST: APIRoute = ({ cookies, redirect }) => {
  sitzungBeenden(cookies);
  return redirect('/intern/anmelden?abgemeldet=1', 303);
};

export const GET: APIRoute = ({ redirect }) => redirect('/intern', 303);
