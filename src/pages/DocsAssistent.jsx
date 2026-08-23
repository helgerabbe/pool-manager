/**
 * DocsAssistent.jsx
 *
 * Der Einstieg in die Hilfe: ein Chat mit dem Pool-Manager-Assistenten.
 * Er kennt die komplette Dokumentation, antwortet in Klartext und verlinkt
 * am Ende jeder Antwort die Kapitel zum Nachlesen. Die vollständige
 * Dokumentation bleibt jederzeit über die Seitenleiste erreichbar.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, User, Loader2, BookOpen, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import AssistentAntwort from '@/components/docs/assistent/AssistentAntwort';
import AssistentEingabe from '@/components/docs/assistent/AssistentEingabe';
import { frageAssistenten, START_FRAGEN } from '@/lib/docsAssistent';

export default function DocsAssistent() {
  const [nachrichten, setNachrichten] = useState([]);
  const [busy, setBusy] = useState(false);
  const endeRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    endeRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [nachrichten, busy]);

  const senden = async (frage, dateiUrls = []) => {
    const verlauf = nachrichten.map((n) => ({ role: n.role, content: n.antwort || n.content }));
    setNachrichten((prev) => [...prev, { role: 'user', content: frage, dateien: dateiUrls.length }]);
    setBusy(true);
    try {
      const res = await frageAssistenten({ frage, verlauf, dateiUrls });
      setNachrichten((prev) => [...prev, { role: 'assistant', ...res }]);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Der Assistent konnte nicht antworten',
        description: err?.message || 'Bitte versuche es noch einmal.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Kopf */}
      <div className="px-5 py-4 border-b border-border bg-card shrink-0">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold tracking-tight">Pool-Manager-Assistent</h1>
            <p className="text-xs text-muted-foreground">
              Frag mich alles zur App – Bedienung wie Didaktik. Ich zeige dir auch, wo es in der
              Dokumentation steht.
            </p>
          </div>
          <Button variant="outline" size="sm" asChild className="shrink-0 hidden sm:inline-flex">
            <Link to="/docs/uebersicht">
              <BookOpen className="w-4 h-4" /> Alle Kapitel
            </Link>
          </Button>
        </div>
      </div>

      {/* Verlauf */}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-5 space-y-5">
        {nachrichten.length === 0 && (
          <div className="max-w-2xl mx-auto text-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-lg font-semibold mb-1.5">Was möchtest du wissen?</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Stell deine Frage in eigenen Worten. Du kannst auch ein Foto oder PDF anhängen – etwa
              ein Arbeitsblatt, das du digitalisieren möchtest.
            </p>
            <div className="grid sm:grid-cols-2 gap-2 text-left">
              {START_FRAGEN.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => senden(f)}
                  className="text-sm px-3 py-2.5 rounded-lg border border-border bg-card hover:border-primary/40 hover:bg-muted/50 transition-colors"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {nachrichten.map((n, i) =>
          n.role === 'user' ? (
            <div key={i} className="flex gap-3 justify-end">
              <div className="rounded-xl bg-primary text-primary-foreground px-4 py-2.5 text-sm max-w-[80%] whitespace-pre-wrap">
                {n.content}
                {n.dateien > 0 && (
                  <span className="mt-1.5 flex items-center gap-1 text-[11px] opacity-80">
                    <Paperclip className="w-3 h-3" /> {n.dateien} Anhang
                    {n.dateien > 1 ? 'e' : ''}
                  </span>
                )}
              </div>
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
          ) : (
            <AssistentAntwort key={i} nachricht={n} />
          )
        )}

        {busy && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="rounded-xl bg-card border border-border px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Ich schaue in der Dokumentation nach…
            </div>
          </div>
        )}

        <div ref={endeRef} />
      </div>

      <AssistentEingabe onSenden={senden} busy={busy} />
    </div>
  );
}