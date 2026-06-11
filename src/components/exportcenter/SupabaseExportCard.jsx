import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Database, CheckCircle2, AlertCircle } from 'lucide-react';

/**
 * Export-Center-Karte: „Nach Supabase exportieren" (Phase 3 der Migration).
 *
 * Schreibt die ausgewählte Einheit inkl. aller Inhalte und KI-Snapshots in die
 * Supabase-Inhaltstabellen für den statischen Schüler-Build.
 * Wichtig: Vorher „Interne Inhalte erzeugen", damit alle KI-Snapshots
 * vorhanden sind – im Supabase-Modus gibt es keine Live-KI.
 */
export default function SupabaseExportCard({ einheitId }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleExport = async () => {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const res = await base44.functions.invoke('exportEinheitToSupabase', { einheitId });
      if (res?.data?.error) throw new Error(res.data.error);
      setResult(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || 'Export fehlgeschlagen.');
    } finally {
      setRunning(false);
    }
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
            KI-Snapshots) in die Supabase-Datenbank für die eigenständige Schüler-App.
            Vorher „Interne Inhalte erzeugen" ausführen, damit alle KI-Snapshots vorliegen.
          </p>

          {result && (
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Export erfolgreich: {result.counts?.lernpakete} Lernpakete,{' '}
                {result.counts?.aktivitaeten} Aktivitäten, {result.counts?.lernziele} Lernziele,{' '}
                {result.counts?.snapshots} KI-Snapshots übertragen.
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