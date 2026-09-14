/**
 * hooks/useFachEinheitInhalte.js
 *
 * Anlegen im Bereich „Mein Unterricht": eine UNTERRICHTSEINHEIT (die
 * thematische Mappe, z. B. „Rechtschreibung") und darin Unterrichtsstunden
 * bzw. Übungsblöcke.
 *
 * WICHTIG ZUR BEGRIFFLICHKEIT: Eine UNTERRICHTSEINHEIT ist NICHT dasselbe wie
 * eine EINHEIT (Entity 'Einheiten' — das vollständige Lernszenario mit
 * Dashboards, Freigabe und Moodle-Kurs). Deshalb liegt sie in einer eigenen
 * Entity und erscheint nicht in „Meine Einheiten".
 *
 * Fach, Jahrgang und Unterrichtseinheit stehen beim Anlegen fest — sie kommen
 * aus dem Kontext. Deshalb genügt jeweils ein Name.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { dreistelligerCode } from '@/components/unterrichtsstunden/StundeErstellenModal';
import { neuerUebungsblock } from '@/lib/einheitFormat';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['unterrichtseinheiten'] });
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    queryClient.invalidateQueries({ queryKey: ['unterrichtsstunden'] });
  };
}

export function useStundeAnlegen(unterrichtseinheit, besitzerEmail) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (arbeitstitel) =>
      base44.entities.Unterrichtsstunde.create({
        unterrichtseinheit_id: unterrichtseinheit.id,
        fach: unterrichtseinheit.fach || '',
        jahrgangsstufe: String(unterrichtseinheit.jahrgangsstufe || ''),
        arbeitstitel,
        besitzer_email: besitzerEmail,
        status: 'entwurf',
        notfall_code: dreistelligerCode(),
      }),
    onSuccess: () => { invalidate(); toast.success('Unterrichtsstunde angelegt.'); },
    onError: (err) => toast.error(err?.message || 'Anlegen fehlgeschlagen.'),
  });
}

export function useUebungsblockAnlegen(unterrichtseinheit, besitzerEmail) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (titel) => {
      const res = await base44.functions.invoke('createEinheitMitDefaults', {
        metaData: {
          fach: unterrichtseinheit.fach,
          titel_der_einheit: titel,
          jahrgangsstufe: String(unterrichtseinheit.jahrgangsstufe),
        },
        privat: true,
      });
      const block = res?.data?.einheit;
      if (!block?.id) throw new Error(res?.data?.error || 'Übungsblock konnte nicht angelegt werden.');

      const vorbelegung = neuerUebungsblock({
        fach: unterrichtseinheit.fach,
        titel,
        jahrgangsstufe: String(unterrichtseinheit.jahrgangsstufe),
        besitzerEmail,
      });
      await base44.entities.Einheiten.update(block.id, {
        format: vorbelegung.format,
        aktive_lerntypen: vorbelegung.aktive_lerntypen,
        wizard_status: vorbelegung.wizard_status,
        // Ordnung im Bereich „Mein Unterricht": zeigt auf die UNTERRICHTSEINHEIT.
        eltern_einheit_id: unterrichtseinheit.id,
      });

      // Das mitgelieferte Themenfeld gleich passend benennen — ein Übungsblock
      // hat genau eines, ein zweites darf nicht entstehen.
      const themenfelder = await base44.entities.Themenfeld.filter({ einheit_id: block.id }).catch(() => []);
      if (themenfelder?.[0]?.id) {
        await base44.entities.Themenfeld.update(themenfelder[0].id, { titel });
      }
      return block;
    },
    onSuccess: () => { invalidate(); toast.success('Übungsblock angelegt.'); },
    onError: (err) => toast.error(err?.message || 'Anlegen fehlgeschlagen.'),
  });
}

export function useUnterrichtseinheitUmbenennen() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, titel }) => base44.entities.Unterrichtseinheit.update(id, { titel }),
    onSuccess: () => { invalidate(); toast.success('Name geändert.'); },
    onError: (err) => toast.error(err?.message || 'Umbenennen fehlgeschlagen.'),
  });
}

export function useUnterrichtseinheitAnlegen(fach, jahrgang, besitzerEmail) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (titel) =>
      base44.entities.Unterrichtseinheit.create({
        besitzer_email: besitzerEmail,
        fach,
        jahrgangsstufe: String(jahrgang),
        titel,
      }),
    onSuccess: () => { invalidate(); toast.success('Unterrichtseinheit angelegt.'); },
    onError: (err) => toast.error(err?.message || 'Anlegen fehlgeschlagen.'),
  });
}

/**
 * Löschen einer LEEREN Unterrichtseinheit. Sie ist nur eine Hülle — Stunden und
 * Übungsblöcke bleiben eigene Datensätze und werden hier nie mitgelöscht.
 */
export function useUnterrichtseinheitLoeschen() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id) => base44.entities.Unterrichtseinheit.delete(id),
    onSuccess: () => { invalidate(); toast.success('Unterrichtseinheit gelöscht.'); },
    onError: (err) => toast.error(err?.message || 'Löschen fehlgeschlagen.'),
  });
}