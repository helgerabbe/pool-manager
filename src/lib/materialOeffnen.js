import { base44 } from '@/api/base44Client';

/** Art einer Material-Datei anhand ihres Namens. */
export function dateiArt(name = '') {
  const n = name.toLowerCase();
  if (/\.(pptx?|ppsx?)$/.test(n)) return 'powerpoint';
  if (/\.docx?$/.test(n)) return 'word';
  if (/\.pdf$/.test(n)) return 'pdf';
  if (/\.(png|jpe?g|gif|webp)$/.test(n)) return 'bild';
  return 'sonstig';
}

/** Abrufbare Adresse – private Dateien für die Dauer einer Stunde signieren. */
export async function materialUrl(url) {
  if (/^https?:/.test(url)) return url;
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: url, expires_in: 4 * 3600 });
  return signed_url;
}

/** Startet die installierte Office-App (PowerPoint/Word) mit der Datei. */
export const officeLink = (art, url) => `${art === 'powerpoint' ? 'ms-powerpoint' : 'ms-word'}:ofv|u|${url}`;

/** Microsoft-Online-Vorschau zum Einbetten. */
export const officeVorschau = (url) => `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;