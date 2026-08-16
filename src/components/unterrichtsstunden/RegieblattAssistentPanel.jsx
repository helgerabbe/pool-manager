import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, X, Loader2 } from 'lucide-react';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

/**
 * Anpassungs-Assistent für das Stunden-Regieblatt (MUG, 2026-08-16):
 * Bewusst KEIN Dialog, sondern ein aufklappbares Feld direkt über der
 * Phasenliste — die Lehrkraft sieht ihr Regieblatt beim Formulieren weiter.
 */
export default function RegieblattAssistentPanel({ stundeId }) {
  const [offen, setOffen] = React.useState(false);
  const [text, setText] = React.useState('');
  const [antwort, setAntwort] = React.useState('');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (anweisung) => {
      const res = await base44.functions.invoke('regieblattAssistent', { stunde_id: stundeId, anweisung });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: (data) => {
      setAntwort(data?.antwort || 'Erledigt.');
      setText('');
      queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stundeId] });
    },
  });

  if (!offen) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOffen(true)}>
        <Sparkles className="w-4 h-4 text-accent" />
        KI-Assistent: Regieblatt anpassen
      </Button>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Sparkles className="w-4 h-4 text-accent mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">Regieblatt anpassen</p>
          <p className="text-xs text-muted-foreground">
            Beschreiben Sie kurz, was geändert werden soll – z. B. „Füge zwischen Phase 3 und 4 eine
            digitale Aufgabe zum Lesen einer Statistik ein" oder „Tausche Phase 2 und 3".
          </p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOffen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Was soll am Regieblatt geändert werden?"
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="gap-2"
          disabled={!text.trim() || mutation.isPending}
          onClick={() => mutation.mutate(text.trim())}
        >
          {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {mutation.isPending ? 'Wird umgesetzt…' : 'Umsetzen'}
        </Button>
        <SpeechInputButton value={text} onResult={setText} />
      </div>

      {mutation.isError && (
        <p className="text-xs text-destructive">{mutation.error?.message || 'Das hat nicht funktioniert.'}</p>
      )}
      {antwort && !mutation.isPending && (
        <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md p-2">{antwort}</p>
      )}
    </div>
  );
}