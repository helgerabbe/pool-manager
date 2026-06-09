import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';

/** Fisher-Yates Shuffle. */
function mischen(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Schüler-Aktivität „Begriffe zuordnen".
 *
 * Deterministisch & scrollfrei: Die Begriffspaare (left ↔ right) sind im Editor
 * festgelegt (field_values.pairs, max. 8). Optionale Distraktoren erweitern die
 * Antwortspalte. Der Schüler wählt links einen Begriff, dann rechts die passende
 * Antwort – die Zuordnung wird als Verbindung dargestellt. „Prüfen" markiert
 * richtig/falsch.
 *
 * Design-Konventionen wie in den drei bisherigen Schüler-Aktivitäten:
 *  - kein Header (Phase/Titel kommt aus der Navigation),
 *  - blauer Aufgabenstellungs-Anker oben,
 *  - unten genau zwei Buttons: links „Zurück zum Lernpaket", rechts „Prüfen".
 *  - master-aware via `masterHinweis` (Aufgabe x von y).
 */
export default function BegriffeZuordnenSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};

  // Stabile Begriffe (links) und Antworten (rechts inkl. Distraktoren).
  const begriffe = useMemo(
    () => (Array.isArray(fv.pairs) ? fv.pairs : [])
      .filter((p) => p?.left?.trim() && p?.right?.trim())
      .map((p, i) => ({ id: `b-${i}`, text: p.left, antwort: p.right })),
    [fv.pairs]
  );

  // Antwort-Spalte: korrekte Antworten + Distraktoren, einmalig gemischt.
  const antworten = useMemo(() => {
    const korrekte = begriffe.map((b, i) => ({ id: `a-${i}`, text: b.antwort }));
    const distraktoren = (Array.isArray(fv.distractors) ? fv.distractors : [])
      .map((d) => (typeof d === 'string' ? d : d?.value || ''))
      .filter((t) => t.trim())
      .map((t, i) => ({ id: `d-${i}`, text: t }));
    return mischen([...korrekte, ...distraktoren]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [begriffe, fv.distractors]);

  // zuordnung: { [begriffId]: antwortText }
  const [zuordnung, setZuordnung] = useState({});
  const [aktiverBegriff, setAktiverBegriff] = useState(null);
  const [geprueft, setGeprueft] = useState(false);

  const belegteAntworten = useMemo(() => new Set(Object.values(zuordnung)), [zuordnung]);

  const waehleBegriff = (id) => {
    if (geprueft) return;
    setAktiverBegriff((cur) => (cur === id ? null : id));
  };

  const waehleAntwort = (text) => {
    if (geprueft || !aktiverBegriff) return;
    setZuordnung((prev) => {
      const next = { ...prev };
      // Falls diese Antwort woanders belegt war: dort entfernen (1:1-Zuordnung).
      for (const k of Object.keys(next)) if (next[k] === text) delete next[k];
      next[aktiverBegriff] = text;
      return next;
    });
    setAktiverBegriff(null);
  };

  const alleZugeordnet = begriffe.length > 0 && begriffe.every((b) => zuordnung[b.id]);
  const alleRichtig = begriffe.length > 0 && begriffe.every((b) => zuordnung[b.id] === b.antwort);

  const reset = () => {
    setZuordnung({});
    setAktiverBegriff(null);
    setGeprueft(false);
  };

  const statusFor = (b) => {
    if (!geprueft) return 'neutral';
    return zuordnung[b.id] === b.antwort ? 'richtig' : 'falsch';
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {/* Master-Hinweis bei sequenziellen Aufgaben: „Aufgabe x von y". */}
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}

      {/* Aufgabenstellung – einheitlicher blauer Anker. */}
      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.instruction || 'Tippe links auf einen Begriff und dann rechts auf die passende Antwort.'}
      </AufgabenstellungBox>

      {/* Zuordnungs-Bereich – scrollbar, damit auch viele Paare/Distraktoren
          nie unten aus dem Bildschirm laufen. Kompakte Karten (kleine Schrift,
          wenig Padding), damit möglichst viel auf eine Seite passt. */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {begriffe.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-10">
            Für diese Aktivität sind noch keine Begriffspaare hinterlegt.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2 content-start">
            {/* Linke Spalte: Begriffe */}
            <div className="space-y-1.5">
              {begriffe.map((b) => {
                const status = statusFor(b);
                const aktiv = aktiverBegriff === b.id;
                const zugeordnet = zuordnung[b.id];
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => waehleBegriff(b.id)}
                    disabled={geprueft}
                    className={cn(
                      'w-full text-left rounded-lg border-2 px-2.5 py-1.5 transition-colors',
                      'flex flex-col gap-0.5',
                      status === 'neutral' && (aktiv ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'),
                      status === 'richtig' && 'border-emerald-300 bg-emerald-50',
                      status === 'falsch' && 'border-rose-300 bg-rose-50'
                    )}
                  >
                    <span className="text-xs sm:text-sm font-semibold text-foreground leading-tight">{b.text}</span>
                    {zugeordnet && (
                      <span className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-medium leading-tight',
                        status === 'falsch' ? 'text-rose-600' : status === 'richtig' ? 'text-emerald-700' : 'text-primary'
                      )}>
                        {status === 'richtig' && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                        {status === 'falsch' && <XCircle className="w-3 h-3 shrink-0" />}
                        → {zugeordnet}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Rechte Spalte: Antworten (inkl. Distraktoren) */}
            <div className="space-y-1.5">
              {antworten.map((a) => {
                const belegt = belegteAntworten.has(a.text);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => waehleAntwort(a.text)}
                    disabled={geprueft || !aktiverBegriff}
                    className={cn(
                      'w-full text-left rounded-lg border-2 px-2.5 py-1.5 text-xs sm:text-sm text-foreground leading-tight transition-colors',
                      belegt ? 'border-border bg-muted/60 text-muted-foreground' : 'border-border bg-card',
                      !geprueft && aktiverBegriff && 'hover:border-primary/50 hover:bg-primary/5'
                    )}
                  >
                    {a.text}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Feedback nach dem Prüfen */}
        {geprueft && (
          <div className={cn(
            'mt-4 rounded-xl px-4 py-3 text-sm font-medium text-center',
            alleRichtig ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
          )}>
            {alleRichtig
              ? 'Super! Alle Begriffe richtig zugeordnet. 🎉'
              : 'Noch nicht ganz – schau dir die rot markierten Zuordnungen an und versuch es nochmal.'}
          </div>
        )}
      </div>

      {/* Aktionen: links zurück, rechts grün */}
      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {!geprueft ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={!alleZugeordnet}
            onClick={() => setGeprueft(true)}
          >
            <CheckCircle2 className="w-4 h-4" /> Prüfen
          </Button>
        ) : alleRichtig ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        ) : (
          <Button variant="outline" className="gap-2" onClick={reset}>
            <RotateCcw className="w-4 h-4" /> Nochmal versuchen
          </Button>
        )}
      </div>
    </div>
  );
}