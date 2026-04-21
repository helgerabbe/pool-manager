/**
 * LueckentextWysiwygModal.jsx
 *
 * WYSIWYG-Modal für die Lückentext-Bearbeitung.
 * Flow:
 *  1. Lehrer tippt/klebt Rohtext in das Textarea (Bereich A)
 *  2. Interaktive Vorschau (Bereich B): jedes Wort ist anklickbar
 *  3. Klick auf Wort → wird zur Lücke + landet im Wortspeicher
 *  4. Klick auf Lücke → Wort wird wiederhergestellt
 *  5. Distraktoren können manuell hinzugefügt werden
 *  6. Speichern erzeugt { lueckentext, lueckenWoerter, distraktoren }
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, X, Plus, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// ── Hilfsfunktionen ─────────────────────────────────────────────────────────────

/** Tokenisiert den Rohtext in Wörter + Whitespace/Satzzeichen */
function tokenize(text) {
  // Jedes Token ist entweder ein "Wort" (alphanumerisch + Sonderzeichen) oder Whitespace
  return text.split(/(\s+)/).filter(t => t.length > 0).map((t, i) => ({
    id: i,
    text: t,
    isWhitespace: /^\s+$/.test(t),
  }));
}

/** Baut aus Tokens und Lücken-Set den [Klammer]-Text für das Backend */
function buildLueckentextString(tokens, blankIds) {
  return tokens
    .map(tok => {
      if (tok.isWhitespace) return tok.text;
      if (blankIds.has(tok.id)) return `[${tok.text}]`;
      return tok.text;
    })
    .join('');
}

// ── KI-Assistent Mini ────────────────────────────────────────────────────────────

function KIAssistentInline({ onAccept }) {
  const [sourceMaterial, setSourceMaterial] = useState('');
  const [targetWords, setTargetWords] = useState('');
  const [generating, setGenerating] = useState(false);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    if (!sourceMaterial.trim()) {
      toast.error('Bitte Quellmaterial eingeben.');
      return;
    }
    setGenerating(true);
    try {
      const res = await base44.functions.invoke('generateLueckentext', { sourceMaterial, targetWords });
      const text = res.data?.text || '';
      if (text) {
        onAccept(text);
        setOpen(false);
        setSourceMaterial('');
        setTargetWords('');
        toast.success('KI-Lückentext übernommen.');
      }
    } catch (e) {
      toast.error('Fehler beim Generieren: ' + (e?.message || 'Unbekannt'));
    } finally {
      setGenerating(false);
    }
  };

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/5">
        <Sparkles className="w-3.5 h-3.5" />
        KI-Assistent
      </Button>
    );
  }

  return (
    <div className="p-3 border border-primary/20 rounded-lg bg-primary/5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> KI-Assistent: Lückentext generieren
        </p>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <Textarea
        value={sourceMaterial}
        onChange={e => setSourceMaterial(e.target.value)}
        placeholder="Quelltext oder Themenbeschreibung..."
        className="min-h-20 text-sm"
        disabled={generating}
      />
      <Input
        value={targetWords}
        onChange={e => setTargetWords(e.target.value)}
        placeholder="Zielwörter (optional): Photosynthese, Chlorophyll, ..."
        disabled={generating}
      />
      <Button onClick={handleGenerate} disabled={generating || !sourceMaterial.trim()} className="gap-2 w-full" size="sm">
        {generating
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generiere…</>
          : <><Sparkles className="w-3.5 h-3.5" /> Generieren & übernehmen</>}
      </Button>
    </div>
  );
}

// ── Interaktive WYSIWYG-Vorschau ─────────────────────────────────────────────────

function WysiwygPreview({ tokens, blankIds, onToggle }) {
  if (tokens.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Gib oben einen Text ein – dann erscheint hier die interaktive Vorschau.
      </p>
    );
  }

  return (
    <div className="leading-loose text-sm select-none">
      {tokens.map(tok => {
        if (tok.isWhitespace) {
          return <span key={tok.id}>{tok.text}</span>;
        }
        const isBlank = blankIds.has(tok.id);
        return (
          <button
            key={tok.id}
            type="button"
            onClick={() => onToggle(tok.id, tok.text)}
            title={isBlank ? 'Klicken um Wort wiederherzustellen' : 'Klicken um Lücke zu erstellen'}
            className={[
              'inline rounded px-0.5 mx-px transition-all cursor-pointer border-b-2',
              isBlank
                ? 'bg-amber-100 border-amber-400 text-transparent min-w-[3rem] text-center'
                : 'border-transparent hover:bg-blue-100 hover:border-blue-400 text-foreground',
            ].join(' ')}
          >
            {isBlank ? <span className="text-transparent">{tok.text}</span> : tok.text}
          </button>
        );
      })}
    </div>
  );
}

