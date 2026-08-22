/**
 * EinheitAktivitaetenLog.jsx
 *
 * „Letzte Aktivitäten" — schlankes Aktivitätenprotokoll einer Einheit für
 * die rechte Spalte in Tab 1. Zeigt aus dem AuditLog, WER WANN in WELCHEM
 * Bereich der Einheit gearbeitet hat (nicht, was genau geändert wurde).
 *
 * Datenquelle: AuditLog-Einträge, deren resource_id zur Einheit selbst,
 * zu einem ihrer Lernpakete oder zu einer ihrer Aufgaben gehört.
 * Aufeinanderfolgende Einträge derselben Person am selben Objekt werden
 * zu einer Zeile zusammengefasst, damit die Liste lesbar bleibt.
 */
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { History, Loader2 } from 'lucide-react';
import HelpBadge from '@/components/ui/HelpBadge';

const ACTION_LABEL = {
  CREATE: 'angelegt',
  UPDATE: 'bearbeitet',
  DELETE: 'gelöscht',
  PUBLISH: 'freigegeben',
  EXPORT: 'exportiert',
};

export default function EinheitAktivitaetenLog({ einheit }) {
  const einheitId = einheit?.id;

  // Objekte der Einheit sammeln (für Filter + sprechende Bezeichnungen).
  const { data: kontext } = useQuery({
    queryKey: ['einheit-aktivitaeten-kontext', einheitId],
    enabled: !!einheitId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [lernpakete, aufgaben] = await Promise.all([
        base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
        base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
      ]);
      const labels = new Map();
      labels.set(einheitId, `Einheit „${einheit?.titel_der_einheit || ''}"`);
      for (const p of lernpakete) labels.set(p.id, `Lernpaket „${p.titel_des_pakets || ''}"`);
      for (const a of aufgaben) labels.set(a.id, `Aufgabe „${a.titel || 'ohne Titel'}"`);
      return { ids: [...labels.keys()], labels };
    },
  });

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['einheit-aktivitaeten', einheitId, kontext?.ids?.length],
    enabled: !!kontext?.ids?.length,
    staleTime: 30 * 1000,
    queryFn: () =>
      base44.entities.AuditLog.filter(
        { resource_id: { $in: kontext.ids } },
        '-created_date',
        60
      ),
  });

  // Aufeinanderfolgende Einträge derselben Person am selben Objekt bündeln.
  const eintraege = useMemo(() => {
    const out = [];
    for (const l of logs) {
      const prev = out[out.length - 1];
      if (prev && prev.user_email === l.user_email && prev.resource_id === l.resource_id) continue;
      out.push(l);
      if (out.length >= 12) break;
    }
    return out;
  }, [logs]);

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-1.5">
          Letzte Aktivitäten
          <HelpBadge text="Zeigt, welche Lehrkraft wann in welchem Bereich dieser Einheit gearbeitet hat. Es wird bewusst nicht protokolliert, was inhaltlich geändert wurde." />
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Wer hat wann in dieser Einheit gearbeitet?
        </p>
      </div>

      <div className="space-y-2 p-5 rounded-xl border bg-card">
        {isLoading ? (
          <p className="text-sm text-muted-foreground flex items-center gap-2 py-4 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Lade Aktivitäten…
          </p>
        ) : eintraege.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
            Noch keine Aktivitäten protokolliert.
          </p>
        ) : (
          eintraege.map((l) => {
            const label = kontext?.labels?.get(l.resource_id) || l.resource_type;
            let zeit = '';
            try {
              zeit = format(new Date(l.created_date), 'dd. MMM yyyy, HH:mm', { locale: de });
            } catch { /* ignorieren */ }
            return (
              <div key={l.id} className="flex items-start gap-3 p-2.5 rounded-lg border bg-background">
                <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                  <History className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" title={label}>
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {l.user_email} · {ACTION_LABEL[l.action] || l.action?.toLowerCase()}
                  </p>
                </div>
                <span className="text-[11px] text-muted-foreground/70 shrink-0 whitespace-nowrap">
                  {zeit}
                </span>
              </div>
            );
          })
        )}
      </div>
    </>
  );
}