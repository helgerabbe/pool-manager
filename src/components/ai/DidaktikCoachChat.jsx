import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Send, Sparkles, Bot, User, ArrowDownToLine, RotateCcw } from 'lucide-react';

// ── Erkennung: Enthält die Nachricht einen finalen Strukturentwurf? ────────────
function isFinalStruktur(text) {
  return /Einheit:/i.test(text) && /Lernpaket\s*1:/i.test(text);
}

// ── Typing-Indikator ──────────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 max-w-[80%]">
      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-card border border-border">
        <div className="flex items-center gap-1.5 h-4">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: '1s' }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Einzelne Nachricht ────────────────────────────────────────────────────────
function ChatBubble({ message, onUebernehmen }) {
  const isUser = message.role === 'user';
  const isFinal = !isUser && isFinalStruktur(message.content);

  return (
    <div className={cn('flex items-end gap-2', isUser ? 'flex-row-reverse' : 'flex-row', 'max-w-full')}>
      {/* Avatar */}
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center shrink-0 mb-0.5',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
      )}>
        {isUser
          ? <User className="w-4 h-4" />
          : <Bot className="w-4 h-4 text-primary" />
        }
      </div>

      {/* Bubble + Übernehmen-Button */}
      <div className={cn('flex flex-col gap-2', isUser ? 'items-end max-w-[75%]' : 'items-start max-w-[80%]')}>
        <div className={cn(
          'px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-sm'
            : isFinal
              ? 'bg-green-50 border-2 border-green-300 text-foreground rounded-bl-sm'
              : 'bg-card border border-border text-foreground rounded-bl-sm'
        )}>
          {isFinal && (
            <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-green-200">
              <Sparkles className="w-3.5 h-3.5 text-green-600" />
              <span className="text-[11px] font-semibold text-green-700 uppercase tracking-wide">
                Finaler Strukturentwurf
              </span>
            </div>
          )}
          {message.content}
        </div>

        {/* Übergabe-Button — nur bei finalem Entwurf */}
        {isFinal && onUebernehmen && (
          <Button
            size="sm"
            variant="outline"
            className="gap-2 border-green-400 text-green-700 hover:bg-green-50 hover:text-green-800"
            onClick={() => onUebernehmen(message.content)}
          >
            <ArrowDownToLine className="w-3.5 h-3.5" />
            In den Braindump-Generator übernehmen
          </Button>
        )}
      </div>
    </div>
  );
}

// ── Haupt-Chat-Komponente ─────────────────────────────────────────────────────
export default function DidaktikCoachChat({ onBraindumpUebernehmen }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  // Automatisch nach unten scrollen
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', content: text };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    const response = await base44.functions.invoke('didaktikCoach', {
      messages: newHistory.map(m => ({ role: m.role, content: m.content })),
    });

    const reply = response?.data?.reply || '(Keine Antwort erhalten)';
    setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    setIsLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[600px] rounded-xl border border-border overflow-hidden bg-background">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-gradient-to-r from-primary/5 to-purple-50 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-foreground">Didaktik-Coach</h3>
            <p className="text-[11px] text-muted-foreground">
              Strukturiert Ihre Ideen ins Atom-Modell (Ebene 1)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-[10px]">
            {messages.length} Nachrichten
          </Badge>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleReset}>
              <RotateCcw className="w-3 h-3" />
              Neu starten
            </Button>
          )}
        </div>
      </div>

      {/* Nachrichtenverlauf */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center">
              <Bot className="w-7 h-7 text-primary/60" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Hallo! Ich bin Ihr Didaktik-Coach.</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Erzählen Sie mir von Ihrem Unterrichtsthema — ich helfe Ihnen, daraus
                feingranulare Lernpakete im Atom-Modell zu strukturieren.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {[
                'Wir brauchen Lernpakete zu linearen Gleichungen (Klasse 8)',
                'Thema: Kurzgeschichte analysieren (Deutsch Jg. 10)',
                'Zelle und Zellorganellen für Biologie Klasse 7',
              ].map(prompt => (
                <button
                  key={prompt}
                  onClick={() => { setInput(prompt); textareaRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-full text-xs bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors border border-border"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <ChatBubble
            key={idx}
            message={msg}
            onUebernehmen={onBraindumpUebernehmen}
          />
        ))}

        {isLoading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* Eingabe-Bereich */}
      <div className="shrink-0 p-4 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Schreiben Sie Ihre Ideen oder stellen Sie eine Frage… (Enter = Senden, Shift+Enter = Zeilenumbruch)"
            className="flex-1 min-h-[240px] max-h-[400px] resize-none text-sm"
            disabled={isLoading}
            rows={10}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-12 w-12 shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 text-center">
          Der Coach führt Sie Schritt für Schritt — am Ende können Sie den Entwurf direkt übernehmen.
        </p>
      </div>
    </div>
  );
}