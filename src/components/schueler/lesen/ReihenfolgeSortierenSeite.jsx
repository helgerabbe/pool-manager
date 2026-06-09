import { useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { CheckCircle2, Loader2, ArrowLeft, GripVertical, RotateCcw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';

/** Fisher-Yates Shuffle, der sicherstellt, dass die Startreihenfolge nicht der Lösung entspricht. */
function mischen(items) {
  if (items.length < 2) return [...items];
  let gemischt;
  let versuche = 0;
  do {
    gemischt = [...items];
    for (let i = gemischt.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [gemischt[i], gemischt[j]] = [gemischt[j], gemischt[i]];
    }
    versuche++;
  } while (gemischt.every((el, i) => el.text === items[i].text) && versuche < 10);
  return gemischt;
}

/**
 * Schüler-Aktivität „Reihenfolge / Sortierung".
 *
 * Deterministisch: Die korrekte Reihenfolge ist im Editor festgelegt
 * (field_values.orderedItems). Der Schüler bekommt die Elemente gemischt und
 * bringt sie per Drag&Drop in die richtige Reihenfolge. Bewusst auf max. 8
 * Elemente begrenzt – große Karten, gut lesbar, scrollfrei auf dem Tablet.
 */
export default function ReihenfolgeSortierenSeite({ aktivitaet, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};

  // Korrekte Reihenfolge als stabile Karten-Objekte (mit ursprünglichem Index).
  const loesung = useMemo(
    () => (Array.isArray(fv.orderedItems) ? fv.orderedItems : [])
      .map((t, i) => ({ id: `karte-${i}`, text: t, korrekt: i })),
    [fv.orderedItems]
  );

  const [karten, setKarten] = useState(() => mischen(loesung));
  const [geprueft, setGeprueft] = useState(false);

  const alleRichtig = karten.length > 0 && karten.every((k, i) => k.korrekt === i);

  const handleDragEnd = (result) => {
    if (!result.destination || geprueft) return;
    const neu = [...karten];
    const [moved] = neu.splice(result.source.index, 1);
    neu.splice(result.destination.index, 0, moved);
    setKarten(neu);
  };

  const neuMischen = () => {
    setKarten(mischen(loesung));
    setGeprueft(false);
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Aufgabenstellung – einheitlicher blauer Anker mit Icon. */}
      <AufgabenstellungBox className="mb-4 shrink-0">
        {fv.instruction || 'Bringe die Elemente in die richtige Reihenfolge.'}
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="space-y-4 pb-2">
          {karten.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-10">
              Für diese Aktivität sind noch keine Elemente hinterlegt.
            </p>
          ) : (
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="sortier-liste">
                {(provided) => (
                  <ul ref={provided.innerRef} {...provided.droppableProps} className="space-y-2.5">
                    {karten.map((karte, idx) => {
                      const istKorrekt = geprueft && karte.korrekt === idx;
                      const istFalsch = geprueft && karte.korrekt !== idx;
                      return (
                        <Draggable key={karte.id} draggableId={karte.id} index={idx} isDragDisabled={geprueft}>
                          {(prov, snap) => (
                            <li
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              className={cn(
                                'flex items-center gap-3 rounded-xl border-2 px-4 py-3.5 bg-card transition-colors select-none',
                                snap.isDragging && 'shadow-lg border-primary bg-primary/5',
                                !geprueft && 'border-border',
                                istKorrekt && 'border-emerald-300 bg-emerald-50',
                                istFalsch && 'border-rose-300 bg-rose-50'
                              )}
                            >
                              {/* Positionsnummer */}
                              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0">
                                {idx + 1}
                              </span>
                              {/* Text – groß & gut lesbar */}
                              <span className="flex-1 text-base font-medium text-foreground leading-snug">
                                {karte.text}
                              </span>
                              {/* Status oder Drag-Griff */}
                              {geprueft ? (
                                istKorrekt
                                  ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                  : <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                              ) : (
                                <span
                                  {...prov.dragHandleProps}
                                  className="text-muted-foreground cursor-grab active:cursor-grabbing shrink-0"
                                >
                                  <GripVertical className="w-5 h-5" />
                                </span>
                              )}
                            </li>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          )}

          {/* Feedback nach dem Prüfen */}
          {geprueft && (
            <div className={cn(
              'rounded-xl px-4 py-3 text-sm font-medium text-center',
              alleRichtig ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
            )}>
              {alleRichtig
                ? 'Super! Alles in der richtigen Reihenfolge. 🎉'
                : 'Noch nicht ganz richtig – schau dir die rot markierten Karten an und versuch es nochmal.'}
            </div>
          )}
        </div>
      </div>

      {/* Aktionen: links zurück, rechts grün */}
      <div className="pt-5 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {!geprueft ? (
          <Button
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            disabled={karten.length < 2}
            onClick={() => setGeprueft(true)}
          >
            <CheckCircle2 className="w-4 h-4" /> Reihenfolge prüfen
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
          <Button variant="outline" className="gap-2" onClick={neuMischen}>
            <RotateCcw className="w-4 h-4" /> Nochmal versuchen
          </Button>
        )}
      </div>
    </div>
  );
}