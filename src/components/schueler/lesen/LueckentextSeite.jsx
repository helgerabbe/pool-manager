import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, RotateCcw } from 'lucide-react';
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
 * Schüler-Aktivität „Lückentext".
 *
 * Datenquelle: field_values.lueckentext (Lücken als [Wort]),
 * field_values.distraktoren (falsche Wörter im Schüttelkasten).
 *
 * Interaktion (iPad-tauglich, ohne echtes HTML5-Drag):
 *  1. Wort in der Wortbank antippen → Wort ist „aufgenommen" (hervorgehoben).
 *  2. Lücke antippen → Wort wird eingesetzt.
 *  3. Gefüllte Lücke antippen → Wort wandert zurück in die Wortbank.
 *
 * Design-Konventionen wie in den übrigen Schüler-Aktivitäten:
 *  - kein Header (Phase/Titel kommt aus der Navigation),
 *  - blauer Aufgabenstellungs-Anker oben, Wortbank darunter,
 *  - Text scrollfrei auf einer Seite (300-Wort-Limit im Editor),
 *  - unten zwei Buttons: „Zurück zum Lernpaket" / „Prüfen" → „Erledigt".
 *  - master-aware via `masterHinweis` (Aufgabe x von y).
 */
export default function LueckentextSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};
  const rawText = fv.lueckentext || '';

  // Text in Segmente zerlegen: Lücken ([Wort]) und normale Textstücke.
  // Jede Lücke ist POSITIONAL (gleiches Wort kann mehrfach vorkommen).
  const { segmente, gaps } = useMemo(() => {
    const parts = rawText.split(/(\[[^\]]+\])/g).filter((p) => p.length > 0);
    const segs = [];
    const gapList = [];
    parts.forEach((part) => {
      const m = part.match(/^\[([^\]]+)\]$/);
      if (m) {
        const gapId = `g-${gapList.length}`;
        gapList.push({ id: gapId, antwort: m[1] });
        segs.push({ type: 'gap', gapId });
      } else {
        segs.push({ type: 'text', text: part });
      }
    });
    return { segmente: segs, gaps: gapList };
  }, [rawText]);

  // Wortbank: jede Lücken-Antwort als eigener Chip + Distraktoren, gemischt.
  const bankChips = useMemo(() => {
    const richtige = gaps.map((g, i) => ({ id: `w-${i}`, text: g.antwort }));
    const distraktoren = (Array.isArray(fv.distraktoren) ? fv.distraktoren : [])
      .filter((d) => typeof d === 'string' && d.trim())
      .map((d, i) => ({ id: `d-${i}`, text: d }));
    return mischen([...richtige, ...distraktoren]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gaps, fv.distraktoren]);

  // belegung: { [gapId]: chipId } — chips sind 1:1 verbraucht.
  const [belegung, setBelegung] = useState({});
  const [aktiverChip, setAktiverChip] = useState(null);
  const [geprueft, setGeprueft] = useState(false);

  const chipById = useMemo(() => new Map(bankChips.map((c) => [c.id, c])), [bankChips]);
  const verbrauchteChips = useMemo(() => new Set(Object.values(belegung)), [belegung]);

  const waehleChip = (chipId) => {
    if (geprueft || verbrauchteChips.has(chipId)) return;
    setAktiverChip((cur) => (cur === chipId ? null : chipId));
  };

  const tippeLuecke = (gapId) => {
    if (geprueft) return;
    setBelegung((prev) => {
      const next = { ...prev };
      if (next[gapId]) {
        // Gefüllte Lücke → Wort zurück in die Bank.
        delete next[gapId];
        return next;
      }
      if (aktiverChip) {
        next[gapId] = aktiverChip;
      }
      return next;
    });
    if (aktiverChip && !belegung[gapId]) setAktiverChip(null);
  };

  const alleGefuellt = gaps.length > 0 && gaps.every((g) => belegung[g.id]);
  const istRichtig = (g) => chipById.get(belegung[g.id])?.text === g.antwort;
  const alleRichtig = gaps.length > 0 && gaps.every(istRichtig);

  // Nochmal versuchen: richtige Lücken bleiben stehen, falsche werden geleert.
  const nochmalVersuchen = () => {
    setBelegung((prev) => {
      const next = {};
      gaps.forEach((g) => {
        if (prev[g.id] && chipById.get(prev[g.id])?.text === g.antwort) next[g.id] = prev[g.id];
      });
      return next;
    });
    setAktiverChip(null);
    setGeprueft(false);
  };

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full px-5 py-4">
      {/* Master-Hinweis bei sequenziellen Aufgaben: „Aufgabe x von y". */}
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}

      {/* Aufgabenstellung – einheitlicher blauer Anker. */}
      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.instruction || 'Tippe ein Wort in der Wortbank an und dann auf die passende Lücke im Text.'}
      </AufgabenstellungBox>

      {gaps.length === 0 ? (
        <div className="flex-1 min-h-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground italic text-center">
            Für diese Aktivität ist noch kein Lückentext hinterlegt.
          </p>
        </div>
      ) : (
        <>
          {/* Wortbank – kompakte Chips, verbrauchte Wörter werden ausgeblendet. */}
          <div className="shrink-0 mb-3 rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-blue-700 mr-1">
                Wortbank
              </span>
              {bankChips.map((chip) => {
                const verbraucht = verbrauchteChips.has(chip.id);
                if (verbraucht) {
                  return (
                    <span
                      key={chip.id}
                      className="px-2.5 py-1 rounded-lg border border-dashed border-blue-200 text-xs text-blue-300 select-none"
                    >
                      {chip.text}
                    </span>
                  );
                }
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => waehleChip(chip.id)}
                    disabled={geprueft}
                    className={cn(
                      'px-2.5 py-1 rounded-lg border text-xs sm:text-sm font-medium shadow-sm transition-all',
                      aktiverChip === chip.id
                        ? 'border-primary bg-primary text-primary-foreground scale-105'
                        : 'border-blue-300 bg-white text-blue-800 hover:border-primary/60 hover:-translate-y-0.5'
                    )}
                  >
                    {chip.text}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Lückentext – füllt die restliche Höhe, kompakter Zeilenabstand,
              damit der Text (max. 300 Wörter) ohne Scrollen auf die Seite passt.
              overflow als Sicherheitsnetz für sehr kleine Bildschirme. */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-sm leading-[2.1] text-foreground">
              {segmente.map((seg, i) => {
                if (seg.type === 'text') return <span key={i}>{seg.text}</span>;
                const gap = gaps.find((g) => g.id === seg.gapId);
                const chip = belegung[gap.id] ? chipById.get(belegung[gap.id]) : null;
                const richtig = geprueft && chip && chip.text === gap.antwort;
                const falsch = geprueft && chip && chip.text !== gap.antwort;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => tippeLuecke(gap.id)}
                    disabled={geprueft}
                    className={cn(
                      'inline-flex items-center justify-center align-baseline mx-0.5 px-2 rounded-md border-2 text-xs sm:text-sm font-semibold transition-colors min-w-[4.5rem] h-6 leading-none',
                      !chip && !aktiverChip && 'border-dashed border-slate-300 bg-slate-50 text-transparent',
                      !chip && aktiverChip && 'border-dashed border-primary bg-primary/5 text-transparent animate-pulse',
                      chip && !geprueft && 'border-primary/40 bg-primary/5 text-primary',
                      richtig && 'border-emerald-300 bg-emerald-50 text-emerald-700',
                      falsch && 'border-rose-300 bg-rose-50 text-rose-700 line-through'
                    )}
                  >
                    {chip ? chip.text : '·'}
                  </button>
                );
              })}
            </p>

            {/* Feedback nach dem Prüfen */}
            {geprueft && (
              <div className={cn(
                'mt-3 rounded-xl px-4 py-2.5 text-sm font-medium text-center',
                alleRichtig ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
              )}>
                {alleRichtig
                  ? 'Super! Alle Lücken richtig gefüllt. 🎉'
                  : 'Noch nicht ganz – die rot markierten Lücken stimmen noch nicht. Versuch es nochmal!'}
              </div>
            )}
          </div>
        </>
      )}

      {/* Aktionen: links zurück, rechts grün */}
      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {!geprueft ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={!alleGefuellt}
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
          <Button variant="outline" className="gap-2" onClick={nochmalVersuchen}>
            <RotateCcw className="w-4 h-4" /> Nochmal versuchen
          </Button>
        )}
      </div>
    </div>
  );
}