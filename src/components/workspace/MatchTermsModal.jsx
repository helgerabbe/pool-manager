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

// Hard-Limit: mehr als 8 Begriffspaare passen nicht scrollfrei in den 960×600-Slide-Slot
// (Stand 2026-05-31 nach Lehrkraft-Test). Greift sowohl beim manuellen Hinzufügen
// als auch beim KI-Assistenten.
const MAX_PAIRS = 8;

function ManualEditor({ data, onChange }) {
  const [pairs, setPairs] = useState(data.pairs || []);
  const [distractors, setDistractors] = useState(data.distractors || []);
  const [instruction, setInstruction] = useState(data.instruction || '');

  // Propagate changes upward.
  // WICHTIG: Der allererste (initiale) Aufruf wird übersprungen. Sonst meldet
  // der frisch gemountete Editor seine LEEREN Anfangswerte nach oben und
  // überschreibt damit die gerade geladenen DB-Inhalte (Race-Condition, die
  // das „Inhalt bearbeiten zeigt leeres Formular"-Problem verursachte).
  const isFirstChangeRef = useRef(true);
  useEffect(() => {
    if (isFirstChangeRef.current) { isFirstChangeRef.current = false; return; }
    onChange({ instruction, pairs, distractors });
  }, [instruction, pairs, distractors]);

  const addPair = () => setPairs(p => {
    if (p.length >= MAX_PAIRS) {
      toast.error(`Maximal ${MAX_PAIRS} Begriffspaare — sonst passt die Aufgabe nicht auf den Bildschirm.`);
      return p;
    }
    return [...p, { left: '', right: '' }];
  });
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
          <div>
            <Label className="text-sm font-medium">Begriffspaare</Label>
            <p className="text-[11px] text-muted-foreground mt-0.5">{pairs.length} / {MAX_PAIRS} — max. {MAX_PAIRS}, damit die Aufgabe scrollfrei aufs iPad passt.</p>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={addPair}
            disabled={pairs.length >= MAX_PAIRS}
            className="gap-1 text-xs h-7"
            title={pairs.length >= MAX_PAIRS ? `Maximum von ${MAX_PAIRS} Paaren erreicht.` : ''}
          >
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

function KIAssistent({ onApply, existingPairsCount = 0 }) {
  // Wie viele Paare passen noch in den 8-Slot-Rahmen?
  const slotsRemaining = Math.max(0, MAX_PAIRS - existingPairsCount);
  const [topic, setTopic] = useState('');
  const [numPairs, setNumPairs] = useState(() => String(Math.min(5, slotsRemaining || 5)));
  const clampNumPairs = (v) => {
    const max = Math.max(1, slotsRemaining);
    const n = Number(v);
    if (!Number.isFinite(n) || n < 1) return '1';
    if (n > max) return String(max);
    return String(Math.floor(n));
  };
  const [numDistractors, setNumDistractors] = useState('3');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const handleGenerate = async () => {
    if (!topic.trim()) { setError('Bitte ein Thema eingeben.'); return; }
    if (slotsRemaining <= 0) {
      setError(`Maximum von ${MAX_PAIRS} Paaren bereits erreicht. Lösche zuerst ein bestehendes Paar.`);
      return;
    }
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
      const validPairsRaw = (data.pairs || []).filter(p => p?.left && p?.right);
      if (validPairsRaw.length === 0) throw new Error('KI konnte keine gültigen Paare generieren.');
      // Nur so viele Paare übernehmen, wie noch in das Limit passen.
      const validPairs = validPairsRaw.slice(0, slotsRemaining);
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
      {existingPairsCount > 0 && (
        <div className="text-xs px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-blue-800">
          {slotsRemaining > 0
            ? <>Bestehende Paare bleiben erhalten. Die KI ergänzt bis zu <strong>{slotsRemaining}</strong> weitere {slotsRemaining === 1 ? 'Paar' : 'Paare'} (Max. {MAX_PAIRS}).</>
            : <>Maximum von {MAX_PAIRS} Paaren bereits erreicht. Lösche zuerst ein Paar im Tab „Manuell“, um neue von der KI zu ergänzen.</>}
        </div>
      )}
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
          <Label className="text-sm font-medium">
            Anzahl Paare (max. {Math.max(1, slotsRemaining)})
          </Label>
          <Input type="number" value={numPairs} onChange={e => setNumPairs(clampNumPairs(e.target.value))} min="1" max={Math.max(1, slotsRemaining)} disabled={slotsRemaining <= 0} className="text-sm" />
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

      <Button onClick={handleGenerate} disabled={isLoading || !topic.trim() || slotsRemaining <= 0} className="w-full gap-2">
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
            <Sparkles className="w-4 h-4" /> Übernehmen {'&'} manuell bearbeiten
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
  // savedReleased = der zuletzt GESPEICHERTE Freigabe-Status (aus der DB).
  // Speichern/Löschen hängen daran (nicht am Live-Toggle), damit man den
  // Toggle erst aktivieren UND DANN speichern kann. Erst nach dem Speichern
  // (= savedReleased wird true) verschwinden die Buttons.
  const [savedReleased, setSavedReleased] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editorData, setEditorData] = useState({ instruction: '', pairs: [], distractors: [] });
  // Stabiler Remount-Schlüssel für den ManualEditor. Wird NUR erhöht, wenn der
  // Editor mit komplett neuen Inhalten neu aufgesetzt werden muss (Öffnen,
  // KI-Übernahme) — NICHT bei jedem Tastendruck. Früher hing der key an
  // JSON.stringify(editorData), wodurch der Editor bei jeder Eingabe neu
  // gemountet wurde und das Eingabefeld nach jedem Buchstaben den Fokus verlor.
  const [editorKey, setEditorKey] = useState(0);

  // Re-Init nicht nur beim Öffnen, sondern auch wenn die DB-Werte erst NACH dem
  // Öffnen eintreffen (z.B. nach Lock-Erwerb + Query-Refetch). Wir vergleichen
  // eine Signatur der relevanten Inhalte, damit echte Edits nicht überschrieben werden.
  // Re-Init der Editor-Daten beim Öffnen.
  //
  // Früher wurde hier über eine Signatur-Gleichheit früh abgebrochen. Das war
  // der eigentliche Bug: Wenn der ManualEditor beim Mounten seine leeren
  // Anfangswerte nach oben meldete, wurde editorData auf leer zurückgesetzt,
  // WÄHREND die Signatur bereits auf „befüllt" stand — dadurch konnte der
  // Editor nie wieder mit den echten DB-Inhalten befüllt werden.
  //
  // Neue Strategie: genau EINMAL pro Öffnungs-Session mit echten Inhalten
  // initialisieren, danach blockieren (schützt Nutzer-Eingaben). Trifft
  // field_values verspätet ein (async nach dem Öffnen), wird nachbefüllt,
  // solange noch keine echten Inhalte gesetzt wurden.
  const wasOpenRef = useRef(false);
  const populatedRef = useRef(false);
  useEffect(() => {
    if (!open) { wasOpenRef.current = false; populatedRef.current = false; return; }
    const src = (initialData && initialData.field_values && typeof initialData.field_values === 'object')
      ? { ...initialData, ...initialData.field_values }
      : (initialData || {});
    const pairs = Array.isArray(src.pairs) ? src.pairs : [];
    const distractors = (Array.isArray(src.distractors) ? src.distractors : [])
      .map(v => typeof v === 'string' ? v : v?.value || '')
      .filter(Boolean);
    const justOpened = !wasOpenRef.current;
    wasOpenRef.current = true;
    // Bereits mit echten Inhalten befüllt → nicht erneut überschreiben.
    if (!justOpened && populatedRef.current) return;
    if (pairs.length > 0 || (src.instruction || '').trim()) populatedRef.current = true;
    setIsReleased(src.content_status === 'approved');
    setSavedReleased(src.content_status === 'approved');
    setEditorData({ instruction: src.instruction || '', pairs, distractors });
    setEditorKey(k => k + 1); // Editor mit frischen DB-Inhalten neu aufsetzen
    setActiveTab('manual');
    setDeleteConfirm(false);
  }, [open, initialData]);

  // savedReleased immer am zuletzt gespeicherten DB-Status nachführen — auch
  // wenn initialData verspätet (nach dem Speichern via Refetch) eintrifft.
  // Dadurch verschwinden Speichern/Löschen erst NACH erfolgtem Speichern.
  useEffect(() => {
    if (!open) return;
    const src = (initialData?.field_values && typeof initialData.field_values === 'object')
      ? { ...initialData, ...initialData.field_values }
      : (initialData || {});
    setSavedReleased(src.content_status === 'approved');
  }, [open, initialData?.content_status]);

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
    // Append-Modus: vorhandene Paare bleiben, neue werden ergänzt; Limit harten cappen.
    setEditorData(prev => {
      const existingPairs = Array.isArray(prev.pairs) ? prev.pairs : [];
      const room = Math.max(0, MAX_PAIRS - existingPairs.length);
      const newPairs = (generated.pairs || []).slice(0, room);
      const mergedDistractors = Array.from(new Set([
        ...(Array.isArray(prev.distractors) ? prev.distractors : []),
        ...((generated.distractors || []).filter(d => typeof d === 'string' && d.trim())),
      ]));
      const dropped = (generated.pairs || []).length - newPairs.length;
      if (dropped > 0) {
        toast.warning(`Nur ${newPairs.length} ${newPairs.length === 1 ? 'Paar' : 'Paare'} übernommen — ${dropped} überschreiten das Maximum von ${MAX_PAIRS}.`);
      } else if (newPairs.length > 0) {
        toast.success(`${newPairs.length} KI-${newPairs.length === 1 ? 'Paar' : 'Paare'} ergänzt.`);
      }
      return {
        ...prev,
        pairs: [...existingPairs, ...newPairs],
        distractors: mergedDistractors,
      };
    });
    setEditorKey(k => k + 1); // Editor mit ergänzten KI-Inhalten neu aufsetzen
    setActiveTab('manual');
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
              key={editorKey} // re-mount nur beim Öffnen / bei KI-Übernahme, NICHT bei jeder Eingabe
              data={editorData}
              onChange={setEditorData}
            />
          ) : (
            <KIAssistent onApply={handleKIApply} existingPairsCount={(editorData.pairs || []).length} />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 space-y-4">
          {/* Freigabe-Toggle bleibt IMMER bedienbar — nur so kann die Lehrkraft
              eine freigegebene Aufgabe überhaupt wieder zurückholen. */}
          <ReleaseStatusToggle isReleased={isReleased} onToggle={setIsReleased} disabled={isSaving || isDeleting} />
          {!savedReleased && !isReadyToSave && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
              Mindestens 1 vollständiges Begriffspaar erforderlich.
            </p>
          )}
          {savedReleased ? (
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
              Aufgabe ist freigegeben. Zum Bearbeiten oder Löschen zuerst die Freigabe oben zurücknehmen.
            </p>
          ) : isReleased && (
            <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2 py-1">
              Auf „Freigegeben" gesetzt — klicke auf <strong>Speichern</strong>, um die Freigabe zu übernehmen.
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Löschen nur sichtbar, wenn (gespeicherter Status) NICHT freigegeben. */}
              {!savedReleased && onDelete && !deleteConfirm && (
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(true)} disabled={isSaving || isDeleting} className="gap-1.5 text-destructive hover:bg-red-50 hover:text-destructive">
                  <Trash2 className="w-4 h-4" /> Löschen
                </Button>
              )}
              {!savedReleased && deleteConfirm && (
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
              <Button variant="outline" onClick={handleCancel} disabled={isSaving || isDeleting}>
                {savedReleased ? 'Schließen' : 'Abbrechen'}
              </Button>
              {/* Speichern sichtbar, solange der GESPEICHERTE Status nicht
                  freigegeben ist — so kann die Freigabe-Aktivierung gespeichert werden. */}
              {!savedReleased && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving || exportLocked || isDeleting || !isReadyToSave}
                  title={exportLocked ? 'Einheit ist zur Moodle-Synchronisation gesperrt' : !isReadyToSave ? 'Mindestens 1 Paar erforderlich' : ''}
                  className="gap-2"
                >
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : 'Speichern'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}