import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * useOffeneAufgabenIdeen
 * ──────────────────────
 * Die noch nicht integrierten Ideen einer Einheit (Entity `AufgabenIdee`,
 * gesammelt über den Aufgabenassistenten).
 *
 * Gebraucht in der Aufgabenwerkstatt: Wer vorher Ideen gesammelt hat, soll
 * sie beim Anlegen einer Aufgabe übernehmen können, statt sie abzutippen.
 * Ohne diesen Weg wären gesammelte Ideen von der Aufgabenseite aus
 * unsichtbar — die Sammelbox und die Werkstatt lägen nebeneinander, ohne
 * voneinander zu wissen.
 *
 * Der Status bleibt unangetastet: Eine übernommene Idee ist erst dann
 * 'integriert', wenn die Lehrkraft das im Assistenten festhält. Hier weiß
 * niemand, ob aus dem Übernehmen am Ende wirklich eine Aufgabe wird.
 */
export default function useOffeneAufgabenIdeen(einheitId, { enabled = true } = {}) {
  const { data, isLoading } = useQuery({
    queryKey: ['offeneAufgabenIdeen', einheitId],
    enabled: enabled && !!einheitId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const rows = await base44.entities.AufgabenIdee.filter({
        einheit_id: einheitId,
        status: 'offen',
      });
      return rows || [];
    },
  });

  return { ideen: data || [], isLoading };
}
