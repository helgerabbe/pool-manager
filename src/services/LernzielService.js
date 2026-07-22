/**
 * LernzielService.js
 *
 * Service-Layer für die Lernziele-Entität.
 * Einzige Datei, die base44Client für Lernziele importieren darf.
 *
 * MIGRATIONSHINWEIS:
 * - `getAllLernziele()` → supabase.from('lernziele').select('*').order('created_at', { ascending: false })
 * - `getLernzieleByLernpaket(id)` → supabase.from('lernziele').select('*').eq('lernpaket_id', id)
 * - `createLernziel(data)` → supabase.from('lernziele').insert(data).select().single()
 * - `updateLernziel(id, data)` → supabase.from('lernziele').update(data).eq('id', id).select().single()
 * - `deleteLernziel(id)` → supabase.from('lernziele').delete().eq('id', id)
 */

import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { getVerwendungenFuerLernziele } from '@/lib/basismodulVerknuepfung';

/**
 * Alle Lernziele laden (global, z.B. für den Workspace-Baum).
 */
export async function getAllLernziele() {
  return base44.entities.Lernziele.list('-created_date', 500);
}

/**
 * Alle Lernziele eines bestimmten Lernpakets laden.
 */
export async function getLernzieleByLernpaket(lernpaketId) {
  return base44.entities.Lernziele.filter({ lernpaket_id: lernpaketId });
}

/**
 * Neues Lernziel anlegen.
 */
export async function createLernziel(data) {
  return base44.entities.Lernziele.create(data);
}

/**
 * Lernziel aktualisieren.
 */
export async function updateLernziel(id, data) {
  return base44.entities.Lernziele.update(id, data);
}

/**
 * Lernziel löschen.
 *
 * Lösch-Wächter: Ist das Lernziel als Basis-Vorwissen in Aufgaben anderer
 * Einheiten verlinkt (AllgemeineAufgabeBasisLernzielMapping), wird das
 * Löschen blockiert — die Verknüpfungen müssen zuerst entfernt werden.
 */
export async function deleteLernziel(id) {
  const mappings = await base44.entities.AllgemeineAufgabeBasisLernzielMapping.filter({ basislernziel_id: id });
  if (mappings.length > 0) {
    const verwendungen = await getVerwendungenFuerLernziele([id]);
    const titel = verwendungen.map((v) => `„${v.einheitTitel}"`).join(', ');
    const msg = `Löschen nicht möglich: Dieses Lernziel ist als Basis-Vorwissen verlinkt in ${titel || 'anderen Einheiten'}. Bitte zuerst die Verknüpfungen entfernen.`;
    toast.error(msg, { duration: 8000 });
    throw new Error(msg);
  }
  return base44.entities.Lernziele.delete(id);
}