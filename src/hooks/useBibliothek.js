/**
 * Öffentliche Bibliothek: Veröffentlichen, Markieren, Übernehmen von
 * Unterrichtsstunden und selbstständigen Übungen.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const META = ['id', 'created_date', 'updated_date', 'created_by_id', 'created_by'];
const ohneMeta = (o) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !META.includes(k)));

export function useBibliothekEintraege() {
  return useQuery({
    queryKey: ['bibliothek'],
    queryFn: () => base44.entities.BibliotheksEintrag.list('-created_date', 500),
  });
}

export function useMerkungen(email) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['bibliothek-merkungen', email],
    queryFn: () => base44.entities.BibliotheksMerkung.filter({ user_email: email }),
    enabled: !!email,
  });
  const umschalten = useMutation({
    mutationFn: async (eintragId) => {
      const vorhanden = (query.data || []).find((m) => m.eintrag_id === eintragId);
      if (vorhanden) await base44.entities.BibliotheksMerkung.delete(vorhanden.id);
      else await base44.entities.BibliotheksMerkung.create({ user_email: email, eintrag_id: eintragId });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bibliothek-merkungen'] }),
  });
  return { ids: new Set((query.data || []).map((m) => m.eintrag_id)), umschalten };
}

export function useVeroeffentlichen() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ art, quelle, unterrichtseinheit, user, eintrag }) => {
      if (eintrag) {
        await base44.entities.BibliotheksEintrag.delete(eintrag.id);
        if (art === 'uebung') await base44.functions.invoke('setEinheitAustauschSecure', { einheit_id: quelle.id, im_austausch: false });
        return 'zurueck';
      }
      const lg = unterrichtseinheit?.lerngruppe_id
        ? await base44.entities.Lerngruppe.get(unterrichtseinheit.lerngruppe_id).catch(() => null)
        : null;
      const basis = {
        art,
        quelle_id: quelle.id,
        fach: unterrichtseinheit?.fach || quelle.fach || '',
        jahrgangsstufe: String(unterrichtseinheit?.jahrgangsstufe || quelle.jahrgangsstufe || ''),
        schuljahr: lg?.schuljahr || '',
        unterrichtseinheit_titel: unterrichtseinheit?.titel || '',
        veroeffentlicht_von: user.email,
        veroeffentlicht_von_name: user.full_name || user.email,
      };
      if (art === 'stunde') {
        const seq = await base44.entities.StundenSequenz.filter({ stunde_id: quelle.id });
        await base44.entities.BibliotheksEintrag.create({
          ...basis,
          titel: quelle.arbeitstitel,
          beschreibung: quelle.stundenziel || '',
          stunde_snapshot: ohneMeta(quelle),
          sequenzen_snapshot: seq.map(ohneMeta),
        });
      } else {
        const res = await base44.functions.invoke('setEinheitAustauschSecure', { einheit_id: quelle.id, im_austausch: true });
        if (res?.data?.error) throw new Error(res.data.error);
        await base44.entities.BibliotheksEintrag.create({
          ...basis,
          titel: quelle.titel_der_einheit,
          beschreibung: quelle.grundgeruest_rohtext || '',
        });
      }
      return 'veroeffentlicht';
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['bibliothek'] });
      toast.success(r === 'zurueck' ? 'Aus der Öffentlichen Bibliothek zurückgezogen.' : 'In der Öffentlichen Bibliothek veröffentlicht.');
    },
    onError: (e) => toast.error(e?.message || 'Veröffentlichen fehlgeschlagen.'),
  });
}

export function useUebernehmen(unterrichtseinheit, besitzerEmail) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (eintraege) => {
      for (const e of eintraege) {
        if (e.art === 'stunde') {
          const neu = await base44.entities.Unterrichtsstunde.create({
            ...(e.stunde_snapshot || {}),
            arbeitstitel: e.titel,
            unterrichtseinheit_id: unterrichtseinheit.id,
            fach: unterrichtseinheit.fach,
            jahrgangsstufe: String(unterrichtseinheit.jahrgangsstufe),
            besitzer_email: besitzerEmail,
            status: 'entwurf',
          });
          const seq = (e.sequenzen_snapshot || []).map((s) => ({ ...s, stunde_id: neu.id }));
          if (seq.length) await base44.entities.StundenSequenz.bulkCreate(seq);
        } else {
          const res = await base44.functions.invoke('duplicateEinheitSecure', { einheit_id: e.quelle_id });
          const id = res?.data?.new_einheit_id;
          if (!id) throw new Error(res?.data?.error || 'Übung konnte nicht kopiert werden.');
          await base44.entities.Einheiten.update(id, { format: 'uebungsblock', eltern_einheit_id: unterrichtseinheit.id, im_austausch: false });
        }
      }
    },
    onSuccess: (_, liste) => {
      ['unterrichtsstunden', 'einheiten', 'unterrichtseinheiten'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
      toast.success(`${liste.length} Eintrag/Einträge übernommen.`);
    },
    onError: (e) => toast.error(e?.message || 'Übernehmen fehlgeschlagen.'),
  });
}

/** KI-Suche: liefert die IDs der passenden Einträge. */
export async function kiSuche(frage, eintraege) {
  const katalog = eintraege.map((e) => ({
    id: e.id, art: e.art, titel: e.titel, beschreibung: (e.beschreibung || '').slice(0, 300),
    fach: e.fach, jahrgang: e.jahrgangsstufe, thema: e.unterrichtseinheit_titel,
  }));
  const res = await base44.integrations.Core.InvokeLLM({
    prompt: `Du durchsuchst die Bibliothek einer Schule mit Unterrichtsstunden und selbstständigen Übungen.\nAnfrage der Lehrkraft: "${frage}"\n\nKatalog (JSON):\n${JSON.stringify(katalog)}\n\nGib die IDs ALLER Einträge zurück, die inhaltlich zur Anfrage passen (auch sinnverwandte Themen und Methoden, Fach/Jahrgang beachten, falls genannt). Sortiere nach Relevanz. Wenn nichts passt, gib eine leere Liste zurück.`,
    response_json_schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } },
  });
  return res?.ids || [];
}