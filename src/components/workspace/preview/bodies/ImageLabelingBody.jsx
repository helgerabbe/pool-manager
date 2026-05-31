/**
 * ImageLabelingBody.jsx
 *
 * Interaktive Schüler-Vorschau für "Bildbeschriftung".
 * Drag & Drop: Begriff aus dem Wortspeicher auf eine Stelle (Drop-Zone)
 * im Bild ziehen. Alternativ Klick: Begriff anwählen, dann Zone anklicken.
 * Erneuter Klick auf eine belegte Zone gibt den Begriff zurück.
 */
import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

export default function ImageLabelingBody({ fieldValues = {} }) {
  const bg = fieldValues.backgroundImage;
  const zones = useMemo(
    () => (Array.isArray(fieldValues.dropZones) ? fieldValues.dropZones.filter(z => z?.label) : []),
    [JSON.stringify(fieldValues.dropZones)]
  );
  const distractors = useMemo(
    () => (Array.isArray(fieldValues.distractors) ? fieldValues.distractors : [])
      .map(d => (typeof d === 'string' ? d : d?.value || ''))
      .filter(Boolean),
    [JSON.stringify(fieldValues.distractors)]
  );

  // Wortspeicher: alle Ziel-Labels + Distraktoren, einmal gemischt.
  const pool = useMemo(() => {
    const terms = [...zones.map(z => z.label), ...distractors];
    return terms
      .map((t, i) => ({ id: `${t}__${i}`, label: t }))
      .sort(() => Math.random() - 0.5);
  }, [zones, distractors]);

  const [assignments, setAssignments] = useState({}); // zoneIdx -> itemId
  const [selected, setSelected] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const itemById = (id) => pool.find(p => p.id === id);
  const assignedIds = Object.values(assignments);
  const remaining = pool.filter(p => !assignedIds.includes(p.id));

  // Begriff (per Klick oder Drop) auf eine Zone legen.
  const assignToZone = (zoneIdx, itemId) => {
    if (submitted || !itemId) return;
    setAssignments(prev => {
      const n = { ...prev };
      for (const k of Object.keys(n)) if (n[k] === itemId) delete n[k];
      n[zoneIdx] = itemId;
      return n;
    });
    setSelected(null);
  };

  const handleZoneClick = (zoneIdx) => {
    if (submitted) return;
    if (assignments[zoneIdx]) {
      setAssignments(prev => { const n = { ...prev }; delete n[zoneIdx]; return n; });
      return;
    }
    if (selected) assignToZone(zoneIdx, selected);
  };

  const correctCount = zones.reduce((acc, z, idx) => {
    const it = itemById(assignments[idx]);
    return acc + (it && it.label === z.label ? 1 : 0);
  }, 0);
  const allPlaced = zones.length > 0 && zones.every((_, idx) => assignments[idx]);

  const reset = () => { setAssignments({}); setSelected(null); setSubmitted(false); };

  if (!bg) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <p className="text-sm text-slate-500 italic">Für diese Bildbeschriftung ist noch kein Bild hinterlegt.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {fieldValues.aufgabenstellung && (
        <div className="px-5 pt-4 shrink-0">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-[14px] text-blue-900">
            {fieldValues.aufgabenstellung}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-5 py-3 flex items-start justify-center">
        <div className="relative inline-block max-w-full">
          <img src={bg} alt="Bildbeschriftung" draggable="false" className="max-w-full h-auto rounded-lg select-none" style={{ maxHeight: 360 }} />
          {zones.map((zone, idx) => {
            const it = itemById(assignments[idx]);
            const isCorrect = submitted && it && it.label === zone.label;
            const isWrong = submitted && it && it.label !== zone.label;
            return (
              <button
                key={idx}
                onClick={() => handleZoneClick(idx)}
                onDragOver={(e) => { if (!submitted) e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData('text/plain') || dragId;
                  assignToZone(idx, id);
                  setDragId(null);
                }}
                disabled={submitted}
                className={`absolute border-2 rounded-lg flex items-center justify-center backdrop-blur-sm shadow-sm transition-all ${
                  isCorrect ? 'border-emerald-500 bg-emerald-50/70'
                  : isWrong ? 'border-red-500 bg-red-50/70'
                  : it ? 'border-blue-500 bg-white/60'
                  : (selected || dragId) ? 'border-dashed border-blue-500 bg-white/40 hover:bg-blue-50/60 cursor-pointer'
                  : 'border-dashed border-slate-400/70 bg-white/30'
                }`}
                style={{
                  left: `${zone.x_percent ?? 50}%`,
                  top: `${zone.y_percent ?? 50}%`,
                  width: `${zone.width ?? 150}px`,
                  height: `${zone.height ?? 50}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={it ? 'Klicken, um zurückzulegen' : 'Begriff hier ablegen'}
              >
                {it ? (
                  <span className="px-2 py-1 rounded-md shadow-md text-xs font-bold text-white bg-blue-600 line-clamp-2 text-center max-w-[calc(100%-8px)] inline-flex items-center gap-1">
                    {submitted && (isCorrect ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />)}
                    {it.label}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-500 font-medium">?</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Wortspeicher + Aktionen */}
      <div className="border-t border-slate-200 px-5 py-3 shrink-0 space-y-3 bg-slate-50">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Wortspeicher:</p>
          <div className="flex flex-wrap gap-2 min-h-[36px]">
            {remaining.map(p => (
              <button
                key={p.id}
                draggable={!submitted}
                onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', p.id); setDragId(p.id); }}
                onDragEnd={() => setDragId(null)}
                onClick={() => !submitted && setSelected(selected === p.id ? null : p.id)}
                disabled={submitted}
                className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all select-none ${
                  selected === p.id
                    ? 'bg-blue-600 text-white border-blue-700 ring-2 ring-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:border-blue-400 cursor-grab active:cursor-grabbing'
                }`}
              >
                {p.label}
              </button>
            ))}
            {remaining.length === 0 && (
              <span className="text-xs text-slate-400 italic self-center">Alle Begriffe platziert.</span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {submitted ? (
            <span className={`text-sm font-semibold ${correctCount === zones.length ? 'text-emerald-700' : 'text-slate-700'}`}>
              {correctCount} von {zones.length} richtig
            </span>
          ) : (
            <span className="text-xs text-slate-500">Begriff auf eine Stelle im Bild ziehen (oder anklicken).</span>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Zurücksetzen
            </Button>
            {!submitted && (
              <Button size="sm" disabled={!allPlaced} onClick={() => setSubmitted(true)} className="gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Auswerten
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}