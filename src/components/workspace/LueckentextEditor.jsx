/**
 * LueckentextEditor.jsx
 *
 * Editor + Renderer für Lückentext-Masteraufgaben.
 * Features:
 *  - Manuelle Eingabe (Lücken mit [Wort])
 *  - Klammer-Validation beim Speichern
 *  - KI-Assistent Modal
 *  - Lehrer-Vorschau: Lücken gelb hervorgehoben
 *  - Schüler-Ansicht: Schüttelkasten + Lückenlinien
 */

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sparkles, Loader2, Info, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { sanitizeHtml } from '@/lib/sanitize';
import { toast } from 'sonner';

// ── Hilfsfunktionen ─────────────────────────────────────────────────────────────

/** Prüft ob öffnende und schließende Klammern übereinstimmen */
export function validateLueckentext(text) {
  const open = (text.match(/\[/g) || []).length;
  const close = (text.match(/\]/g) || []).length;
  return open === close && open > 0;
}

/** Extrahiert alle Lückenwörter aus dem Rohtext */
function extractLuecken(rawText) {
  const matches = [];
  const regex = /\[([^\]]+)\]/g;
  let m;
  while ((m = regex.exec(rawText)) !== null) {
    matches.push(m[1]);
  }
  return matches;
}

/** Fisher-Yates Shuffle */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Lücken-Renderer ─────────────────────────────────────────────────────────────

/**
 * mode='teacher' → Lücken gelb hervorgehoben
 * mode='student'  → Schüttelkasten oben + Lückenlinien im Text
 */
