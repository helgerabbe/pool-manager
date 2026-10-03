/** Gemeinsame Helfer der Unterrichtsplanung (Recherche + Verlauf). */

export const NETTO_MINUTEN = { einzel: 40, doppel: 85 };

/** Lädt die Planung und prüft, dass sie der aufrufenden Lehrkraft gehört. */
export async function ladePlanung(base44, user, planungId) {
  if (!planungId) return { fehler: Response.json({ error: 'planung_id fehlt.' }, { status: 400 }) };
  const treffer = await base44.asServiceRole.entities.UnterrichtsPlanung.filter({ id: planungId });
  const planung = treffer?.[0];
  if (!planung || planung.besitzer_email !== user.email) {
    return { fehler: Response.json({ error: 'Planung nicht gefunden.' }, { status: 404 }) };
  }
  const ue = (await base44.asServiceRole.entities.Unterrichtseinheit.filter({ id: planung.unterrichtseinheit_id }))?.[0];
  return { planung, ue };
}

/** Kurzlebige Lese-Adressen für die privat hochgeladenen Materialien. */
export async function materialUrls(base44, planung) {
  const liste = (planung.materialien || []).filter((m) => m?.file_uri);
  const urls = await Promise.all(liste.map(async (m) => {
    const r = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: m.file_uri, expires_in: 3600 });
    return r?.signed_url;
  }));
  return urls.filter(Boolean);
}