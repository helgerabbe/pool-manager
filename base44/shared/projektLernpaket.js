/**
 * Projekt-Lernpaket (2026-11-11): Ein Lernpaket im Themenfeld „Projektaufgaben"
 * (Themenfeld.art = 'projekt') hat keine Aktivitäten. Vollständig ist es,
 * wenn es mindestens eine Aufgabe enthält und alle seine Aufgaben
 * vollständig oder freigegeben sind.
 *
 * Liefert null, wenn das Lernpaket kein Projekt-Lernpaket ist.
 */
const oderNull = (e) => (e?.status === 404 ? null : Promise.reject(e));

export async function projektPaketStand(entities, lernpaket) {
  if (!lernpaket?.themenfeld_id) return null;
  const themenfeld = await entities.Themenfeld.get(lernpaket.themenfeld_id).catch(oderNull);
  if (themenfeld?.art !== 'projekt') return null;

  const alle = await entities.AllgemeineAufgabe.filter({ lernpaket_id: lernpaket.id });
  const aufgaben = (alle || []).filter((a) => a.sync_status !== 'to_delete');
  const offen = aufgaben.filter((a) => a.content_status !== 'approved' && a.is_complete !== true);
  return { aufgaben, offen, vollstaendig: aufgaben.length > 0 && offen.length === 0 };
}