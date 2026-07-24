/**
 * ZuordnungstrainingModal.jsx
 *
 * Editor für die (NICHT masterfähige) Aktivität „Zuordnungstraining":
 * Die Lehrkraft hinterlegt ALLE Zuordnungspaare des Begriffssatzes
 * (links Text, Bild oder Audio — rechts der zuzuordnende Begriff) sowie
 * die Trainings-Parameter (Paare pro Runde, Meister-Schwelle).
 * Für große Sätze (z. B. 40 Vokabeln) gibt es einen Listen-Import
 * (eine Zeile pro Paar: „links = rechts").
 */
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, ListPlus, ChevronDown } from 'lucide-react';
import TrainingPaarRow from '@/components/workspace/zuordnungstraining/TrainingPaarRow';
import { toast } from 'sonner';

function istPaarGueltig(p) {
  if (!p || String(p.right || '').trim() === '') return false;
  const typ = p.left_typ || 'text';
  return typ === 'text' ? String(p.left_text || '').trim() !== '' : String(p.left_url || '').trim() !== '';
}

export default function ZuordnungstrainingModal({
  open,
  onOpenChange,
  initialFieldValues = {},
  onSave,
  onCancel,
  isSaving = false,
}) {
  const [instruction, setInstruction] = useState('');
  const [pairs, setPairs] = useState([]);
  const [rundenGroesse, setRundenGroesse] = useState('6');
  const [schwelle, setSchwelle] = useState('2');
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  useEffect(() => {
    if (!open) return;
    setInstruction(initialFieldValues.instruction || '');
    setPairs(Array.isArray(initialFieldValues.training_pairs)
      ? initialFieldValues.training_pairs.map((p) => ({ ...p }))
      : []);
    setRundenGroesse(String(initialFieldValues.runden_groesse || 6));
    setSchwelle(String(initialFieldValues.meister_schwelle || 2));
    setBulkOpen(false);
    setBulkText('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updatePair = (idx, next) => setPairs((p) => p.map((item, i) => (i === idx ? next : item)));
  const removePair = (idx) => setPairs((p) => p.filter((_, i) => i !== idx));
  const addPair = () => setPairs((p) => [...p, { left_typ: 'text', left_text: '', left_url: '', right: '' }]);

  // Listen-Import: eine Zeile pro Text-Paar, Trenner „=", „;" oder Tab.
  const handleBulkImport = () => {
    const neue = bulkText
      .split('\n')
      .map((line) => {
        const sep = line.includes('=') ? '=' : line.includes(';') ? ';' : line.includes('\t') ? '\t' : null;
        if (!sep) return null;
        const [left, ...rest] = line.split(sep);
        const right = rest.join(sep).trim();
        if (!left?.trim() || !right) return null;
        return { left_typ: 'text', left_text: left.trim(), left_url: '', right };
      })
      .filter(Boolean);
    if (neue.length === 0) {
      toast.error('Keine gültigen Zeilen gefunden. Format: „Begriff = Zuordnung" (eine Zeile pro Paar).');
      return;
    }
    setPairs((p) => [...p, ...neue]);
    setBulkText('');
    setBulkOpen(false);
    toast.success(`${neue.length} ${neue.length === 1 ? 'Paar' : 'Paare'} übernommen.`);
  };

  const validCount = pairs.filter(istPaarGueltig).length;

  const handleSave = () => {
    onSave?.({
      instruction,
      training_pairs: pairs,
      runden_groesse: Math.min(12, Math.max(2, Number(rundenGroesse) || 6)),
      meister_schwelle: Math.min(5, Math.max(1, Number(schwelle) || 2)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onCancel?.(); }}>
      <DialogContent className="max-w-3xl max-h-[90dvh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold">Zuordnungstraining</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hinterlege ALLE Zuordnungspaare deines Begriffssatzes (z. B. alle 40 Vokabeln). Die Schüler üben in
            kleinen Runden mit Rotation, bis jedes Paar sicher sitzt.
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0 space-y-5">
          {/* Anweisung */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Anweisung (optional)</Label>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="z. B. Ordne jedem englischen Wort die richtige deutsche Übersetzung zu."
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Trainings-Parameter */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Paare pro Runde</Label>
              <Input type="number" min="2" max="12" value={rundenGroesse} onChange={(e) => setRundenGroesse(e.target.value)} className="text-sm" />
              <p className="text-[11px] text-muted-foreground">So viele Zuordnungen übt der Schüler pro Runde (Standard: 6).</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Wie oft richtig, bis ein Paar sitzt?</Label>
              <Input type="number" min="1" max="5" value={schwelle} onChange={(e) => setSchwelle(e.target.value)} className="text-sm" />
              <p className="text-[11px] text-muted-foreground">Erst wenn jedes Paar so oft richtig zugeordnet wurde, ist die Übung bestanden (Standard: 2×).</p>
            </div>
          </div>

          {/* Paare */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Zuordnungspaare</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {pairs.length} {pairs.length === 1 ? 'Paar' : 'Paare'} ({validCount} vollständig) — links Text, Bild oder Audio, rechts der Begriff.
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setBulkOpen((v) => !v)} className="gap-1 text-xs h-7">
                  <ListPlus className="w-3 h-3" /> Liste einfügen
                  <ChevronDown className={`w-3 h-3 transition-transform ${bulkOpen ? 'rotate-180' : ''}`} />
                </Button>
                <Button size="sm" variant="ghost" onClick={addPair} className="gap-1 text-xs h-7">
                  <Plus className="w-3 h-3" /> Paar hinzufügen
                </Button>
              </div>
            </div>

            {/* Listen-Import für große Text-Sätze */}
            {bulkOpen && (
              <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-[11px] text-muted-foreground">
                  Eine Zeile pro Paar, Trenner „=", „;" oder Tab. Beispiel: <code className="bg-background px-1 rounded">dog = Hund</code>
                </p>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  rows={6}
                  placeholder={'dog = Hund\ncat = Katze\nhouse = Haus'}
                  className="text-sm font-mono resize-none"
                />
                <Button size="sm" onClick={handleBulkImport} disabled={!bulkText.trim()} className="gap-1.5 text-xs h-7">
                  <ListPlus className="w-3 h-3" /> Paare übernehmen
                </Button>
              </div>
            )}

            {pairs.length === 0 && (
              <p className="text-xs text-muted-foreground italic py-2 text-center">
                Noch keine Paare. Nutze „Paar hinzufügen" oder „Liste einfügen".
              </p>
            )}
            <div className="space-y-2">
              {pairs.map((pair, idx) => (
                <TrainingPaarRow
                  key={idx}
                  pair={pair}
                  onChange={(next) => updatePair(idx, next)}
                  onRemove={() => removePair(idx)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 space-y-3">
          {validCount < 4 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Mindestens 4 vollständige Paare erforderlich, damit die Aktivität als vollständig gilt (aktuell: {validCount}).
            </p>
          )}
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>Abbrechen</Button>
            <Button onClick={handleSave} disabled={isSaving || validCount < 1} className="gap-2">
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : 'Speichern'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}