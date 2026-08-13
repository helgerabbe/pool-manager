/**
 * MaterialaufgabeModal.jsx
 *
 * Editor der Aktivität „Materialaufgabe": oben ein Material
 * (Text/Bild/Audio/Video/PDF/Link), darunter ein Satz eindeutig auswertbarer
 * Fragen dazu. Persistiert in field_values:
 *   { aufgabentext, material: {...}, material_fragen: [...] }
 */
import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Plus, Trash2, ChevronUp, ChevronDown, FileQuestion, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import ActivityResetButton from '@/components/workspace/ActivityResetButton';
import MaterialEditor from '@/components/workspace/materialaufgabe/MaterialEditor';
import FrageEditor from '@/components/workspace/materialaufgabe/FrageEditor';
import { EMPTY_MATERIAL, leereFrage, istFrageVollstaendig, istMaterialBefuellt } from '@/lib/materialaufgabe';

const MAX_FRAGEN = 10;

export default function MaterialaufgabeModal({
  open,
  onOpenChange,
  initialFieldValues = {},
  onSave,
  onCancel,
  onReset,
  isSaving = false,
  parentLernpaketName = '',
}) {
  const [aufgabentext, setAufgabentext] = useState('');
  const [material, setMaterial] = useState(EMPTY_MATERIAL);
  const [fragen, setFragen] = useState([]);
  const [fragenImMaterial, setFragenImMaterial] = useState(false);
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const fv = JSON.parse(JSON.stringify(initialFieldValues || {}));
      setAufgabentext(fv.aufgabentext || '');
      setMaterial({ ...EMPTY_MATERIAL, ...(fv.material || {}) });
      setFragen(Array.isArray(fv.material_fragen) ? fv.material_fragen : []);
      setFragenImMaterial(fv.fragen_im_material === true);
    }
    prevOpenRef.current = open;
  }, [open]);

  const updateFrage = (idx, next) => setFragen((prev) => prev.map((f, i) => (i === idx ? next : f)));
  const moveFrage = (from, to) => {
    if (to < 0 || to >= fragen.length) return;
    const next = [...fragen];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setFragen(next);
  };

  const handleSave = () => {
    const payload = {
      ...initialFieldValues,
      aufgabentext,
      material,
      material_fragen: fragen,
      fragen_im_material: fragenImMaterial,
    };
    if (initialFieldValues?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }
    onSave?.(payload);
  };

  const frageOpts = { frageOptional: fragenImMaterial };
  const vollstaendig = istMaterialBefuellt(material)
    && fragen.length > 0
    && fragen.every((f) => istFrageVollstaendig(f, frageOpts));

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel?.(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <FileQuestion className="w-5 h-5 text-primary" />
            Materialaufgabe bearbeiten
          </DialogTitle>
          {parentLernpaketName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Lernpaket: <span className="font-medium text-foreground/80">{parentLernpaketName}</span>
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">
          {/* Aufgabenstellung */}
          <div className="space-y-2">
            <Label>Aufgabenstellung</Label>
            <Textarea
              value={aufgabentext}
              onChange={(e) => setAufgabentext(e.target.value)}
              placeholder="z. B. „Höre den Text zweimal an und beantworte anschließend die Fragen.“"
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Material */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-4">
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">1 · Material</p>
            <MaterialEditor material={material} onChange={setMaterial} />
          </div>

          {/* Fragen */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-amber-900 uppercase tracking-wide">
                2 · Fragen &amp; Aufgaben zum Material ({fragen.length}/{MAX_FRAGEN})
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setFragen([...fragen, leereFrage()])}
                disabled={fragen.length >= MAX_FRAGEN}
                className="gap-1 text-xs h-7 border-amber-300 text-amber-800 hover:bg-amber-100"
              >
                <Plus className="w-3.5 h-3.5" /> {fragenImMaterial ? 'Aufgabe' : 'Frage'}
              </Button>
            </div>

            {/* Wahl: Fragen hier eingeben oder bereits im Material enthalten */}
            <div className="grid sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFragenImMaterial(false)}
                className={cn(
                  'text-left rounded-lg border-2 px-3 py-2 text-sm transition-colors',
                  !fragenImMaterial
                    ? 'border-amber-500 bg-white font-medium text-amber-900'
                    : 'border-amber-200 bg-white/60 text-muted-foreground hover:border-amber-300'
                )}
              >
                Fragen / Aufgaben hier eingeben
                <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                  Fragetext, Antwortformat und Lösungen werden hier gepflegt.
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFragenImMaterial(true)}
                className={cn(
                  'text-left rounded-lg border-2 px-3 py-2 text-sm transition-colors',
                  fragenImMaterial
                    ? 'border-amber-500 bg-white font-medium text-amber-900'
                    : 'border-amber-200 bg-white/60 text-muted-foreground hover:border-amber-300'
                )}
              >
                Aufgabenstellung ist im Material enthalten
                <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                  Kein Fragetext nötig – nur Antwortformat und Lösungen angeben.
                </span>
              </button>
            </div>

            {fragenImMaterial && (
              <p className="text-sm text-amber-900/80">
                Die Aufgabenstellungen stehen im Material. Lege für jede Aufgabe fest,
                in welchem Format die Schüler antworten und was die richtige Lösung ist.
              </p>
            )}

            {fragen.length === 0 && (
              <p className="text-sm text-muted-foreground italic">
                {fragenImMaterial
                  ? 'Noch keine Aufgaben. Füge für jede Aufgabe im Material einen Antwortblock hinzu.'
                  : 'Noch keine Fragen. Füge mindestens eine Frage hinzu.'}
              </p>
            )}

            {fragen.map((frage, idx) => (
              <div key={frage.id || idx} className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {fragenImMaterial ? 'Aufgabe' : 'Frage'} {idx + 1}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                      istFrageVollstaendig(frage, frageOpts)
                        ? 'bg-green-100 text-green-700 border-green-200'
                        : 'bg-amber-100 text-amber-700 border-amber-200'
                    )}>
                      {istFrageVollstaendig(frage, frageOpts) ? 'vollständig' : 'unvollständig'}
                    </span>
                    <button onClick={() => moveFrage(idx, idx - 1)} disabled={idx === 0} className="p-1 rounded hover:bg-muted disabled:opacity-30" title="Nach oben">
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => moveFrage(idx, idx + 1)} disabled={idx === fragen.length - 1} className="p-1 rounded hover:bg-muted disabled:opacity-30" title="Nach unten">
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setFragen(fragen.filter((_, i) => i !== idx))}
                      className="p-1 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
                      title="Frage entfernen"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <FrageEditor frage={frage} onChange={(next) => updateFrage(idx, next)} frageOptional={fragenImMaterial} />
              </div>
            ))}
          </div>

          <div className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-xs',
            vollstaendig
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-amber-200 bg-amber-50 text-amber-800'
          )}>
            {vollstaendig
              ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              : <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />}
            {vollstaendig
              ? (fragenImMaterial ? 'Material und alle Antwortblöcke sind vollständig.' : 'Material und alle Fragen sind vollständig.')
              : (fragenImMaterial
                ? 'Es fehlt noch etwas: Material hinterlegen und pro Aufgabe eine eindeutige Lösung angeben.'
                : 'Es fehlt noch etwas: Material hinterlegen und pro Frage eine eindeutige Lösung angeben.')}
          </div>
        </div>

        <DialogFooter className="gap-2 px-6 py-4 border-t shrink-0">
          <div className="flex items-center gap-2 mr-auto">
            {onReset && <ActivityResetButton onReset={onReset} disabled={isSaving} />}
          </div>
          <Button variant="outline" onClick={() => onCancel?.()} disabled={isSaving}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : <><Save className="w-4 h-4" /> Speichern</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}