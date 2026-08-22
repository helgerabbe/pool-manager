/**
 * GitHubExportCard.jsx
 *
 * Entkoppelter Export: schiebt die sechs MBK-Payloads und alle Materialien
 * der Einheit direkt in das GitHub-Repository der Schule
 * (IGS-Seevetal/Poolzeit, Branch main).
 *
 * Zielstruktur:  kurse/<slug>/payloads/   und   kurse/<slug>/material/
 *
 * Der Export ist jederzeit möglich (keine Freigabe nötig) und schreibt nur
 * das, was sich seit dem letzten Mal geändert hat (Delta).
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Loader2, Github, UploadCloud, ExternalLink } from 'lucide-react';
import { collectMediaEntries } from '@/lib/airGapMediaManifest';
import { useAirGapPayloads } from '@/hooks/useAirGapPayloads';
import GitHubDeltaAuswahl from '@/components/exportcenter/GitHubDeltaAuswahl';

export default function GitHubExportCard({ einheitId }) {
  const { payloads, ordnerSlug } = useAirGapPayloads(einheitId);
  const [running, setRunning] = useState(false);
  const [ergebnis, setErgebnis] = useState(null);
  const [vorschau, setVorschau] = useState(null);
  const [error, setError] = useState(null);

  const handlePush = async (modus = 'delta') => {
    if (!payloads) return;
    setRunning(true);
    setError(null);
    if (modus !== 'vorschau') setErgebnis(null);
    try {
      const media = collectMediaEntries(payloads.map((p) => p.content)).map((entry) => ({
        // filename kommt als "media/<datei>" — im Repo liegt es unter material/
        name: entry.filename.replace(/^media\//, ''),
        url: entry.url,
      }));

      const res = await base44.functions.invoke('pushEinheitToGithub', {
        einheitId,
        slug: ordnerSlug,
        payloads,
        media,
        modus,
      });
      if (modus === 'vorschau') {
        setVorschau(res.data);
      } else {
        setVorschau(null);
        setErgebnis(res.data);
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Export fehlgeschlagen.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-900/5 text-slate-800 shrink-0">
          <Github className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">Nach GitHub übergeben</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Schreibt alle Payloads und Materialien der Einheit nach{' '}
            <code className="bg-muted px-1 rounded text-[11px]">IGS-Seevetal/Poolzeit</code> (Branch{' '}
            <code className="bg-muted px-1 rounded text-[11px]">main</code>) unter{' '}
            <code className="bg-muted px-1 rounded text-[11px]">kurse/{ordnerSlug || '…'}/</code>.
            Jederzeit möglich – GitHub selbst vergleicht den Stand, du wählst anschließend, ob nur
            die Änderungen oder alles neu übertragen wird.
          </p>

          {vorschau && (
            <GitHubDeltaAuswahl
              vorschau={vorschau}
              running={running}
              onDelta={() => handlePush('delta')}
              onVoll={() => handlePush('voll')}
              onAbbrechen={() => setVorschau(null)}
            />
          )}

          {ergebnis && (
            <div className="mt-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 space-y-1">
              <p>
                {ergebnis.anzahl_geschrieben === 0
                  ? 'Keine Änderungen – das Repository ist bereits aktuell.'
                  : `${ergebnis.anzahl_geschrieben} Datei(en) übertragen, ${ergebnis.anzahl_unveraendert} unverändert.`}
              </p>
              {ergebnis.commit_url && (
                <a
                  href={ergebnis.commit_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 underline"
                >
                  Commit auf GitHub ansehen <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {ergebnis.medien_fehler?.length > 0 && (
                <p className="text-amber-700">
                  {ergebnis.medien_fehler.length} Material(ien) konnten nicht geladen werden:{' '}
                  {ergebnis.medien_fehler.map((m) => m.name).join(', ')}
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2 break-words">
              {error}
            </div>
          )}
        </div>
        <Button
          onClick={() => handlePush('vorschau')}
          disabled={!payloads || running || !!vorschau}
          className="gap-2 bg-slate-900 hover:bg-slate-800 shrink-0"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {running ? 'Prüfe …' : 'Nach GitHub übertragen'}
        </Button>
      </div>
    </div>
  );
}