import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';

/** Fisher-Yates-Shuffle (stabil genug für UI-Zwecke). */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Schüler-Aktivität „Bildbeschriftung" (Übungs-Phase).
 *
 * Touch-freundliches Tap-Tap-Prinzip (wie Lückentext): Der Schüler tippt
 * zuerst einen Begriff aus der Wortbank an und dann den nummerierten Marker
 * im Bild (oder umgekehrt). Distraktoren erhöhen die Schwierigkeit.
 * Prüfen markiert richtige/falsche Zuordnungen; falsche können korrigiert
 * werden, richtige bleiben stehen.
 */
export default function BildBeschriftungSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};

  const zonen = useMemo(
    () => (Array.isArray(fv.dropZones) ? fv.dropZones : [])
      .filter((z) => z?.label?.trim())
      .map((z, i) => ({ ...z, id: `zone-${i}` })),
    [fv.dropZones]
  );

  // Wortbank: korrekte Begriffe + Distraktoren, gemischt.
  const begriffe = useMemo(() => {
    const korrekt = zonen.map((z) => z.label);
    const distraktoren = (Array.isArray(fv.distractors) ? fv.distractors : []).filter(Boolean);
    return shuffle([...korrekt, ...distraktoren]);
  }, [zonen, fv.distractors]);

  // zuordnung: { [zoneId]: begriff }
  const [zuordnung, setZuordnung] = useState({});
  const [aktiverBegriff, setAktiverBegriff] = useState(null);
  const [aktiveZoneId, setAktiveZoneId] = useState(null);
  const [geprueft, setGeprueft] = useState(false);

  const vergebeneBegriffe = Object.values(zuordnung);
  const alleBelegt = zonen.length > 0 && zonen.every((z) => zuordnung[z.id]);
  const alleRichtig = geprueft && zonen.every((z) => zuordnung[z.id] === z.label);

  const istZoneRichtig = (z) => zuordnung[z.id] === z.label;

  // Begriff einer Zone zuweisen (zentrale Stelle für beide Richtungen).
  const zuweisen = (zoneId, begriff) => {
    setZuordnung((prev) => {
      const next = { ...prev };
      // Begriff ggf. von anderer Zone entfernen (jeder Begriff nur 1x).
      for (const k of Object.keys(next)) if (next[k] === begriff) delete next[k];
      next[zoneId] = begriff;
      return next;
    });
    setAktiverBegriff(null);
    setAktiveZoneId(null);
    setGeprueft(false);
  };

  // Begriff in der Wortbank antippen.
  const begriffTap = (begriff) => {
    if (geprueft && alleRichtig) return;
    if (aktiveZoneId) {
      // Richtung 2: Zone war zuerst gewählt → Begriff direkt zuweisen.
      zuweisen(aktiveZoneId, begriff);
    } else {
      setAktiverBegriff((prev) => (prev === begriff ? null : begriff));
    }
  };

  // Marker / Legenden-Zeile antippen.
  const zoneTap = (zone) => {
    if (geprueft && alleRichtig) return;
    if (geprueft && istZoneRichtig(zone)) return; // richtige bleiben fixiert
    if (aktiverBegriff) {
      // Richtung 1: Begriff war zuerst gewählt → in diese Zone legen.
      zuweisen(zone.id, aktiverBegriff);
    } else if (zuordnung[zone.id]) {
      // Belegte Zone ohne aktiven Begriff: Zuordnung wieder lösen.
      setZuordnung((prev) => {
        const next = { ...prev };
        delete next[zone.id];
        return next;
      });
      setAktiveZoneId(null);
      setGeprueft(false);
    } else {
      // Richtung 2: leere Zone aktivieren, danach Begriff antippen.
      setAktiveZoneId((prev) => (prev === zone.id ? null : zone.id));
    }
  };

  const pruefen = () => setGeprueft(true);

  // Nur falsche Zuordnungen lösen, richtige behalten.
  const falscheKorrigieren = () => {
    setZuordnung((prev) => {
      const next = {};
      zonen.forEach((z) => {
        if (prev[z.id] === z.label) next[z.id] = prev[z.id];
      });
      return next;
    });
    setGeprueft(false);
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}

      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.aufgabenstellung || fv.instruction || 'Ordne die Begriffe den richtigen Stellen im Bild zu. Tippe zuerst einen Begriff an und dann den passenden Punkt im Bild.'}
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-4">
        {zonen.length === 0 || !fv.backgroundImage ? (
          <p className="text-sm text-muted-foreground italic text-center py-10">
            Für diese Bildbeschriftung sind noch keine Inhalte hinterlegt.
          </p>
        ) : (
          <>
            {/* Wortbank */}
            <div className="flex flex-wrap gap-2">
              {begriffe.map((b) => {
                const vergeben = vergebeneBegriffe.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    disabled={vergeben}
                    onClick={() => begriffTap(b)}
                    className={cn(
                      'px-3 py-1.5 rounded-full border-2 text-sm font-medium transition-colors',
                      vergeben && 'opacity-30 border-border bg-muted text-muted-foreground line-through',
                      !vergeben && aktiverBegriff === b
                        ? 'border-primary bg-primary text-primary-foreground'
                        : !vergeben && aktiveZoneId
                        ? 'border-amber-400 bg-amber-50 hover:border-amber-500'
                        : !vergeben && 'border-border bg-card hover:border-primary/60'
                    )}
                  >
                    {b}
                  </button>
                );
              })}
            </div>

            {/* Bild mit nummerierten Markern */}
            <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
              <img
                src={fv.backgroundImage}
                alt="Bild zur Beschriftung"
                className="w-full h-auto block select-none"
                draggable={false}
              />
              {zonen.map((z, i) => {
                const belegt = !!zuordnung[z.id];
                const richtig = geprueft && istZoneRichtig(z);
                const falsch = geprueft && belegt && !istZoneRichtig(z);
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => zoneTap(z)}
                    style={{ left: `${z.x_percent}%`, top: `${z.y_percent}%` }}
                    className={cn(
                      'absolute -translate-x-1/2 -translate-y-1/2 min-w-[28px] h-7 px-1.5 rounded-full border-2 shadow-md',
                      'flex items-center justify-center text-xs font-bold transition-colors',
                      richtig ? 'bg-emerald-500 border-emerald-600 text-white'
                        : falsch ? 'bg-rose-500 border-rose-600 text-white'
                        : aktiveZoneId === z.id ? 'bg-amber-400 border-amber-500 text-amber-950 ring-4 ring-amber-300/60'
                        : belegt ? 'bg-primary border-primary text-primary-foreground'
                        : aktiverBegriff ? 'bg-amber-400 border-amber-500 text-amber-950 animate-pulse'
                        : 'bg-card border-primary text-primary'
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            {/* Legende: Nummer → zugeordneter Begriff */}
            <div className="space-y-1.5">
              {zonen.map((z, i) => {
                const belegt = !!zuordnung[z.id];
                const richtig = geprueft && istZoneRichtig(z);
                const falsch = geprueft && belegt && !istZoneRichtig(z);
                return (
                  <button
                    key={z.id}
                    type="button"
                    onClick={() => zoneTap(z)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg border-2 px-3 py-2 text-sm text-left transition-colors',
                      richtig ? 'border-emerald-300 bg-emerald-50'
                        : falsch ? 'border-rose-300 bg-rose-50'
                        : aktiveZoneId === z.id ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300/60'
                        : belegt ? 'border-primary/40 bg-primary/5'
                        : aktiverBegriff ? 'border-amber-300 bg-amber-50'
                        : 'border-border bg-card'
                    )}
                  >
                    <span className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                      richtig ? 'bg-emerald-500 text-white'
                        : falsch ? 'bg-rose-500 text-white'
                        : 'bg-primary/10 text-primary'
                    )}>
                      {i + 1}
                    </span>
                    {belegt ? (
                      <span className="font-medium text-foreground">{zuordnung[z.id]}</span>
                    ) : (
                      <span className="text-muted-foreground italic">
                        {aktiverBegriff ? 'Hier ablegen' : aktiveZoneId === z.id ? 'Wähle jetzt einen Begriff' : 'Noch frei'}
                      </span>
                    )}
                    {richtig && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-auto shrink-0" />}
                    {falsch && <XCircle className="w-4 h-4 text-rose-500 ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Feedback nach dem Prüfen */}
            {geprueft && (
              <div className={cn(
                'rounded-xl px-4 py-3 text-sm font-medium',
                alleRichtig
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              )}>
                {alleRichtig
                  ? 'Super! Alle Begriffe sitzen an der richtigen Stelle. 🎉'
                  : 'Noch nicht ganz – die rot markierten Stellen stimmen nicht. Korrigiere sie und prüfe nochmal.'}
              </div>
            )}
          </>
        )}
      </div>

      {/* Aktionen: links zurück, rechts Aktion */}
      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {alleRichtig ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={busy}
            onClick={onErledigt}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        ) : geprueft ? (
          <Button variant="outline" className="gap-2" onClick={falscheKorrigieren}>
            <RotateCcw className="w-4 h-4" /> Falsche korrigieren
          </Button>
        ) : (
          <Button className="gap-2" disabled={!alleBelegt} onClick={pruefen}>
            <CheckCircle2 className="w-4 h-4" /> Prüfen
          </Button>
        )}
      </div>
    </div>
  );
}