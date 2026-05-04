/**
 * MBKPromptItem.jsx
 *
 * Eine einzelne Prompt-Karte im MBK-Generator-Panel.
 *
 * Zustände:
 *   - leer (noch nie generiert)             → nur "Generieren"-Button
 *   - generiert + aktuell                   → Lese-Ansicht + Copy
 *   - generiert + out of sync               → Warn-Badge + Neu generieren
 *   - generiert + customized                → Custom-Badge + Überschreiben-Modal
 *   - editingMode (global toggle)           → Textarea + Save-onBlur
 *   - blockiert (Workflow-Blocker, nur bei  → Generieren disabled + Erklärung
 *     erstellungspaket)
 */
import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Copy, Check, AlertTriangle, Lock, PenSquare, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import MBKPromptOverwriteDialog from './MBKPromptOverwriteDialog';

const MBKPromptItem = forwardRef(function MBKPromptItem({
  label,
  promptType,
  referenceId = null,
  existingPrompt,
  isOutOfSync = false,
  isBlocked = false,
  blockReason = '',
  editingMode = false,
  buildContent,           // () => string  (deterministische Template-Funktion)
  asyncBuildContent,      // optional: () => Promise<string>. Wenn gesetzt, hat Vorrang vor buildContent (z. B. LLM-Aufruf für Persona).
  sourceMaxTimestamp,     // number (ms)   für source_updated_at beim Speichern
  onUpsert,               // ({promptType, referenceId, content, isCustomized, sourceUpdatedAt}) => Promise
}, ref) {
  const [isOverwriteOpen, setIsOverwriteOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState(existingPrompt?.content || '');

  // Refs für den Flush-Mechanismus: das Panel ruft beim Ausschalten des
  // Bearbeitungsmodus flush() auf, das den letzten draft (falls geändert)
  // synchron in die Datenbank schreibt.
  const draftRef = useRef(draft);
  const existingRef = useRef(existingPrompt);
  useEffect(() => { draftRef.current = draft; }, [draft]);
  useEffect(() => { existingRef.current = existingPrompt; }, [existingPrompt]);

  useEffect(() => {
    setDraft(existingPrompt?.content || '');
  }, [existingPrompt?.id, existingPrompt?.content]);

  const hasContent = !!existingPrompt?.content;
  const isCustomized = !!existingPrompt?.is_customized;

  const sourceUpdatedAt = sourceMaxTimestamp
    ? new Date(sourceMaxTimestamp).toISOString()
    : new Date().toISOString();

  const doGenerate = async () => {
    setIsWorking(true);
    try {
      // Async-Build (z. B. LLM-Call für die Fachliche Persona) hat Vorrang
      // vor der deterministischen Build-Funktion. Wirft die Promise eine
      // Fehlermeldung, fangen wir sie unten ab.
      const content = asyncBuildContent
        ? await asyncBuildContent()
        : buildContent();
      await onUpsert({
        promptType,
        referenceId,
        content,
        isCustomized: false,
        sourceUpdatedAt,
      });
      toast.success('Prompt generiert.');
    } catch (e) {
      toast.error('Fehler beim Generieren: ' + (e?.message || 'unbekannt'));
    } finally {
      setIsWorking(false);
    }
  };

  const handleGenerateClick = () => {
    if (isBlocked) return;
    if (isCustomized && hasContent) {
      setIsOverwriteOpen(true);
      return;
    }
    doGenerate();
  };

  const handleConfirmOverwrite = () => {
    setIsOverwriteOpen(false);
    doGenerate();
  };

  const handleCopy = () => {
    if (!hasContent) return;
    navigator.clipboard.writeText(existingPrompt.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success('In Zwischenablage kopiert.');
  };

  const saveCustomEdit = async () => {
    if (draft === (existingPrompt?.content || '')) return;
    setIsWorking(true);
    try {
      await onUpsert({
        promptType,
        referenceId,
        content: draft,
        isCustomized: true,
        sourceUpdatedAt: existingPrompt?.source_updated_at || sourceUpdatedAt,
      });
      toast.success('Anpassung gespeichert.');
    } catch (e) {
      toast.error('Speichern fehlgeschlagen: ' + (e?.message || 'unbekannt'));
    } finally {
      setIsWorking(false);
    }
  };

  // Wird vom Panel beim Ausschalten des Bearbeitungsmodus aufgerufen.
  // Liefert true, wenn tatsächlich gespeichert wurde (für Toast-Aggregation).
  useImperativeHandle(ref, () => ({
    async flush() {
      const currentDraft = draftRef.current;
      const currentExisting = existingRef.current;
      if (currentDraft === (currentExisting?.content || '')) return false;
      await onUpsert({
        promptType,
        referenceId,
        content: currentDraft,
        isCustomized: true,
        sourceUpdatedAt: currentExisting?.source_updated_at || sourceUpdatedAt,
      });
      return true;
    },
  }), [onUpsert, promptType, referenceId, sourceUpdatedAt]);

  // ── Status-Badge ─────────────────────────────────────────────────────────
  let statusBadge = null;
  if (isBlocked) {
    statusBadge = (
      <Badge className="bg-slate-100 text-slate-600 border-slate-200 gap-1">
        <Lock className="w-3 h-3" /> Blockiert
      </Badge>
    );
  } else if (!hasContent) {
    statusBadge = <Badge variant="outline" className="text-muted-foreground">Noch nicht generiert</Badge>;
  } else if (isOutOfSync) {
    statusBadge = (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
        <AlertTriangle className="w-3 h-3" /> Veraltet
      </Badge>
    );
  } else if (isCustomized) {
    statusBadge = (
      <Badge className="bg-violet-100 text-violet-700 border-violet-200 gap-1">
        <PenSquare className="w-3 h-3" /> Manuell angepasst
      </Badge>
    );
  } else {
    statusBadge = (
      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 gap-1">
        <Check className="w-3 h-3" /> Aktuell
      </Badge>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{label}</p>
          {isBlocked && (
            <p className="text-xs text-slate-600 mt-0.5">{blockReason}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusBadge}
        </div>
      </div>

      {hasContent && !editingMode && (
        <pre className="text-xs bg-muted/50 rounded p-3 max-h-48 overflow-auto whitespace-pre-wrap font-mono leading-relaxed border">
          {existingPrompt.content}
        </pre>
      )}

      {hasContent && editingMode && (
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={saveCustomEdit}
          rows={10}
          className="text-xs font-mono"
        />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
          variant={hasContent ? 'outline' : 'default'}
          onClick={handleGenerateClick}
          disabled={isWorking || isBlocked || !editingMode}
          className="gap-1.5"
          title={isBlocked ? blockReason : (!editingMode ? 'Bearbeitungsmodus aktivieren, um zu generieren.' : undefined)}
        >
          {isWorking
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Sparkles className="w-3.5 h-3.5" />}
          {hasContent ? 'Neu generieren' : 'Generieren'}
        </Button>

        {hasContent && (
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Kopiert' : 'Kopieren'}
          </Button>
        )}
      </div>

      <MBKPromptOverwriteDialog
        open={isOverwriteOpen}
        onOpenChange={setIsOverwriteOpen}
        onConfirm={handleConfirmOverwrite}
        promptLabel={label}
      />
    </div>
  );
});

export default MBKPromptItem;