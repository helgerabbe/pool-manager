import { base44 } from '@/api/base44Client';

/** Öffnet eine private Datei über eine kurzlebige signierte Adresse. */
export async function oeffneDatei(uri) {
  if (!uri) return;
  if (/^https?:/.test(uri)) { window.open(uri, '_blank'); return; }
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 300 });
  window.open(signed_url, '_blank');
}