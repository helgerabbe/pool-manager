import { useMemo, useState } from 'react';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';
import MaterialBlock, { MaterialIcon } from './MaterialBlock';
import { pruefeAntwort, loesungsText, istFrageVollstaendig } from '@/lib/materialaufgabe';

/**
 * Schüler-Aktivität „Materialaufgabe": ein Material (Text, Bild, Audio, Video,
 * PDF, Link) bleibt oben sichtbar, darunter werden die Fragen dazu beantwortet.
 * Die Auswertung ist deterministisch – nach „Antworten prüfen“ sieht der
 * Schüler pro Frage richtig/falsch samt Lösung.
 */
export default function MaterialaufgabeSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};
  const material = fv.material || {};
  const frageOptional = fv.fragen_im_material === true;
  const fragen = useMemo(
    () => (Array.isArray(fv.material_fragen) ? fv.material_fragen : [])
      .filter((f) => istFrageVollstaendig(f, { frageOptional })),
    [fv.material_fragen, frageOptional]
  );

  const [antworten, setAntworten] = useState({});
  const [geprueft, setGeprueft] = useState(false);

  const ergebnisse = useMemo(
    () => fragen.map((f) => (geprueft ? pruefeAntwort(f, antworten[f.id]) : null)),
    [fragen, antworten, geprueft]
  );
  const richtige = ergebnisse.filter((r) => r === true).length;
  const alleRichtig = fragen.length > 0 && richtige === fragen.length;

  const setAntwort = (id, wert) => setAntworten((prev) => ({ ...prev, [id]: wert }));

  const alleBeantwortet = fragen.every((f) => {
    const a = antworten[f.id];
    if (f.format === 'mehrfach') return Array.isArray(a) && a.length > 0;
    if (f.format === 'wahr_falsch') return typeof a === 'boolean';
    if (f.format === 'kurzantwort') return String(a || '').trim() !== '';
    return typeof a === 'number';
  });

  const nochmal = () => { setGeprueft(false); setAntworten({}); };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}

      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.aufgabentext || 'Sieh dir das Material an und beantworte die Fragen dazu.'}
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-5">
        {/* Material */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 text-blue-700 shrink-0">
              <MaterialIcon typ={material.material_typ || 'text'} className="w-4 h-4" />
            </span>
            <span className="text-sm font-semibold">Material</span>
          </div>
          <MaterialBlock material={material} />
        </section>

        {/* Fragen */}
        {fragen.length === 0 ? (
          fv.fragen_im_material === true ? null : (
            <p className="text-sm text-muted-foreground italic text-center py-6">
              Für diese Aufgabe sind noch keine Fragen hinterlegt.
            </p>
          )
        ) : (
          <section className="space-y-4">
            {fragen.map((frage, idx) => {
              const ergebnis = ergebnisse[idx];
              const antwort = antworten[frage.id];
              return (
                <div
                  key={frage.id}
                  className={cn(
                    'rounded-xl border p-4 space-y-3',
                    ergebnis === true ? 'border-emerald-300 bg-emerald-50/50'
                      : ergebnis === false ? 'border-rose-300 bg-rose-50/50'
                      : 'border-border bg-card'
                  )}
                >
                  <div className="flex items-start gap-2">
                    {ergebnis === true && <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />}
                    {ergebnis === false && <XCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />}
                    <p className="text-sm font-semibold leading-snug">
                      {idx + 1}. {String(frage.frage || '').trim() !== ''
                        ? frage.frage
                        : `Aufgabe ${idx + 1} aus dem Material`}
                    </p>
                  </div>

                  {/* Auswahl / Mehrfachauswahl */}
                  {(frage.format === 'auswahl' || frage.format === 'mehrfach') && (
                    <div className="space-y-2">
                      {(frage.optionen || []).map((opt, oIdx) => {
                        const gewaehlt = frage.format === 'mehrfach'
                          ? Array.isArray(antwort) && antwort.includes(oIdx)
                          : antwort === oIdx;
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            disabled={geprueft || busy}
                            onClick={() => {
                              if (frage.format === 'mehrfach') {
                                const aktuell = Array.isArray(antwort) ? antwort : [];
                                setAntwort(frage.id, aktuell.includes(oIdx)
                                  ? aktuell.filter((i) => i !== oIdx)
                                  : [...aktuell, oIdx]);
                              } else {
                                setAntwort(frage.id, oIdx);
                              }
                            }}
                            className={cn(
                              'w-full text-left rounded-lg border-2 px-3 py-2 text-sm transition-colors',
                              gewaehlt ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-card hover:border-primary/50',
                              geprueft && 'opacity-80'
                            )}
                          >
                            {opt.text}
                          </button>
                        );
                      })}
                      {frage.format === 'mehrfach' && (
                        <p className="text-xs text-muted-foreground">Mehrere Antworten möglich.</p>
                      )}
                    </div>
                  )}

                  {/* Richtig / Falsch */}
                  {frage.format === 'wahr_falsch' && (
                    <div className="grid grid-cols-2 gap-2">
                      {[true, false].map((val) => (
                        <button
                          key={String(val)}
                          type="button"
                          disabled={geprueft || busy}
                          onClick={() => setAntwort(frage.id, val)}
                          className={cn(
                            'rounded-lg border-2 px-3 py-2 text-sm transition-colors',
                            antwort === val ? 'border-primary bg-primary/5 font-medium' : 'border-border bg-card hover:border-primary/50'
                          )}
                        >
                          {val ? 'Richtig' : 'Falsch'}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Kurzantwort */}
                  {frage.format === 'kurzantwort' && (
                    <Input
                      value={typeof antwort === 'string' ? antwort : ''}
                      onChange={(e) => setAntwort(frage.id, e.target.value)}
                      placeholder="Deine Antwort …"
                      disabled={geprueft || busy}
                    />
                  )}

                  {/* Auswertung */}
                  {geprueft && (
                    <div className={cn(
                      'rounded-lg px-3 py-2 text-sm',
                      ergebnis ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    )}>
                      <p className="font-medium">
                        {ergebnis ? 'Richtig!' : `Richtige Antwort: ${loesungsText(frage)}`}
                      </p>
                      {frage.rueckmeldung && (
                        <p className="mt-1 text-xs leading-snug">{frage.rueckmeldung}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {geprueft && (
              <p className="text-center text-sm font-semibold text-foreground">
                {richtige} von {fragen.length} richtig
              </p>
            )}
          </section>
        )}
      </div>

      {/* Aktionen: links zurück, rechts Aktion */}
      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {fragen.length === 0 ? (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={onErledigt}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        ) : !geprueft ? (
          <Button className="gap-2" disabled={!alleBeantwortet || busy} onClick={() => setGeprueft(true)}>
            <CheckCircle2 className="w-4 h-4" /> Antworten prüfen
          </Button>
        ) : alleRichtig ? (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={onErledigt}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        ) : (
          <Button variant="outline" className="gap-2" onClick={nochmal} disabled={busy}>
            <RotateCcw className="w-4 h-4" /> Nochmal versuchen
          </Button>
        )}
      </div>
    </div>
  );
}