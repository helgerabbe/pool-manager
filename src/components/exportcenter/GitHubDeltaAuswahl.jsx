/**
 * GitHubDeltaAuswahl.jsx
 *
 * Zeigt vor der Übergabe das von GitHub selbst berechnete Delta
 * (neue und geänderte Dateien) und lässt wählen:
 * nur das Delta übertragen ODER alles neu übertragen.
 */
import { Button } from '@/components/ui/button';
import { FilePlus2, FileDiff, UploadCloud, RefreshCw, Loader2 } from 'lucide-react';

function Liste({ icon: Icon, farbe, titel, pfade }) {
  if (!pfade?.length) return null;
  return (
    <div className="space-y-1">
      <p className={`text-xs font-semibold flex items-center gap-1.5 ${farbe}`}>
        <Icon className="w-3.5 h-3.5" />
        {titel} ({pfade.length})
      </p>
      <ul className="text-[11px] font-mono text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
        {pfade.map((p) => (
          <li key={p} className="truncate">{p}</li>
        ))}
      </ul>
    </div>
  );
}

export default function GitHubDeltaAuswahl({ vorschau, running, onDelta, onVoll, onAbbrechen }) {
  const anzahlDelta = (vorschau.neu?.length || 0) + (vorschau.geaendert?.length || 0);

  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3 space-y-3">
      <p className="text-xs text-muted-foreground">
        {anzahlDelta === 0
          ? 'GitHub meldet keine Unterschiede – das Repository ist bereits auf dem aktuellen Stand.'
          : `GitHub hat ${anzahlDelta} Datei(en) mit Unterschieden gefunden. ${vorschau.unveraendert?.length || 0} Datei(en) sind unverändert.`}
      </p>

      <div className="grid sm:grid-cols-2 gap-3">
        <Liste icon={FilePlus2} farbe="text-emerald-700" titel="Neu" pfade={vorschau.neu} />
        <Liste icon={FileDiff} farbe="text-amber-700" titel="Geändert" pfade={vorschau.geaendert} />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onDelta} disabled={running || anzahlDelta === 0} className="gap-2">
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          Nur Änderungen übertragen
        </Button>
        <Button size="sm" variant="outline" onClick={onVoll} disabled={running} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Alles neu übertragen
        </Button>
        <Button size="sm" variant="ghost" onClick={onAbbrechen} disabled={running}>
          Abbrechen
        </Button>
      </div>
    </div>
  );
}