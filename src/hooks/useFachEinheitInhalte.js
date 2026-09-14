/**
 * hooks/useFachEinheitInhalte.js
 *
 * Anlegen INNERHALB einer Einheit: eine Unterrichtsstunde, ein Übungsblock,
 * oder ein neuer Titel für die Einheit selbst.
 *
 * Fach, Jahrgang und Einheit stehen dabei fest — sie kommen aus dem Kontext,
 * in dem die Lehrkraft gerade arbeitet. Deshalb genügt jeweils ein Name.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { dreistelligerCode } from '@/components/unterrichtsstunden/StundeErstellenModal';
import { neuerUebungsblock } from '@/lib/einheitFormat';

function useInvalidate() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['einheiten'] });
    queryClient.invalidateQueries({ queryKey: ['unterrichtsstunden'] });
  };
}

export function useStundeAnlegen(einheit, besitzerEmail) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (arbeitstitel) =>
      base44.entities.Unterrichtsstunde.create({
        einheit_id: einheit.id,
        fach: einheit.fach || '',
        jahrgangsstufe: String(einheit.jahrgangsstufe || ''),
        arbeitstitel,
        besitzer_email: besitzerEmail,
        status: 'entwurf',
        notfall_code: dreistelligerCode(),
      }),
    onSuccess: () => { invalidate(); toast.success('Unterrichtsstunde angelegt.'); },
    onError: (err) => toast.error(err?.message || 'Anlegen fehlgeschlagen.'),
  });
}

export function useUebungsblockAnlegen(einheit, besitzerEmail) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (titel) => {
      const res = await base44.functions.invoke('createEinheitMitDefaults', {
        metaData: {
          fach: einheit.fach,
          titel_der_einheit: titel,
          jahrgangsstufe: String(einheit.jahrgangsstufe),
        },
        privat: true,
      });
      const block = res?.data?.einheit;
      if (!block?.id) throw new Error(res?.data?.error || 'Übungsblock konnte nicht angelegt werden.');

      const vorbelegung = neuerUebungsblock({
        fach: einheit.fach,
        titel,
        jahrgangsstufe: String(einheit.jahrgangsstufe),
        besitzerEmail,
      });
      await base44.entities.Einheiten.update(block.id, {
        format: vorbelegung.format,
        aktive_lerntypen: vorbelegung.aktive_lerntypen,
        wizard_status: vorbelegung.wizard_status,
        eltern_einheit_id: einheit.id,
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

export function useEinheitUmbenennen() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, titel }) => base44.entities.Einheiten.update(id, { titel_der_einheit: titel }),
    onSuccess: () => { invalidate(); toast.success('Name geändert.'); },
    onError: (err) => toast.error(err?.message || 'Umbenennen fehlgeschlagen.'),
  });
}

export function useEinheitAnlegen(fach, jahrgang) {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (titel) => {
      const res = await base44.functions.invoke('createEinheitMitDefaults', {
        metaData: { fach, titel_der_einheit: titel, jahrgangsstufe: String(jahrgang) },
        privat: true,
      });
      const einheit = res?.data?.einheit;
      if (!einheit?.id) throw new Error(res?.data?.error || 'Einheit konnte nicht angelegt werden.');
      await base44.entities.Einheiten.update(einheit.id, { wizard_status: 'aktiv' });
      return einheit;
    },
    onSuccess: () => { invalidate(); toast.success('Einheit angelegt.'); },
    onError: (err) => toast.error(err?.message || 'Anlegen fehlgeschlagen.'),
  });
}