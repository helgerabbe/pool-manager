/**
 * MatchTermsModal.jsx
 *
 * Modal für die Bearbeitung von "Begriffe zuordnen" Masteraufgaben.
 * Analog zu LueckentextWysiwygModal:
 * - Tabs: "Manuell" + "KI-Assistent"
 * - Implizites Locking (Lock kommt vom Parent)
 * - Footer: Abbrechen | Speichern + content_status-Toggle
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertCircle, Trash2, Plus, Sparkles, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReleaseStatusToggle from '@/components/workspace/ReleaseStatusToggle';
import { toast } from 'sonner';

// ── Manueller Editor ──────────────────────────────────────────────────────────

function ManualEditor({ data, onChange }) {
  const [pairs, setPairs] = useState(data.pairs || []);
  const [distractors, setDistractors] = useState(data.distractors || []);
  const [instruction, setInstruction] = useState(data.instruction || '');

  // Propagate changes upward
  useEffect(() => {
    onChange({ instruction, pairs, distractors });
  }, [instruction, pairs, distractors]);

  const addPair = () => setPairs(p => [...p, { left: '', right: '' }]);
  const updatePair = (idx, side, val) => setPairs(p => p.map((item, i) => i === idx ? { ...item, [side]: val } : item));
  const removePair = (idx) => setPairs(p => p.filter((_, i) => i !== idx));

  const addDistractor = () => setDistractors(d => [...d, '']);
  const updateDistractor = (idx, val) => setDistractors(d => d.map((item, i) => i === idx ? val : item));
  const removeDistractor = (idx) => setDistractors(d => d.filter((_, i) => i !== idx));

  return (
    <div className="space-y-5">
      {/* Anweisung */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Anweisung (optional)</Label>
        <Textarea
          value={instruction}
          onChange={e => setInstruction(e.target.value)}
          placeholder="z.B. Ordne die Begriffe den richtigen Erklärungen zu."
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      {/* Begriffspaare */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Begriffspaare</Label>
          <Button size="sm" variant="ghost" onClick={addPair} className="gap-1 text-xs h-7">
            <Plus className="w-3 h-3" /> Paar hinzufügen
          </Button>
        </div>
        {pairs.length === 0 && (
          <p className="text-xs text-muted-foreground italic py-2 text-center">Noch keine Paare. Klicke auf „Paar hinzufügen".</p>
        )}
        <div className="space-y-2">
          {pairs.map((pair, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={pair.left}
                onChange={e => updatePair(idx, 'left', e.target.value)}
                placeholder="Begriff / Frage"
                className="text-sm flex-1"
              />
              <span className="text-muted-foreground text-sm shrink-0">→</span>
              <Input
                value={pair.right}
                onChange={e => updatePair(idx, 'right', e.target.value)}
                placeholder="Antwort / Erklärung"
                className="text-sm flex-1"
              />
              <button onClick={() => removePair(idx)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Distraktoren */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Distraktoren (Falschantworten)</Label>
          <Button size="sm" variant="ghost" onClick={addDistractor} className="gap-1 text-xs h-7">
            <Plus className="w-3 h-3" /> Distraktor
          </Button>
        </div>
        {distractors.length === 0 && (
          <p className="text-xs text-muted-foreground italic">Keine Distraktoren (optional).</p>
        )}
        <div className="space-y-2">
          {distractors.map((d, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <Input
                value={typeof d === 'string' ? d : d?.value || ''}
                onChange={e => updateDistractor(idx, e.target.value)}
                placeholder="Falsche Antwort..."
                className="text-sm flex-1"
              />
              <button onClick={() => removeDistractor(idx)} className="p-1 text-muted-foreground hover:text-destructive shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── KI-Assistent ──────────────────────────────────────────────────────────────

function KIAssistent({ onApply }) {
  const [topic, setTopic] = useState('');
  const [numPairs, setNumPairs] = useState('5');
  const [numDistractors, setNumDistractors] = useState('3');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Bitte ein Thema eingeben.'); return; }
    setError('');
    setPreview(null);
    setIsLoading(true);
    try {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Generiere Zuordnungspaare und Distraktoren für eine Lernaufgabe.
Thema: ${topic}
Anzahl Paare: ${numPairs}
Anzahl Distraktoren: ${numDistractors}

Jedes Paar: "Begriff/Frage (links)" ↔ "Antwort/Definition (rechts)".
Distraktoren sind plausible, aber falsche Antwortoptionen zum Thema.`,
        response_json_schema: {
          type: 'object',
          properties: {
            pairs: { type: 'array', items: { type: 'object', properties: { left: { type: 'string' }, right: { type: 'string' } } } },
            distractors: { type: 'array', items: { type: 'string' } },
          },
        },
      });

      const data = response.data || response;
      const validPairs = (data.pairs || []).filter(p => p?.left && p?.right);
      if (validPairs.length === 0) throw new Error('KI konnte keine gültigen Paare generieren.');
      const validDistractors = (data.distractors || []).filter(d => typeof d === 'string' && d.trim());
      setPreview({ pairs: validPairs, distractors: validDistractors });
    } catch (err) {
      setError(err.message || 'Generierung fehlgeschlagen.');
      toast.error('Generierung fehlgeschlagen: ' + (err.message || 'Unbekannt'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label className="text-sm font-medium">Thema *</Label>
        <Textarea
          value={topic}
          onChange={e => { setTopic(e.target.value); setError(''); setPreview(null); }}
          placeholder="z.B. Hauptstädte Europas, Photosynthese, Verben mit Dativ"
          rows={3}
          className="resize-none text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Anzahl Paare</Label>
          <Input type="number" value={numPairs} onChange={e => setNumPairs(e.target.value)} min="1" max="20" className="text-sm" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Distraktoren</Label>
          <Input type="number" value={numDistractors} onChange={e => setNumDistractors(e.target.value)} min="0" max="10" className="text-sm" />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><span>{error}</span>
        </div>
      )}

      <Button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="w-full gap-2">
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird generiert…</> : <><Sparkles className="w-4 h-4" /> Paare generieren</>}
      </Button>

      {preview && (
        <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Vorschau ({preview.pairs.length} Paare)</p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {preview.pairs.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1 font-medium">{p.left}</span>
                <span className="text-muted-foreground/40">→</span>
                <span className="flex-1 text-muted-foreground">{p.right}</span>
              </div>
            ))}
          </div>
          {preview.distractors.length > 0 && (
            <div className="pt-2 border-t border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Distraktoren: {preview.distractors.join(', ')}</p>
            </div>
          )}
          <Button
            onClick={() => onApply(preview)}
            className="w-full gap-2"
            variant="default"
          >
            <Sparkles className="w-4 h-4" /> Übernehmen & manuell bearbeiten
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Haupt-Modal ───────────────────────────────────────────────────────────────

export default function MatchTermsModal({
  open,
  onOpenChange,
  initialData = {},
  onSave,
  onCancel,
  onDelete,
  isSaving = false,
  exportLocked = false,
}) {
  const [activeTab, setActiveTab] = useState('manual');
  const [isReleased, setIsReleased] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editorData, setEditorData] = useState({ instruction: '', pairs: [], distractors: [] });

  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setIsReleased(initialData?.content_status === 'approved');
      setEditorData({
        instruction: initialData?.instruction || '',
        pairs: initialData?.pairs || [],
        distractors: (initialData?.distractors || []).map(v => typeof v === 'string' ? v : v?.value || '').filter(Boolean),
      });
      setActiveTab('manual');
      setDeleteConfirm(false);
    }
    prevOpenRef.current = open;
  }, [open]);

  const handleCancel = () => {
    setDeleteConfirm(false);
    onCancel?.();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await onDelete?.();
    setIsDeleting(false);
    setDeleteConfirm(false);
  };

  const handleSave = () => {
    const payload = {
      ...editorData,
      distractors: editorData.distractors.filter(d => typeof d === 'string' ? d.trim() : d?.value?.trim()),
      content_status: isReleased ? 'approved' : 'draft',
    };
    if (initialData?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }
    onSave?.(payload);
  };

  const handleKIApply = (generated) => {
    setEditorData(prev => ({
      ...prev,
      pairs: generated.pairs,
      distractors: generated.distractors,
    }));
    setActiveTab('manual');
    toast.success('KI-Paare übernommen – jetzt manuell anpassen.');
  };

  const validPairs = (editorData.pairs || []).filter(p => p?.left?.trim() && p?.right?.trim());
  const isReadyToSave = validPairs.length >= 1;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold">Begriffe zuordnen</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Definiere Begriffspaare manuell oder lass sie von der KI generieren.
          </p>
        </DialogHeader>

        {/* Export-Lock Warning */}
        {exportLocked && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-800">Einheit ist für Moodle-Export gesperrt</p>
              <p className="text-xs text-red-700 mt-0.5">Speichern ist vorübergehend nicht möglich.</p>
            </div>
          </div>
        )}

        {/* Tab-Switcher */}
        <div className="flex border-b border-border shrink-0 px-6">
          {[
            { key: 'manual', label: 'Manuell' },
            { key: 'ki', label: '✨ KI-Assistent' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollbarer Inhalt */}
        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {activeTab === 'manual' ? (
            <ManualEditor
              key={JSON.stringify(editorData)} // re-mount wenn KI-Daten übernommen werden
              data={editorData}
              onChange={setEditorData}
            />
          ) : (
            <KIAssistent onApply={handleKIApply} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 space-y-4">
          <ReleaseStatusToggle isReleased={isReleased} onToggle={setIsReleased} disabled={isSaving || !isReadyToSave} />
          {!isReadyToSave && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Mindestens 1 vollständiges Begriffspaar erforderlich.
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {onDelete && !deleteConfirm && (
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)} disabled={isSaving || isDeleting} className="gap-1.5 text-destructive hover:bg-red-50 hover:text-destructive">
                  <Trash2 className="w-4 h-4" /> Löschen
                </Button>
              )}
              {deleteConfirm && (
                <>
                  <span className="text-xs text-destructive font-medium">Wirklich löschen?</span>
                  <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting} className="gap-1.5 h-7 text-xs">
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Ja, löschen
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(false)} disabled={isDeleting} className="h-7 text-xs">Abbrechen</Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving || isDeleting}>Abbrechen</Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || exportLocked || isDeleting || !isReadyToSave}
                title={exportLocked ? 'Einheit ist zur Moodle-Synchronisation gesperrt' : !isReadyToSave ? 'Mindestens 1 Paar erforderlich' : ''}
                className="gap-2"
              >
                {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : 'Speichern'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}