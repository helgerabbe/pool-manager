/**
 * ErwartungshorizontTab.jsx
 *
 * Tab 2 im Detail-Panel für Allgemeine Aufgaben.
 * Zeigt einen schreibgeschützten Review der Aufgabe,
 * einen "Musterlösung generieren"-Button (Platzhalter),
 * einen Rich-Text-Editor für die Musterlösung und
 * ein Chat-Fenster für iterative KI-Anpassungen.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sparkles, Send, FileText, Star, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Schreibgeschützte Aufgaben-Zusammenfassung ────────────────────────────────
function AufgabenReview({ aufgabe }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Aufgaben-Review
        </span>
        {aufgabe.ergebnis_form && (
          <Badge variant="outline" className="text-[10px] ml-auto">{aufgabe.ergebnis_form}</Badge>
        )}
        {aufgabe.ergebnis_dateiformat && (
          <Badge variant="outline" className="text-[10px]">{aufgabe.ergebnis_dateiformat}</Badge>
        )}
      </div>

      {aufgabe.titel && (
        <p className="text-sm font-semibold">{aufgabe.titel}</p>
      )}

      <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
        {aufgabe.aufgabenstellung || <span className="italic text-muted-foreground">Keine Aufgabenstellung</span>}
      </div>

      {/* Materialien-Vorschau */}
      {aufgabe.materialien && aufgabe.materialien.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {aufgabe.materialien.map((mat, idx) => (
            <span key={idx} className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5">
              {mat.type === 'freitext' && '📝'}
              {mat.type === 'pdf' && '📄'}
              {mat.type === 'image' && '🖼️'}
              {mat.type === 'book_ref' && '📚'}
              {' '}{mat.label || mat.content?.slice(0, 30) || mat.url?.slice(0, 30) || '…'}
            </span>
          ))}
        </div>
      )}

      {/* Schwierigkeit */}
      {aufgabe.schwierigkeitsgrad && (
        <div className="flex gap-0.5">
          {[1, 2, 3].map(n => (
            <Star key={n} className={cn('w-3 h-3', n <= aufgabe.schwierigkeitsgrad ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/20')} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Einfacher Rich-Text-Editor (Textarea mit Toolbar-Hint) ────────────────────
function MusterloesungEditor({ value, onChange, disabled }) {
  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-muted-foreground">Musterlösung / Erwartungshorizont</span>
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Hier wird die Musterlösung eingefügt. Manuell bearbeiten oder über die KI generieren…"
        className="flex-1 w-full px-4 py-3 text-sm resize-none bg-background focus:outline-none disabled:opacity-50"
        style={{ minHeight: '220px' }}
      />
    </div>
  );
}

// ── Chat-Panel für iterative KI-Anpassungen ───────────────────────────────────
function AssistenzChat({ messages, onSend, isLoading }) {
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    onSend(text);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-muted/40 border-b border-border shrink-0">
        <span className="text-xs font-semibold text-muted-foreground">KI-Assistenz</span>
        <p className="text-[10px] text-muted-foreground/70 mt-0.5">Anpassungsbefehle an die KI senden</p>
      </div>

      {/* Nachrichtenverlauf */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-muted/10">
        {messages.length === 0 ? (
          <p className="text-[11px] text-muted-foreground/60 italic text-center py-6">
            Noch keine Nachrichten.<br />Generiere zuerst eine Musterlösung.
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div className={cn(
                'max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground'
              )}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-xl px-3 py-2">
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Eingabe */}
      <div className="shrink-0 p-2 border-t border-border bg-background flex gap-2">
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="z.B. 'Kürze die Lösung auf 3 Punkte' oder 'Füge ein Beispiel hinzu…'"
          disabled={isLoading}
          className="flex-1 px-3 py-1.5 text-xs border border-border rounded-lg resize-none bg-background focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          rows={2}
        />
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="shrink-0 self-end h-8 w-8"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ── Haupt-Tab-Komponente ──────────────────────────────────────────────────────
export default function ErwartungshorizontTab({ aufgabe, kannBearbeiten }) {
  const queryClient = useQueryClient();
  const [musterloesung, setMusterloesung] = useState(aufgabe?.musterloesung || '');
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Musterlösung synchronisieren wenn Aufgabe wechselt
  useEffect(() => {
    setMusterloesung(aufgabe?.musterloesung || '');
    setChatMessages([]);
    setIsDirty(false);
  }, [aufgabe?.id]);

  // Speichern
  const saveMutation = useMutation({
    mutationFn: (text) => base44.entities.AllgemeineAufgabe.update(aufgabe.id, { musterloesung: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setIsDirty(false);
      toast.success('Musterlösung gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  const handleEditorChange = (val) => {
    setMusterloesung(val);
    setIsDirty(true);
  };

  // Platzhalter: Musterlösung generieren (wird in späterem Schritt mit KI verdrahtet)
  const handleGenerate = async () => {
    setGenerating(true);
    await new Promise(r => setTimeout(r, 600)); // Platzhalter-Delay
    toast.info('KI-Generierung wird in einem späteren Schritt implementiert.');
    setGenerating(false);
  };

  // Platzhalter: Chat-Nachricht senden
  const handleChatSend = async (text) => {
    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setChatLoading(true);
    await new Promise(r => setTimeout(r, 500));
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: 'KI-Chat wird in einem späteren Schritt implementiert.',
    }]);
    setChatLoading(false);
  };

  if (!aufgabe) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Scrollbarer Innenbereich */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">

        {/* Bereich 1: Aufgaben-Review */}
        <AufgabenReview aufgabe={aufgabe} />

        <Separator />

        {/* Bereich 2: Generieren-Button */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleGenerate}
            disabled={generating || !kannBearbeiten}
            className="gap-2"
          >
            {generating
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Generiert…</>
              : <><Sparkles className="w-4 h-4" /> Musterlösung generieren</>
            }
          </Button>
          {isDirty && kannBearbeiten && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveMutation.mutate(musterloesung)}
              disabled={saveMutation.isPending}
              className="gap-2"
            >
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Speichern
            </Button>
          )}
          {!kannBearbeiten && (
            <span className="text-xs text-muted-foreground">Schreibgeschützt</span>
          )}
        </div>

        {/* Bereich 3: Split-Layout Editor + Chat */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4" style={{ minHeight: '320px' }}>
          {/* Linke Seite: Editor */}
          <MusterloesungEditor
            value={musterloesung}
            onChange={handleEditorChange}
            disabled={!kannBearbeiten}
          />

          {/* Rechte Seite: Chat */}
          <AssistenzChat
            messages={chatMessages}
            onSend={handleChatSend}
            isLoading={chatLoading}
          />
        </div>

      </div>
    </div>
  );
}