/**
 * SektorIntroVorschauButton.jsx
 *
 * Vorschau-Knopf am Systembaustein „Einführung in den Sektor".
 * Zeigt deutlich an, ob für DIESE Stelle schon eine KI-Einführung übernommen
 * wurde: fehlt sie, erscheint der Knopf in Warnfarbe mit „Vorschau fehlt".
 * Geprüft wird über die instance_id — der Inhalt gehört genau zu dem Sektor,
 * in dem der Baustein liegt.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Eye, AlertTriangle } from 'lucide-react';

export default function SektorIntroVorschauButton({ instanceId, onPreview }) {
  const { data: vorhanden } = useQuery({
    queryKey: ['sektorIntroSnapshot', instanceId],
    enabled: !!instanceId,
    staleTime: 30_000,
    queryFn: async () => {
      const list = await base44.entities.SchuelerInhaltSnapshot.filter({
        baustein_id: 'sys_themenfeld_intro',
        instance_id: instanceId,
      });
      return Array.isArray(list) && list.length > 0;
    },
  });

  const fehlt = vorhanden === false;

  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onPreview(); }}
      title={
        fehlt
          ? 'Für diesen Sektor wurde noch keine Einführung erstellt – jetzt erzeugen und übernehmen.'
          : 'Einführung dieses Sektors ansehen oder neu erzeugen'
      }
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold transition-colors ${
        fehlt
          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
          : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
      }`}
    >
      {fehlt ? <AlertTriangle className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      {fehlt ? 'Vorschau fehlt' : 'Vorschau'}
    </button>
  );
}