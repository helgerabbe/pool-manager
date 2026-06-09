import { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

/**
 * Schüler-Anzeige des System-Bausteins „Einführung in das Themenfeld".
 *
 * Liest den Inhalt aus dem zentralen SchuelerInhaltSnapshot (Single Source of
 * Truth). Existiert noch kein Snapshot, kann der Schüler ihn übergangsweise
 * einmalig per Button erzeugen lassen (echte Funktion, kein Wegwerf-Code).
 * Schülernahe Darstellung: Titel, optionales Bild, kurze Abschnitte mit
 * Emojis als Strukturhilfe. Abschluss über „Verstanden".
 */
export default function ThemenfeldEinfuehrungSeite({
  einheitId,
  lerntyp,
  item,            // Pfad-Item ({ instance_id, ref_id, ... })
  sektor,          // zugehöriger Sektor (für themenfeld_id)
  meta,            // Anzeige-Meta (Titel-Fallback)
  erledigt,
  busy,
  onErledigt,
}) {
  const [inhalt, setInhalt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);

  const themenfeldId = sektor?.themenfeld_id || null;

  const fetchSnapshot = useCallback(async ({ force = false } = {}) => {
    setError(null);
    const res = await base44.functions.invoke('getOrCreateThemenfeldEinfuehrung', {
      einheitId,
      lerntyp,
      instanceId: item.instance_id,
      themenfeldId,
      force,
    });
    return res?.data?.inhalt || null;
  }, [einheitId, lerntyp, item.instance_id, themenfeldId]);

  // Beim Öffnen: nur LESEN (kein erzwungenes Generieren). Die Backend-Funktion
  // generiert beim ersten Aufruf automatisch, wenn kein Snapshot da ist –
  // daher rufen wir sie ohne `force` auf und zeigen währenddessen einen Spinner.
  useEffect(() => {
    let abort = false;
    setLoading(true);
    setInhalt(null);
    // Erst still prüfen, ob ein Snapshot existiert – nur lesen, nicht generieren.
    base44.entities.SchuelerInhaltSnapshot
      .filter({ einheit_id: einheitId, lerntyp, instance_id: item.instance_id })
      .then((list) => {
        if (abort) return;
        const snap = Array.isArray(list) ? list[0] : null;
        setInhalt(snap?.inhalt || null);
      })
      .catch(() => { if (!abort) setInhalt(null); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, [einheitId, lerntyp, item.instance_id]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const neu = await fetchSnapshot({ force: false });
      setInhalt(neu);
    } catch (_e) {
      setError('Der Inhalt konnte nicht erstellt werden. Bitte versuche es später noch einmal.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Kopf */}
      <div className="flex items-center gap-3 mb-4">
        <span className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary shrink-0">
          <BookOpen className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Einführung</p>
          <h1 className="text-lg font-bold text-foreground tracking-tight truncate">
            {inhalt?.titel || meta?.titel || 'Einführung in das Themenfeld'}
          </h1>
        </div>
      </div>

      {/* Inhalt */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {loading ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : !inhalt ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-4 p-6">
            <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-accent/10 text-accent">
              <Sparkles className="w-7 h-7" />
            </span>
            <p className="text-sm text-muted-foreground max-w-xs">
              Diese Einführung wurde noch nicht erstellt. Lass sie dir jetzt von der KI vorbereiten.
            </p>
            {error && <p className="text-sm text-destructive max-w-xs">{error}</p>}
            <Button onClick={handleGenerate} disabled={generating} className="gap-2">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {generating ? 'Wird erstellt …' : 'KI-Inhalt jetzt erstellen'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 pb-2">
            {inhalt.bild_url && (
              <img
                src={inhalt.bild_url}
                alt=""
                className="w-full max-h-52 object-cover rounded-2xl border border-border"
              />
            )}
            {inhalt.intro && (
              <p className="text-base font-medium text-foreground leading-relaxed">{inhalt.intro}</p>
            )}
            <div className="space-y-2.5">
              {(inhalt.abschnitte || []).map((a, i) => (
                <div key={i} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3.5">
                  <span className="text-2xl leading-none shrink-0">{a.emoji || '•'}</span>
                  <div className="min-w-0">
                    {a.ueberschrift && (
                      <p className="text-sm font-semibold text-foreground">{a.ueberschrift}</p>
                    )}
                    {a.text && <p className="text-sm text-muted-foreground leading-relaxed">{a.text}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Aktion */}
      {inhalt && (
        <div className="pt-5 shrink-0">
          {erledigt ? (
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-emerald-600">
              <CheckCircle2 className="w-5 h-5" /> Verstanden
            </div>
          ) : (
            <Button
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              disabled={busy}
              onClick={onErledigt}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Verstanden
            </Button>
          )}
        </div>
      )}
    </div>
  );
}