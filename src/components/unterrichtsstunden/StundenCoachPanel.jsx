import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Bot, Send, User } from 'lucide-react';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

/**
 * KI-Stunden-Coach (MUG Paket 2): Dialog-Fenster.
 * Die Lehrkraft beschreibt frei, was sie vorhat; der Coach antwortet und
 * pflegt dabei die Bauanleitung (Steckbrief, Verlaufsplan, Hinweise), die
 * an der Stunde gespeichert bleibt.
 */
export default function StundenCoachPanel({ stunde }) {
  const [eingabe, setEingabe] = useState('');
  const queryClient = useQueryClient();
  const verlauf = Array.isArray(stunde.coach_verlauf) ? stunde.coach_verlauf : [];

  const senden = useMutation({
    mutationFn: async (nachricht) => {
      const res = await base44.functions.invoke('stundenCoachChat', {
        stunde_id: stunde.id,
        nachricht,
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      setEingabe('');
      queryClient.invalidateQueries({ queryKey: ['unterrichtsstunde', stunde.id] });
    },
  });

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bot className="w-4 h-4 text-amber-700" />
        <h3 className="text-sm font-bold text-foreground">KI-Stunden-Coach</h3>
      </div>

      {verlauf.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Beschreiben Sie frei, was Sie in dieser Stunde vorhaben — Klasse, Thema, Dauer, geplanter Ablauf.
          Der Coach baut daraus Steckbrief, Verlaufsplan und Hinweise auf und fragt nach, wo noch etwas fehlt.
        </p>
      ) : (
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {verlauf.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && <Bot className="w-4 h-4 mt-1 text-amber-700 shrink-0" />}
              <div
                className={`rounded-lg px-3 py-2 text-sm max-w-[80%] whitespace-pre-line ${
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border text-foreground'
                }`}
              >
                {m.content}
              </div>
              {m.role === 'user' && <User className="w-4 h-4 mt-1 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {senden.isError && (
        <p className="text-sm text-destructive">{senden.error?.message || 'Der Coach konnte nicht antworten.'}</p>
      )}

      <Textarea
        rows={4}
        placeholder="z.B. Neunte Klasse, 20 Schüler, 65 Minuten. Einstieg über die Frage, wie sie mit 25 leben wollen, dann Gruppenarbeit zu Berufsfeldern..."
        value={eingabe}
        onChange={(e) => setEingabe(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => senden.mutate(eingabe.trim())}
          disabled={!eingabe.trim() || senden.isPending}
          className="gap-2"
        >
          {senden.isPending
            ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send className="w-4 h-4" />}
          An den Coach senden
        </Button>
        <SpeechInputButton
          value={eingabe}
          onResult={setEingabe}
          disabled={senden.isPending}
          maxSeconds={120}
          label="Aufsprechen"
          listeningLabel="Aufnahme beenden"
        />
      </div>
    </div>
  );
}