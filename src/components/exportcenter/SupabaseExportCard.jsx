import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Database, CheckCircle2, AlertCircle, Clock, Send } from 'lucide-react';
import moment from 'moment';

/**
 * Export-Center-Karte: „Nach Supabase exportieren".
 *
 * Schreibt die ausgewählte Einheit inkl. aller Inhalte und KI-Snapshots
 * in die Supabase-Inhaltstabellen. Nach erfolgreichem Export wird der
 * Zeitstempel auf der Einheit aktualisiert und hier angezeigt.
 *
 * Zeigt außerdem an, wann der letzte Export abgeschlossen und die Einheit
 * wieder freigegeben wurde (export_published_at).
 */
export default function SupabaseExportCard({ einheitId }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const queryClient = useQueryClient();

  const { data: einheit } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: () => base44.entities.Einheiten.get(einheitId),
    enabled: !!einheitId,
  });

  const handleExport = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke('exportEinheitToSupabase', { einheitId });
      if (res?.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      // Zeitstempel wird serverseitig in exportEinheitToSupabase aktualisiert.
      queryClient.invalidateQueries({ queryKey: ['einheit', einheitId] });
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Export fehlgeschlagen.');
    } finally {
      setRunning(false);
    }
  };

  const lastExportDate = einheit?.last_exported_at || null;
  const lastPublishedDate = einheit?.export_published_at || null;

  const formatTs = (iso) => {
    if (!iso) return null;
    const m = moment(iso);
    if (!m.isValid()) return null;
    const now = moment();
    if (m.isSame(now, 'day')) return `Heute, ${m.format('HH:mm')} Uhr`;
    if (m.isSame(now.clone().subtract(1, 'day'), 'day')) return `Gestern, ${m.format('HH:mm')} Uhr`;
    return m.format('DD.MM.YYYY, HH:mm') + ' Uhr';
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
          <Database className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Nach Supabase exportieren</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Überträgt diese Einheit (Struktur, Lernpakete, Aktivitäten, Lernziele,
            KI-Snapshots, MBK-Prompts) in die Supabase-Datenbank für die eigenständige Schüler-App.
          </p>

          {/* Zeitstempel-Info */}
          {(lastExportDate || lastPublishedDate) && (
            <div className="mt-3 space-y-1.5">
              {lastExportDate && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Database className="w-3 h-3 shrink-0" />
                  <span>Letzter Supabase-Export: <span className="font-medium text-foreground">{formatTs(lastExportDate)}</span></span>
                </div>
              )}
              {lastPublishedDate && (
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Send className="w-3 h-3 shrink-0" />
                  <span>Export beendet &amp; freigegeben: <span className="font-medium text-foreground">{formatTs(lastPublishedDate)}</span></span>
                </div>
              )}
              {lastExportDate && !lastPublishedDate && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600">
                  <Clock className="w-3 h-3 shrink-0" />
                  <span>Export wurde noch nicht als beendet bestätigt.</span>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Export erfolgreich: {result.counts?.lernpakete} Lernpakete,{' '}
                {result.counts?.aktivitaeten} Aktivitäten, {result.counts?.lernziele} Lernziele,{' '}
                {result.counts?.snapshots} KI-Snapshots, {result.counts?.global_prompts || 0} Global-Prompts,{' '}
                {result.counts?.export_prompts || 0} Export-Prompts übertragen.
              </span>
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
        <Button
          onClick={handleExport}
          disabled={running}
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 shrink-0"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
          {running ? 'Exportiert …' : 'Exportieren'}
        </Button>
      </div>
    </div>
  );
}