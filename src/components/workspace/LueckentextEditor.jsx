/**
 * LueckentextEditor.jsx
 *
 * Textarea-Editor für Lückentext-Masteraufgaben.
 * Features:
 *  - Manuelle Eingabe (Lücken mit [Wort])
 *  - KI-Assistent Modal zur Textgenerierung
 *  - Lehrer-Vorschau mit gelb hervorgehobenen Lücken
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Sparkles, Loader2, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// ── Lücken-Parser ───────────────────────────────────────────────────────────────

/**
 * Zerlegt einen Rohtext mit [Lücken] in React-Elemente.
 * mode='teacher' → gelb hervorgehobener Text
 * mode='student'  → _________
 */
export function LueckentextRenderer({ rawText, mode = 'teacher' }) {
  if (!rawText) return <span className="italic text-muted-foreground">Kein Text eingegeben.</span>;

  const parts = rawText.split(/(\[[^\]]+\])/g);

  return (
    <span>
      {parts.map((part, i) => {
        const match = part.match(/^\[([^\]]+)\]$/);
        if (match) {
          if (mode === 'student') {
            return (
              <span key={i} className="inline-block border-b-2 border-foreground mx-0.5 min-w-[60px] text-transparent select-none">
                {match[1]}
              </span>
            );
          }
          // teacher mode
          return (
            <span key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5 font-medium mx-0.5">
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
      const res = await base44.functions.invoke('generateLueckentext', {
        sourceMaterial,
        targetWords,
      });
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
    // Reset
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
              placeholder="Füge hier den Originaltext oder eine Themenbeschreibung ein, aus dem die KI den Lückentext erstellt..."
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
              <Info className="w-3 h-3" />
              Kommagetrennte Liste. Diese Wörter werden immer als Lücken markiert.
            </p>
          </div>

          <Button onClick={handleGenerate} disabled={generating || !sourceMaterial.trim()} className="gap-2 w-full">
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generiere Lückentext…</>
              : <><Sparkles className="w-4 h-4" /> Lückentext generieren</>
            }
          </Button>

          {/* Vorschau */}
          {preview && (
            <div className="space-y-2">
              <Label>Vorschau (Lehrer-Ansicht)</Label>
              <div className="p-4 rounded-lg border bg-muted/30 text-sm leading-relaxed">
                <LueckentextRenderer rawText={preview} mode="teacher" />
              </div>
              <div className="p-3 rounded-lg border bg-background text-xs text-muted-foreground">
                <span className="font-medium">Rohtext:</span>
                <pre className="mt-1 whitespace-pre-wrap font-sans">{preview}</pre>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button onClick={handleAccept} disabled={!preview} className="gap-2">
            Als Masteraufgabe übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Haupt-Editor ────────────────────────────────────────────────────────────────

export default function LueckentextEditor({ value, onChange, readOnly = false }) {
  const [kiModalOpen, setKiModalOpen] = useState(false);

  if (readOnly) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lückentext (Lehrer-Ansicht)</p>
        <div className="bg-muted/50 rounded-lg p-3 text-sm leading-relaxed">
          <LueckentextRenderer rawText={value} mode="teacher" />
        </div>
      </div>
    );
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
        placeholder="Gib hier den Lückentext ein. Markiere Lücken mit eckigen Klammern: Die Hauptstadt von [Frankreich] ist [Paris]."
        className="min-h-28 text-sm font-mono leading-relaxed"
      />

      <p className="text-xs text-muted-foreground flex items-start gap-1">
        <Info className="w-3 h-3 mt-0.5 shrink-0" />
        Lücken mit <code className="bg-muted px-1 rounded">[Wort]</code> markieren. Beispiel: &quot;Die Hauptstadt von [Frankreich] ist Paris.&quot;
      </p>

      {/* Live-Vorschau */}
      {value && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Vorschau (Lehrer-Ansicht):</p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm leading-relaxed">
            <LueckentextRenderer rawText={value} mode="teacher" />
          </div>
        </div>
      )}

      <KIAssistentModal
        open={kiModalOpen}
        onOpenChange={setKiModalOpen}
        onAccept={(text) => {
          onChange(text);
        }}
      />
    </div>
  );
}