// ── Distraktoren-Eingabe ─────────────────────────────────────────────────────────

function DistraktorenInput({ distraktoren, onChange }) {
  const [input, setInput] = useState('');

  const add = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    if (!distraktoren.includes(trimmed)) {
      onChange([...distraktoren, trimmed]);
    }
    setInput('');
  };

  const remove = (word) => onChange(distraktoren.filter(d => d !== word));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())}
          placeholder="Falsches Wort eingeben und Enter drücken..."
          className="text-sm h-8"
        />
        <Button type="button" size="sm" variant="outline" onClick={add} className="gap-1 h-8 shrink-0">
          <Plus className="w-3.5 h-3.5" /> Hinzufügen
        </Button>
      </div>
      {distraktoren.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {distraktoren.map(w => (
            <span key={w} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-red-800 text-xs font-medium">
              {w}
              <button type="button" onClick={() => remove(w)} className="text-red-500 hover:text-red-700 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Modal ──────────────────────────────────────────────────────────────────

export default function LueckentextWysiwygModal({ open, onOpenChange, initialData = {}, onSave, isSaving = false }) {
  // Rohtext (aus dem der Lehrer schreibt / KI liefert)
  const [rawText, setRawText] = useState(() => {
    // Beim Öffnen: falls schon lueckentext vorhanden, extrahieren wir den Rohtext
    if (initialData.lueckentext) {
      // Lücken-Marker entfernen → reiner Rohtext
      return initialData.lueckentext.replace(/\[([^\]]+)\]/g, '$1');
    }
    return '';
  });

  // Welche Token-IDs sind Lücken?
  const [blankIds, setBlankIds] = useState(() => {
    if (initialData.lueckentext) {
      // Beim Initialisieren: Lücken-Positionen aus dem gespeicherten Text wiederherstellen
      const tokens = tokenize(initialData.lueckentext.replace(/\[([^\]]+)\]/g, '$1'));
      const blanks = new Set();
      // Wir müssen die Klammern-Wörter mit den Token-Positionen matchen
      const regex = /\[([^\]]+)\]/g;
      let m;
      const blankWords = [];
      while ((m = regex.exec(initialData.lueckentext)) !== null) {
        blankWords.push(m[1]);
      }
      // Grobe Initalisierung: erste Übereinstimmungen markieren
      let blankIdx = 0;
      for (const tok of tokens) {
        if (!tok.isWhitespace && blankIdx < blankWords.length && tok.text === blankWords[blankIdx]) {
          blanks.add(tok.id);
          blankIdx++;
        }
      }
      return blanks;
    }
    return new Set();
  });

  const [distraktoren, setDistraktoren] = useState(initialData.distraktoren || []);

  // Tokens aus Rohtext
  const tokens = useMemo(() => tokenize(rawText), [rawText]);

  // Lückenwörter (einzigartig, sortiert nach Reihenfolge im Text)
  const lueckenWoerter = useMemo(() => {
    const words = [];
    for (const tok of tokens) {
      if (!tok.isWhitespace && blankIds.has(tok.id)) {
        if (!words.includes(tok.text)) words.push(tok.text);
      }
    }
    return words;
  }, [tokens, blankIds]);

  const handleToggle = useCallback((tokenId, word) => {
    setBlankIds(prev => {
      const next = new Set(prev);
      if (next.has(tokenId)) {
        next.delete(tokenId);
      } else {
        next.add(tokenId);
      }
      return next;
    });
  }, []);

  // Wenn der Rohtext sich ändert, Lücken zurücksetzen (Token-IDs sind jetzt anders)
  const handleRawTextChange = (newText) => {
    setRawText(newText);
    setBlankIds(new Set()); // Reset: Lücken müssen neu gesetzt werden
  };

  const handleKIAccept = (generatedText) => {
    // KI liefert [Wort]-Format → Rohtext extrahieren + Lücken vormarkieren
    const plain = generatedText.replace(/\[([^\]]+)\]/g, '$1');
    const toks = tokenize(plain);
    const blanks = new Set();
    const regex = /\[([^\]]+)\]/g;
    let m;
    const blankWords = [];
    while ((m = regex.exec(generatedText)) !== null) {
      blankWords.push(m[1]);
    }
    let blankIdx = 0;
    for (const tok of toks) {
      if (!tok.isWhitespace && blankIdx < blankWords.length && tok.text === blankWords[blankIdx]) {
        blanks.add(tok.id);
        blankIdx++;
      }
    }
    setRawText(plain);
    setBlankIds(blanks);
  };

  const handleSave = () => {
    if (blankIds.size === 0) {
      toast.error('Bitte mindestens ein Wort als Lücke markieren.');
      return;
    }
    if (!rawText.trim()) {
      toast.error('Bitte einen Text eingeben.');
      return;
    }
    const lueckentext = buildLueckentextString(tokens, blankIds);
    onSave({ lueckentext, lueckenWoerter, distraktoren });
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90dvh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold">Lückentext bearbeiten</DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gib den vollständigen Text ein – dann klicke auf Wörter um Lücken zu setzen.
          </p>
        </DialogHeader>

        {/* Scrollbarer Inhalt */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 min-h-0">

          {/* ── Bereich A: Texteingabe ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Schritt 1: Text eingeben</Label>
              <KIAssistentInline onAccept={handleKIAccept} />
            </div>
            <Textarea
              value={rawText}
              onChange={e => handleRawTextChange(e.target.value)}
              placeholder="Füge hier den vollständigen Text ein. Beispiel: Die Photosynthese findet in den Chloroplasten statt und erzeugt Glucose aus Kohlendioxid und Wasser."
              className="min-h-28 text-sm leading-relaxed"
            />
          </div>

          {/* ── Bereich B: Interaktive Vorschau ── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Schritt 2: Wörter anklicken um Lücken zu setzen
            </Label>
            <div className="p-4 rounded-lg border-2 border-dashed border-border bg-muted/30 min-h-[80px]">
              <WysiwygPreview tokens={tokens} blankIds={blankIds} onToggle={handleToggle} />
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              Klicke auf ein Wort → es wird zur Lücke (gelb unterstrichen). Nochmal klicken → Wort wiederhergestellt.
            </p>
          </div>

          {/* ── Wortspeicher ── */}
          {lueckenWoerter.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">
                Wortspeicher ({lueckenWoerter.length} Lösungswörter)
              </Label>
              <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-amber-50 border border-amber-200">
                {lueckenWoerter.map(w => (
                  <span key={w} className="px-2.5 py-1 rounded-full bg-amber-200 border border-amber-400 text-amber-900 text-xs font-semibold">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* ── Distraktoren ── */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">
              Schritt 3: Falsche Antworten hinzufügen (optional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Distraktoren erscheinen im Schüler-Schüttelkasten und machen die Aufgabe schwerer.
            </p>
            <DistraktorenInput distraktoren={distraktoren} onChange={setDistraktoren} />
          </div>

          {/* ── Schüler-Vorschau ── */}
          {lueckenWoerter.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Schüler-Vorschau</Label>
              <div className="p-4 rounded-lg border bg-white space-y-3">
                {/* Schüttelkasten */}
                <div className="flex flex-wrap gap-1.5 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-xs font-semibold text-blue-700 w-full mb-1">Wortbank:</span>
                  {[...lueckenWoerter, ...distraktoren].sort(() => Math.random() - 0.5).map((w, i) => (
                    <span key={i} className="px-2.5 py-1 bg-white border border-blue-300 rounded-md text-sm font-medium text-blue-800 shadow-sm">
                      {w}
                    </span>
                  ))}
                </div>
                {/* Text mit Lückenlinien */}
                <div className="leading-loose text-sm">
                  {tokens.map(tok => {
                    if (tok.isWhitespace) return <span key={tok.id}>{tok.text}</span>;
                    if (blankIds.has(tok.id)) {
                      return (
                        <span key={tok.id} className="inline-block border-b-2 border-slate-500 mx-0.5 px-1 min-w-[60px] text-transparent select-none">
                          {tok.text}
                        </span>
                      );
                    }
                    return <span key={tok.id}>{tok.text}</span>;
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border shrink-0 gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Abbrechen
          </Button>
          <Button onClick={handleSave} disabled={isSaving || blankIds.size === 0} className="gap-2">
            {isSaving
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</>
              : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}