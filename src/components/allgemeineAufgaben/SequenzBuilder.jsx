/**
 * SequenzBuilder.jsx
 *
 * Editor fuer Aufgabensequenzen: Schachtelsystem zum Erstellen einer
 * mehrschrittigen Aufgabe (Material + Aufgaben in fester Reihenfolge).
 *
 * Linke Seite: Liste der Schritte mit Drag/Reorder.
 * Rechte Seite: Editor fuer den ausgewaehlten Schritt.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createAllgemeineAufgabe, updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Save, Loader2, Plus, Trash2, GripVertical, FileText, ListChecks, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { toast } from 'sonner';

// Generiere eine einfache ID ohne externe Abhaengigkeit.
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

const EMPTY_MATERIAL = { material_typ: 'text', inhalt: '', url: '', datei_url: '', beschreibung: '', transkript: '' };
const EMPTY_AUFGABE = { aufgabenstellung: '', input_erforderlich: true };

const MATERIAL_TYPEN = [
  { value: 'text', label: 'Text' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'bild', label: 'Bild' },
  { value: 'pdf', label: 'PDF' },
  { value: 'link', label: 'Link' },
];

// Leeres Default-Material ohne URL/Datei-Felder (nur fuer den Editor).
function defaultMaterial(typ) {
  return { ...EMPTY_MATERIAL, material_typ: typ || 'text' };
}

// ── Schritt-Editor (rechte Seite) ──────────────────────────────────────────

function SchrittEditor({ schritt, onChange }) {
  if (schritt.typ === 'material') {
    const mat = schritt.material || {};
    const setMat = (field, val) => onChange({ ...schritt, titel: schritt.titel, material: { ...mat, [field]: val } });

    const brauchtInhalt = mat.material_typ === 'text';
    const brauchtUrl = mat.material_typ === 'video' || mat.material_typ === 'audio' || mat.material_typ === 'link';
    const brauchtDatei = mat.material_typ === 'bild' || mat.material_typ === 'pdf';
    const brauchtTranskript = mat.material_typ === 'video' || mat.material_typ === 'audio';

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

        {brauchtTranskript ? (
          <div className="space-y-2">
            <Label>Transkript</Label>
            <Textarea
              value={mat.transkript || ''}
              onChange={(e) => setMat('transkript', e.target.value)}
              placeholder="Gesprochener Inhalt des Videos/Audios als Text – damit Brian den Schülern helfen kann..."
              className="min-h-[100px]"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Kurzbeschreibung (fuer Sie)</Label>
            <Input
              value={mat.beschreibung || ''}
              onChange={(e) => setMat('beschreibung', e.target.value)}
              placeholder="z.B. 'Quelle A: Rede von ...'"
            />
          </div>
        )}

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
          <div className="space-y-2">
            <Label>URL</Label>
            <Input
              value={mat.url || ''}
              onChange={(e) => setMat('url', e.target.value)}
              placeholder="https://..."
            />
          </div>
        )}

        {brauchtDatei && (
          <div className="space-y-2">
            <Label>Datei-URL (nach Upload)</Label>
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

  // typ === 'aufgabe'
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
          id="input_erforderlich"
          checked={auf.input_erforderlich !== false}
          onChange={(e) => setAuf('input_erforderlich', e.target.checked)}
          className="w-4 h-4 rounded border-border"
        />
        <Label htmlFor="input_erforderlich" className="text-sm cursor-pointer">
          Schueler muss Texteingabe machen
        </Label>
      </div>
    </div>
  );
}

// ── Schritt-Kachel (linke Liste) ──────────────────────────────────────────

function SchrittKachel({ schritt, index, total, isSelected, onSelect, onDelete, onMoveUp, onMoveDown }) {
  const istMaterial = schritt.typ === 'material';
  const Icon = istMaterial ? FileText : ListChecks;
  const label = istMaterial ? 'Material' : 'Aufgabe';
  const color = istMaterial
    ? 'border-blue-200 bg-blue-50/50'
    : 'border-amber-200 bg-amber-50/50';
  const activeColor = istMaterial
    ? 'border-blue-400 bg-blue-100 ring-1 ring-blue-300'
    : 'border-amber-400 bg-amber-100 ring-1 ring-amber-300';

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer',
        isSelected ? activeColor : color
      )}
      onClick={() => onSelect(schritt)}
    >
      <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 cursor-grab" />
      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="text-xs font-medium flex-1 truncate">
        {index + 1}. {label}
      </span>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={(e) => { e.stopPropagation(); onMoveUp(index); }}
          disabled={index === 0}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
          title="Nach oben"
        >
          <ChevronUp className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onMoveDown(index); }}
          disabled={index === total - 1}
          className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
          title="Nach unten"
        >
          <ChevronDown className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(index); }}
          className="p-0.5 rounded hover:bg-red-100 text-muted-foreground hover:text-red-600"
          title="Entfernen"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Haupt-Komponente ───────────────────────────────────────────────────────

export default function SequenzBuilder({
  open,
  onOpenChange,
  einheitId,
  themenfelder = [],
  onSuccess,
  initialData = null,
  defaultAnforderungsebene = '2 - Transfer',
}) {
  const queryClient = useQueryClient();
  const [schritte, setSchritte] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [titel, setTitel] = useState('');
  const [themenfeldId, setThemenfeldId] = useState(null);

  // Form bei Oeffnen initialisieren
  useEffect(() => {
    if (!open) return;
    if (initialData && initialData.aufgaben_modus === 'sequenz') {
      setTitel(initialData.titel || '');
      setThemenfeldId(initialData.themenfeld_id || null);
      const raw = initialData.sequenz_schritte || [];
      setSchritte(raw.length > 0 ? [...raw] : []);
      setSelectedIndex(raw.length > 0 ? 0 : -1);
    } else {
      setTitel('');
      setThemenfeldId(null);
      setSchritte([]);
      setSelectedIndex(-1);
    }
  }, [open, initialData]);

  const addMaterial = useCallback(() => {
    const neu = { id: uid(), typ: 'material', reihenfolge: schritte.length, titel: '', material: defaultMaterial('text') };
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
    else if (selectedIndex === index) setSelectedIndex(Math.min(selectedIndex, updated.length - 1));
  }, [schritte, selectedIndex]);

  const moveSchritt = useCallback((from, to) => {
    if (from === to || from < 0 || to < 0 || from >= schritte.length || to >= schritte.length) return;
    const updated = [...schritte];
    const [moved] = updated.splice(from, 1);
    updated.splice(to, 0, moved);
    const renumbered = updated.map((s, i) => ({ ...s, reihenfolge: i }));
    setSchritte(renumbered);
    setSelectedIndex(to);
  }, [schritte]);

  const updateSchritt = useCallback((index, updatedSchritt) => {
    setSchritte((prev) => prev.map((s, i) => (i === index ? updatedSchritt : s)));
  }, []);

  // Validierung: mindestens 1 Schritt, jeder Schritt mit Inhalt
  const isComplete = schritte.length > 0 && schritte.every((s) => {
    if (s.typ === 'material') {
      const m = s.material || {};
      if (m.material_typ === 'text') return !!m.inhalt?.trim();
      if (m.material_typ === 'video' || m.material_typ === 'audio' || m.material_typ === 'link') return !!m.url?.trim();
      if (m.material_typ === 'bild' || m.material_typ === 'pdf') return !!m.datei_url?.trim();
      return false;
    }
    return !!(s.aufgabe?.aufgabenstellung?.trim());
  });

  // Mutationen
  const createSeq = useMutation({
    mutationFn: () =>
      createAllgemeineAufgabe({
        einheit_id: einheitId,
        anforderungsebene: defaultAnforderungsebene,
        aufgaben_typ: 'inhalt',
        aufgaben_modus: 'sequenz',
        themenfeld_id: themenfeldId || null,
        titel: titel || null,
        sequenz_schritte: schritte,
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Aufgabensequenz erstellt!');
      onSuccess?.(result);
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  });

  const updateSeq = useMutation({
    mutationFn: () =>
      updateAllgemeineAufgabe(initialData.id, {
        themenfeld_id: themenfeldId || null,
        titel: titel || null,
        sequenz_schritte: schritte,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Aufgabensequenz aktualisiert');
      onSuccess?.();
      onOpenChange(false);
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  });

  const handleSave = () => {
    if (schritte.length === 0) { toast.error('Fuegen Sie mindestens einen Schritt hinzu.'); return; }
    if (!isComplete) { toast.error('Bitte fuellen Sie alle Schritte vollstaendig aus.'); return; }
    if (initialData) updateSeq.mutate();
    else createSeq.mutate();
  };

  const isSaving = createSeq.isPending || updateSeq.isPending;
  const selectedSchritt = schritte[selectedIndex] || null;
  const istUpdate = !!initialData;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-emerald-700" />
            {istUpdate ? 'Aufgabensequenz bearbeiten' : 'Neue Aufgabensequenz'}
          </DialogTitle>
        </DialogHeader>

        {/* ── Two-Column Layout ── */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">

          {/* Linke Spalte: Schritte-Liste */}
          <div className="w-full lg:w-72 border-b lg:border-b-0 lg:border-r border-border bg-muted/20 flex flex-col shrink-0 overflow-hidden h-48 lg:h-full min-h-0">
            {/* Titel + Themenfeld */}
            <div className="shrink-0 px-3 py-3 space-y-2 border-b">
              <Input
                value={titel}
                onChange={(e) => setTitel(e.target.value)}
                placeholder="Titel der Sequenz (optional)"
                className="h-8 text-sm"
              />
              {themenfelder.length > 0 && (
                <select
                  value={themenfeldId || ''}
                  onChange={(e) => setThemenfeldId(e.target.value || null)}
                  className="w-full h-8 px-2 border border-border rounded-md text-xs bg-white"
                >
                  <option value="">-- Themenfeld --</option>
                  {themenfelder.map((tf) => (
                    <option key={tf.id} value={tf.id}>{tf.titel}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Buttons */}
            <div className="shrink-0 flex gap-1.5 px-3 py-2 border-b">
              <Button size="sm" variant="outline" onClick={addMaterial} className="flex-1 gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50">
                <FileText className="w-3.5 h-3.5" /> + Material
              </Button>
              <Button size="sm" variant="outline" onClick={addAufgabe} className="flex-1 gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50">
                <ListChecks className="w-3.5 h-3.5" /> + Aufgabe
              </Button>
            </div>

            {/* Schritte-Liste */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {schritte.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-8">
                  Fuegen Sie Material und Aufgaben hinzu, um eine Sequenz zu bauen.
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
                    <span className={cn(
                      'text-xs font-bold px-2 py-0.5 rounded-full',
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
                  <SchrittEditor
                    schritt={selectedSchritt}
                    onChange={(updated) => updateSchritt(selectedIndex, updated)}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-center">
                  <div>
                    <Eye className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      {schritte.length === 0
                        ? 'Fuegen Sie links einen Schritt hinzu.'
                        : 'Waehlen Sie links einen Schritt aus.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-2 px-6 py-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || schritte.length === 0 || !isComplete}
            className="gap-2"
          >
            {isSaving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert…</>
            ) : (
              <><Save className="w-4 h-4" /> {istUpdate ? 'Speichern' : 'Sequenz erstellen'}</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}