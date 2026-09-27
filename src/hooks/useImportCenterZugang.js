import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';

/**
 * Wer sieht das Import-Center? Vollzugang (Admin/Fachschaftsleitung) oder
 * Mitarbeiter einer Einheit (LEITUNG/EDITOR) — Letztere nur für ihre Einheiten.
 * Die eigentliche Schranke sitzt serverseitig; das hier steuert nur die Ansicht.
 */
export function useImportCenterZugang() {
  const { isLoading: rbacLaedt, permissions } = useRBAC();
  const voll = permissions?.kannExportBedienen === true;

  const { data: einheitIds = [], isLoading: mitgliederLaden } = useQuery({
    queryKey: ['importCenterMitarbeiterEinheiten'],
    enabled: !rbacLaedt && !voll,
    queryFn: async () => {
      const me = await base44.auth.me();
      const liste = await base44.entities.EinheitMembers.filter({ user_email: me.email });
      return (liste || [])
        .filter((m) => m.unit_role === 'LEITUNG' || m.unit_role === 'EDITOR')
        .map((m) => m.einheit_id);
    },
  });

  return {
    isLoading: rbacLaedt || (!voll && mitgliederLaden),
    voll,
    einheitIds,
    hatZugang: voll || einheitIds.length > 0,
  };
}