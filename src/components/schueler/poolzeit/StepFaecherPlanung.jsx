import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import PoolzeitStepShell from './PoolzeitStepShell';
import ZeitSlider from './ZeitSlider';
import Zeitleiste from './Zeitleiste';

/**
 * Schritt 2: Der Schüler verteilt seine Gesamtzeit auf Fächer.
 * - Fach anklicken → kleiner Slider erscheint → Block hinzufügen
 * - Zeitleiste visualisiert die Verteilung + Puffer
 * - Überbuchung wird verhindert (man kann nicht mehr verplanen als verfügbar)
 */
export default function StepFaecherPlanung({
  gesamtzeit,
  faecher,
  bloecke,
  setBloecke,
  onWeiter,
  onZurueck,
}) {
  const [aktivesFach, setAktivesFach] = useState(null);
  const [tempMinuten, setTempMinuten] = useState(20);

  // Die letzten Minuten der Poolzeit sind fest fürs Lerntagebuch reserviert
  // (Rückblick + Planung fürs nächste Mal) und können nicht verplant werden.
  const REFLEXION_MINUTEN = 3;
  const verplanbar = Math.max(0, gesamtzeit - REFLEXION_MINUTEN);
  const verplant = bloecke.reduce((s, b) => s + b.minuten, 0);
  const rest = verplanbar - verplant;

  // Schon verplante Fächer ausblenden
  const verfuegbareFaecher = faecher.filter((f) => !bloecke.some((b) => b.fachId === f.id));

  const blockHinzufuegen = () => {
    if (!aktivesFach) return;
    setBloecke([
      ...bloecke,
      { fachId: aktivesFach.id, name: aktivesFach.name, farbe: aktivesFach.farbe, minuten: tempMinuten },
    ]);
    setAktivesFach(null);
    setTempMinuten(20);
  };

  const blockEntfernen = (fachId) => {
    setBloecke(bloecke.filter((b) => b.fachId !== fachId));
  };

  const maxFuerSlider = Math.max(5, rest);

  return (
    <PoolzeitStepShell
      titel="Was möchtest du heute machen?"
      untertitel={`Wähle ein Fach und stell ein, wie lange du daran arbeiten willst. Die letzten ${REFLEXION_MINUTEN} Minuten gehören deinem Lerntagebuch – du kannst also ${verplanbar} Minuten verplanen.`}
      onWeiter={onWeiter}
      onZurueck={onZurueck}
      weiterDisabled={bloecke.length === 0}
    >
      <div className="flex flex-col gap-6 w-full">
        {/* Zeitleiste */}
        <Zeitleiste gesamtzeit={gesamtzeit} bloecke={bloecke} reserviertMinuten={REFLEXION_MINUTEN} />

        {/* Bereits geplante Blöcke */}
        {bloecke.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {bloecke.map((b) => (
              <span
                key={b.fachId}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium"
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: b.farbe || '#64748b' }} />
                {b.name} · {b.minuten} Min
                <button onClick={() => blockEntfernen(b.fachId)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Fach-Auswahl ODER Slider für gewähltes Fach */}
        {aktivesFach ? (
          <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-5">
            <p className="text-center font-semibold text-foreground">
              Wie viel Zeit für <span style={{ color: aktivesFach.farbe }}>{aktivesFach.name}</span>?
            </p>
            <ZeitSlider value={tempMinuten} onChange={setTempMinuten} min={5} max={maxFuerSlider} farbe={aktivesFach.farbe} />
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setAktivesFach(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={blockHinzufuegen}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                Hinzufügen
              </button>
            </div>
          </div>
        ) : (
          <>
            {rest <= 0 ? (
              <p className="text-center text-sm text-muted-foreground bg-muted/50 rounded-xl py-3">
                Deine Zeit ist komplett verplant – die letzten {REFLEXION_MINUTEN} Minuten gehören
                deinem Lerntagebuch. Du kannst Blöcke entfernen, um etwas zu ändern.
              </p>
            ) : (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Fach wählen ({rest} Min übrig)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {verfuegbareFaecher.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => {
                        setAktivesFach(f);
                        setTempMinuten(Math.min(20, maxFuerSlider));
                      }}
                      className="flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-medium hover:border-primary/40 hover:shadow-sm transition-all text-left"
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: f.farbe || '#64748b' }} />
                      <span className="truncate">{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </PoolzeitStepShell>
  );
}