export function LueckentextRenderer({ rawText, mode = 'teacher' }) {
  const woerter = useMemo(() => {
    if (!rawText || mode !== 'student') return [];
    const unique = [...new Set(extractLuecken(rawText))];
    return shuffle(unique);
  }, [rawText, mode]);

  if (!rawText) return <span className="italic text-muted-foreground">Kein Text eingegeben.</span>;

  const parts = rawText.split(/(\[[^\]]+\])/g);

  if (mode === 'student') {

    return (
      <div className="space-y-3">
        {/* Schüttelkasten */}
        {woerter.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs font-semibold text-blue-700 w-full mb-1">Wortbank:</span>
            {woerter.map((w, i) => (
              <span key={i} className="px-2.5 py-1 bg-white border border-blue-300 rounded-md text-sm font-medium text-blue-800 shadow-sm">
                {w}
              </span>
            ))}
          </div>
        )}
        {/* Text mit Lückenlinien */}
        <span className="text-sm leading-relaxed">
          {parts.map((part, i) => {
            const match = part.match(/^\[([^\]]+)\]$/);
            if (match) {
              return (
                <span key={i} className="inline-block border-b-2 border-slate-500 mx-0.5 px-1 min-w-[60px] text-transparent select-none">
                  {match[1]}
                </span>
              );
            }
            return <span key={i}>{part}</span>;
          })}
        </span>
      </div>
    );
  }

  // teacher mode
  return (
    <span className="text-sm leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/^\[([^\]]+)\]$/);
        if (match) {
          return (
            <span key={i} className="bg-yellow-200 text-yellow-900 rounded px-1 font-medium mx-0.5">
              {match[1]}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

// ── KI-Assistent Modal ──────────────────────────────────────────────────────────

function KIAssistentModal({ open, onOpenChange, onAccept }) {
  const [sourceMaterial, setSourceMaterial] = useState('');
  const [targetWords, setTargetWords] = useState('');
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState('');

  const handleGenerate = async () => {
    if (!sourceMaterial.trim()) {
      toast.error('Bitte Quellmaterial eingeben.');
      return;
    }
    setGenerating(true);
    setPreview('');
    try {
      const res = await base44.functions.invoke('generateLueckentext', { sourceMaterial, targetWords });
      setPreview(res.data?.text || '');
    } catch (e) {
      toast.error('Fehler beim Generieren: ' + (e?.message || 'Unbekannt'));
    } finally {
      setGenerating(false);
    }
  };

  const handleAccept = () => {
    if (!preview) return;
    onAccept(preview);
    onOpenChange(false);
    setSourceMaterial('');
    setTargetWords('');
    setPreview('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            KI-Assistent: Lückentext generieren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Quelltext / Themenvorgabe *</Label>
            <Textarea
              value={sourceMaterial}
              onChange={e => setSourceMaterial(e.target.value)}
              placeholder="Füge hier den Originaltext oder eine Themenbeschreibung ein..."
              className="min-h-28 text-sm"
              disabled={generating}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Zielwörter (müssen zwingend Lücken werden)</Label>
            <Input
              value={targetWords}
              onChange={e => setTargetWords(e.target.value)}
              placeholder="z.B. Photosynthese, Chlorophyll, Stomata"
              disabled={generating}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              Kommagetrennte Liste – diese Wörter werden immer als Lücken markiert.
            </p>
          </div>

          <Button onClick={handleGenerate} disabled={generating || !sourceMaterial.trim()} className="gap-2 w-full">
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generiere Lückentext…</>
              : <><Sparkles className="w-4 h-4" /> Lückentext generieren</>
            }
          </Button>

          {preview && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Vorschau – Lehrer-Ansicht</Label>
                <div className="p-4 rounded-lg border bg-muted/30 leading-relaxed">
                  <LueckentextRenderer rawText={preview} mode="teacher" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Vorschau – Schüler-Ansicht</Label>
                <div className="p-4 rounded-lg border bg-white">
                  <LueckentextRenderer rawText={preview} mode="student" />
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={handleAccept} disabled={!preview} className="gap-2">
            Als Masteraufgabe übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Read-Only Ansicht mit Toggle ────────────────────────────────────────────────

function LueckentextReadOnly({ value }) {
  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 leading-relaxed">
      <LueckentextRenderer rawText={value} mode="teacher" />
    </div>
  );
}

// ── Haupt-Editor ────────────────────────────────────────────────────────────────

/**
 * onSaveValidate: Wenn übergeben, wird vor dem Speichern validiert.
 * Gibt true zurück wenn OK, false wenn Fehler.
 */
export function validateBeforeSave(value) {
  const open = (value.match(/\[/g) || []).length;
  const close = (value.match(/\]/g) || []).length;
  if (open !== close) {
    toast.error('Fehler: Die eckigen Klammern für die Lücken sind unvollständig.');
    return false;
  }
  if (open === 0) {
    toast.error('Fehler: Kein Lückentext – mindestens eine Lücke mit [Wort] eingeben.');
    return false;
  }
  return true;
}

export default function LueckentextEditor({ value, onChange, readOnly = false }) {
  const [kiModalOpen, setKiModalOpen] = useState(false);

  // Validierungs-Feedback live anzeigen
  const open = (value || '').match(/\[/g)?.length || 0;
  const close = (value || '').match(/\]/g)?.length || 0;
  const hasValidationError = value && open !== close;

  if (readOnly) {
    return <LueckentextReadOnly value={value} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Lückentext
        </Label>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setKiModalOpen(true)}
          className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5"
        >
          <Sparkles className="w-3.5 h-3.5" />
          KI-Assistent
        </Button>
      </div>

      <Textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder="Gib den Lückentext ein. Markiere Lücken mit eckigen Klammern: Die Hauptstadt von [Frankreich] ist Paris."
        className={`min-h-28 text-sm font-mono leading-relaxed ${hasValidationError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
      />

      {/* Validierungs-Warnung live */}
      {hasValidationError && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Eckige Klammern unvollständig – öffnende: {open}, schließende: {close}
        </p>
      )}

      <p className="text-xs text-muted-foreground flex items-start gap-1">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        Lücken mit <code className="bg-muted px-1 rounded">[Wort]</code> markieren. Beispiel: &quot;Die Hauptstadt von [Frankreich] ist Paris.&quot;
      </p>

      {/* Live-Vorschau Lehrer */}
      {value && !hasValidationError && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Vorschau:</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 leading-relaxed">
            <LueckentextRenderer rawText={value} mode="teacher" />
          </div>
        </div>
      )}

      <KIAssistentModal
        open={kiModalOpen}
        onOpenChange={setKiModalOpen}
        onAccept={onChange}
      />
    </div>
  );
}