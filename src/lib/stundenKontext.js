import { base44 } from '@/api/base44Client';

/** Netto-Minuten aus der gewählten Zeit. */
export const zielMinuten = (rahmen, abschnitt) =>
  rahmen.zeit?.startsWith('Doppel') ? 85 : rahmen.zeit?.startsWith('Einzel') ? 40 : abschnitt.minuten || 40;

/** Hochgeladenes Material für die KI lesbar machen. */
export const signiereMaterial = (materialien = []) => Promise.all(materialien.map(async (m) =>
  (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: m.file_uri, expires_in: 600 })).signed_url));

/** Gemeinsamer Kontexttext für alle KI-Schritte des Stundenplaners. */
export function kontextText({ planung, abschnitt, rahmen, vorherige }) {
  const verlauf = vorherige.map((a, i) => `- ${a.titel}: ${rahmen.vorherigeStatus?.[i] || 'ja'}`).join('\n');
  return `Fach/Thema der Einheit: ${planung?.thema || ''}
Geplanter Abschnitt: ${abschnitt.titel} (Schwerpunkt ${abschnitt.schwerpunkt || '-'}, Lernziel: ${abschnitt.lernziel || '-'}, im Verlauf vorgesehen ${abschnitt.minuten || '?'} Min.)
Inhalte: ${(abschnitt.inhalte || []).join(', ')}
Verfügbare Zeit: ${rahmen.zeit} (netto ${zielMinuten(rahmen, abschnitt)} Min.)
${verlauf ? `Bisherige Abschnitte (ja = wie geplant, anders = anders gelaufen, nein = nicht durchgeführt):\n${verlauf}` : 'Dies ist die erste Stunde der Einheit.'}
Vorwissen/Bisheriges: ${rahmen.vorwissen || '-'}
Sonstiges: ${rahmen.sonstiges || '-'}
${rahmen.materialien?.length ? 'Die Lehrkraft hat Material angehängt, das sie unbedingt nutzen möchte.' : ''}`;
}