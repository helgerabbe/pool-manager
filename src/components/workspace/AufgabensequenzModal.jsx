/**
 * AufgabensequenzModal.jsx
 *
 * Modal für die Bearbeitung der Aktivität „Aufgabensequenz".
 * Enthält einen zweispaltigen Editor (links Schritte-Liste, rechts Editor)
 * – identisch zum SequenzBuilder der AllgemeinenAufgaben, aber in der
 * Tab-5-Optik und mit field_values-Persistenz.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Loader2, Save, Plus, Trash2, GripVertical, FileText, ListChecks, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import ActivityResetButton from '@/components/workspace/ActivityResetButton';

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const EMPTY_MATERIAL = { material_typ: 'text', inhalt: '', url: '', datei_url: '', beschreibung: '', transkript: '' };
const EMPTY_AUFGABE = { aufgabenstellung: '', input_erforderlich: true, musterloesung: '' };
const MATERIAL_TYPEN = [
  { value: 'text', label: 'Text' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'bild', label: 'Bild' },
  { value: 'pdf', label: 'PDF' },
  { value: 'link', label: 'Link' },
];

// ── Schritt-Editor (rechte Seite) ──────────────────────────────────────
function SchrittEditor({ schritt, onChange }) {
  if (schritt.typ === 'material') {
    const mat = schritt.material || {};
    const setMat = (field, val) => onChange({ ...schritt, titel: schritt.titel, material: { ...mat, [field]: val } });
    const brauchtInhalt = mat.material_typ === 'text';
    const brauchtUrl = mat.material_typ === 'video' || mat.material_typ === 'audio' || mat.material_typ === 'link';
    const brauchtDatei = mat.material_typ === 'bild' || mat.material_typ === 'pdf';

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Material-Typ</Label>
          <Select value={mat.material_typ || 'text'} onValueChange={(v) => setMat('material_typ', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MATERIAL_TYPEN.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Kurzbeschreibung</Label>
          <Input
            value={mat.beschreibung || ''}
            onChange={(e) => setMat('beschreibung', e.target.value)}
            placeholder="z.B. 'Quelle A: Rede von ...'"
          />
        </div>

        {brauchtInhalt && (
          <div className="space-y-2">
            <Label>Text-Inhalt</Label>
            <Textarea
              value={mat.inhalt || ''}
              onChange={(e) => setMat('inhalt', e.target.value)}
              placeholder="Text hier eingeben oder einfuegen..."
              className="min-h-[120px]"
            />
          </div>
        )}

        {brauchtUrl && (
          <>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={mat.url || ''}
                onChange={(e) => setMat('url', e.target.value)}
                placeholder="https://..."
              />
            </div>
            {(mat.material_typ === 'video' || mat.material_typ === 'audio') && (
              <div className="space-y-2">
                <Label>Transkript (für KI-Kontext)</Label>
                <Textarea
                  value={mat.transkript || ''}
                  onChange={(e) => setMat('transkript', e.target.value)}
                  placeholder="Transkript des Audio-/Videoinhalts für die KI-Nutzung …"
                  className="min-h-[80px]"
                />
              </div>
            )}
          </>
        )}

        {brauchtDatei && (
          <div className="space-y-2">
            <Label>Datei-URL</Label>
            <Input
              value={mat.datei_url || ''}
              onChange={(e) => setMat('datei_url', e.target.value)}
              placeholder="URL der hochgeladenen Datei..."
            />
          </div>
        )}
      </div>
    );
  }

  const auf = schritt.aufgabe || {};
  const setAuf = (field, val) => onChange({ ...schritt, titel: schritt.titel, aufgabe: { ...auf, [field]: val } });

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Aufgabenstellung</Label>
        <Textarea
          value={auf.aufgabenstellung || ''}
          onChange={(e) => setAuf('aufgabenstellung', e.target.value)}
          placeholder="Was sollen die Schueler in diesem Schritt tun?"
          className="min-h-[120px]"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="input_erf"
          checked={auf.input_erforderlich !== false}
          onChange={(e) => setAuf('input_erforderlich', e.target.checked)}
          className="w-4 h-4 rounded border-border"
        />
        <Label htmlFor="input_erf" className="text-sm cursor-pointer">
          Schueler muss Texteingabe machen
        </Label>
      </div>
      <div className="space-y-2">
        <Label>Musterlösung (optional – wird dem Schüler nach Abgabe angezeigt)</Label>
        <Textarea
          value={auf.musterloesung || ''}
          onChange={(e) => setAuf('musterloesung', e.target.value)}
          placeholder="Was wäre die richtige Antwort? Leer lassen, wenn keine Musterlösung nötig ist."
          className="min-h-[100px]"
        />
      </div>
    </div>
  );
}

// ── Schritt-Kachel (linke Liste) ──────────────────────────────────────
function SchrittKachel({ schritt, index, total, isSelected, onSelect, onDelete, onMoveUp, onMoveDown }) {
  const istMaterial = schritt.typ === 'material';
  const Icon = istMaterial ? FileText : ListChecks;
  const label = istMaterial ? 'Material' : 'Aufgabe';
  const color = istMaterial ? 'border-blue-200 bg-blue-50/50' : 'border-amber-200 bg-amber-50/50';
  const activeColor = istMaterial ? 'border-blue-400 bg-blue-100 ring-1 ring-blue-300' : 'border-amber-400 bg-amber-100 ring-1 ring-amber-300';

  return (
    <div
      className={cn('flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer', isSelected ? activeColor : color)}
      onClick={() => onSelect(schritt)}
    >
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="text-xs font-medium flex-1 truncate">{index + 1}. {label}</span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(index); }} disabled={index === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30" title="Nach oben">
          <ChevronUp className="w-3 h-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(index); }} disabled={index === total - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30" title="Nach unten">
          <ChevronDown className="w-3 h-3" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(index); }} className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600" title="Entfernen">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ───────────────────────────────────────────────────
export default function AufgabensequenzModal({
  open,
  onOpenChange,
  catalogEntry,
  initialFieldValues = {},
  onSave,
  onCancel,
  onReset,
  isSaving = false,
  parentLernpaketName = '',
}) {
  const [fieldValues, setFieldValues] = useState(initialFieldValues);
  const [schritte, setSchritte] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const prevOpenRef = useRef(false);

  // Nur beim ÖFFNEN des Modals initialisieren – NICHT bei jedem
  // Hintergrund-Refetch des Parents (initialFieldValues ist bei jedem
  // Render ein neues Objekt und würde die Eingaben überschreiben).
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      const fv = JSON.parse(JSON.stringify(initialFieldValues || {}));
      setFieldValues(fv);
      const raw = Array.isArray(fv.sequenz_schritte) ? [...fv.sequenz_schritte] : [];
      setSchritte(raw);
      setSelectedIndex(raw.length > 0 ? 0 : -1);
    }
    prevOpenRef.current = open;
  }, [open]);

  const addMaterial = useCallback(() => {
    const neu = { id: uid(), typ: 'material', reihenfolge: schritte.length, titel: '', material: { ...EMPTY_MATERIAL } };
    const updated = [...schritte, neu];
    setSchritte(updated);
    setSelectedIndex(updated.length - 1);
  }, [schritte]);

  const addAufgabe = useCallback(() => {
    const neu = { id: uid(), typ: 'aufgabe', reihenfolge: schritte.length, titel: '', aufgabe: { ...EMPTY_AUFGABE } };
    const updated = [...schritte, neu];
    setSchritte(updated);
    setSelectedIndex(updated.length - 1);
  }, [schritte]);

  const deleteSchritt = useCallback((index) => {
    const updated = schritte.filter((_, i) => i !== index).map((s, i) => ({ ...s, reihenfolge: i }));
    setSchritte(updated);
    if (selectedIndex >= updated.length) setSelectedIndex(Math.max(0, updated.length - 1));
  }, [schritte, selectedIndex]);

  const moveSchritt = useCallback((from, to) => {
    if (from === to || from < 0 || to < 0 || from >= schritte.length || to >= schritte.length) return;
    const updated = [...schritte];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    setSchritte(updated.map((s, i) => ({ ...s, reihenfolge: i })));
    setSelectedIndex(to);
  }, [schritte]);

  const updateSchritt = useCallback((index, updatedSchritt) => {
    setSchritte((prev) => prev.map((s, i) => (i === index ? updatedSchritt : s)));
  }, []);

  const handleSave = () => {
    const payload = {
      ...fieldValues,
      sequenz_schritte: schritte,
    };
    if (initialFieldValues?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }
    onSave?.(payload);
  };

  const selectedSchritt = schritte[selectedIndex] || null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel?.(); }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-emerald-700" />
            Aufgabensequenz bearbeiten
          </DialogTitle>
          {parentLernpaketName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Lernpaket: <span className="font-medium text-foreground/80">{parentLernpaketName}</span>
            </p>
          )}
        </DialogHeader>

        {/* Aufgabenstellung (global) */}
        <div className="shrink-0 px-6 py-3 border-b bg-muted/20">
          <Label className="mb-1.5 block">Aufgabenstellung (für die gesamte Sequenz)</Label>
          <Textarea
            value={fieldValues.aufgabentext || ''}
            onChange={(e) => setFieldValues(prev => ({ ...prev, aufgabentext: e.target.value }))}
            placeholder="Beschreibe, was die Schüler in dieser Sequenz insgesamt tun sollen …"
            rows={2}
            className="w-full resize-none"
          />
        </div>

        {/* Two-Column Editor */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {/* Linke Spalte: Schritte-Liste */}
          <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-muted/20 flex flex-col shrink-0 overflow-hidden h-48 lg:h-full min-h-0">
            <div className="shrink-0 flex gap-1.5 px-3 py-2 border-b">
              <Button size="sm" variant="outline" onClick={addMaterial} className="flex-1 gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
                <FileText className="w-3.5 h-3.5" /> + Material
              </Button>
              <Button size="sm" variant="outline" onClick={addAufgabe} className="flex-1 gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50">
                <ListChecks className="w-3.5 h-3.5" /> + Aufgabe
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {schritte.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Fügen Sie Material und Aufgaben hinzu.
                </p>
              ) : (
                schritte.map((s, i) => (
                  <SchrittKachel
                    key={s.id}
                    schritt={s}
                    index={i}
                    total={schritte.length}
                    isSelected={selectedIndex === i}
                    onSelect={() => setSelectedIndex(i)}
                    onDelete={deleteSchritt}
                    onMoveUp={(idx) => moveSchritt(idx, idx - 1)}
                    onMoveDown={(idx) => moveSchritt(idx, idx + 1)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Rechte Spalte: Schritt-Editor */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="flex-1 overflow-y-auto p-6">
              {selectedSchritt ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-3 border-b">
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                      selectedSchritt.typ === 'material'
                        ? 'bg-blue-100 text-blue-700 border border-blue-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200'
                    )}>
                      {selectedSchritt.typ === 'material' ? 'Material' : 'Aufgabe'} #{selectedIndex + 1}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Schritt {selectedIndex + 1} von {schritte.length}
                    </span>
                  </div>
                  <SchrittEditor schritt={selectedSchritt} onChange={(updated) => updateSchritt(selectedIndex, updated)} />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <Eye className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {schritte.length === 0 ? 'Fügen Sie links einen Schritt hinzu.' : 'Wählen Sie links einen Schritt aus.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
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