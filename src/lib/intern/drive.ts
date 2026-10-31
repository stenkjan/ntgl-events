import { googleAccessToken, SCOPE_DRIVE_LESEN } from '../google';

/**
 * Galerie aus Google Drive: Der Service-Account liest nur (drive.readonly).
 * Fotos lädt das Team direkt in Drive hoch; hier wird gewählt, was auf die Website darf.
 */

export interface Bild {
  id: string;
  name: string;
  mimeType: string;
  erstellt: string;
  aufgenommen?: string;
  ordner: string;
  ordnerId: string;
  link?: string;
}

const API = 'https://www.googleapis.com/drive/v3/files';

async function drive<T>(pfad: string): Promise<T> {
  const token = await googleAccessToken([SCOPE_DRIVE_LESEN]);
  if (!token) throw new Error('Google-Zugang fehlt.');
  const res = await fetch(`${API}${pfad}`, { headers: { authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Drive ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

interface DriveDatei {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  webViewLink?: string;
  imageMediaMetadata?: { time?: string };
}

async function liste(q: string): Promise<DriveDatei[]> {
  const felder = 'files(id,name,mimeType,createdTime,webViewLink,imageMediaMetadata(time)),nextPageToken';
  const out: DriveDatei[] = [];
  let token = '';
  do {
    const r = await drive<{ files?: DriveDatei[]; nextPageToken?: string }>(
      `?q=${encodeURIComponent(q)}&fields=${encodeURIComponent(felder)}&orderBy=createdTime desc&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true${token ? `&pageToken=${token}` : ''}`,
    );
    out.push(...(r.files ?? []));
    token = r.nextPageToken ?? '';
  } while (token && out.length < 600);
  return out;
}

/** Bilder in den Ordnern und eine Ebene darunter (z. B. ein Unterordner je Party) */
export async function galerieBilder(ordnerIds: string[]): Promise<{ bilder: Bild[]; ordner: Array<{ id: string; name: string }> }> {
  const bilder: Bild[] = [];
  const ordner: Array<{ id: string; name: string }> = [];
  for (const id of ordnerIds) {
    const meta = await drive<{ id: string; name: string }>(`/${encodeURIComponent(id)}?fields=id,name&supportsAllDrives=true`);
    ordner.push(meta);
    const unter = await liste(`'${id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    for (const quelle of [meta, ...unter.map((u) => ({ id: u.id, name: u.name }))]) {
      for (const d of await liste(`'${quelle.id}' in parents and mimeType contains 'image/' and trashed = false`)) {
        bilder.push({
          id: d.id,
          name: d.name,
          mimeType: d.mimeType,
          erstellt: d.createdTime,
          aufgenommen: d.imageMediaMetadata?.time,
          ordner: quelle.name,
          ordnerId: quelle.id,
          link: d.webViewLink,
        });
      }
    }
  }
  return { bilder, ordner };
}

/**
 * Bild laden: zuerst die von Google verkleinerte Vorschau (thumbnailLink, Größe anpassbar),
 * sonst das Original. Gibt null zurück, wenn die Datei kein Bild ist.
 */
export async function bildLaden(id: string, groesse: number): Promise<{ daten: ArrayBuffer; typ: string } | null> {
  const token = await googleAccessToken([SCOPE_DRIVE_LESEN]);
  if (!token) return null;
  const meta = await drive<{ mimeType?: string; thumbnailLink?: string }>(
    `/${encodeURIComponent(id)}?fields=mimeType,thumbnailLink&supportsAllDrives=true`,
  );
  if (!meta.mimeType?.startsWith('image/')) return null;
  if (meta.thumbnailLink) {
    const url = meta.thumbnailLink.replace(/=s\d+(-[a-z0-9-]+)?$/i, `=s${groesse}`);
    const res = await fetch(url);
    if (res.ok) return { daten: await res.arrayBuffer(), typ: res.headers.get('content-type') ?? 'image/jpeg' };
  }
  const res = await fetch(`${API}/${encodeURIComponent(id)}?alt=media&supportsAllDrives=true`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;
  return { daten: await res.arrayBuffer(), typ: meta.mimeType };
}

export const ordnerIds = (wert: string | undefined) =>
  (wert ?? '')
    .split(/[,\s]+/)
    .map((s) => s.trim().replace(/^.*\/folders\//, '').replace(/\?.*$/, ''))
    .filter(Boolean);
