/**
 * KI-Generator für die digitale Aufgabe EINER Stunden-Phase (MUG).
 *
 * Ablauf wie in den Einheiten: Beschreiben → „KI-Aufgabe generieren" →
 * Vorschau prüfen → „So übernehmen" (oder neu generieren/verwerfen).
 * Erst beim Übernehmen wird der Inhalt in die Phase geschrieben.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Check, RotateCcw, X } from 'lucide-react';
import { toast } from 'sonner';
import SpeechInputButton from '@/components/ui/SpeechInputButton';
import StundenAufgabeVorschau from '@/components/unterrichtsstunden/StundenAufgabeVorschau';

export default function StundenAufgabeKiGenerator({ phase, katalogEntry, stundeId }) {
  const queryClient = useQueryClient();
  const [hinweis, setHinweis] = useState('');
  const [vorschau, setVorschau] = useState(null);

  const generieren = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateStundenAufgabe', {
        stunde_id: stundeId,
        phase_id: phase.id,
        hinweis,
        preview: true,
      });
      return res?.data || {};
    },
    onSuccess: (d) => {
      if (!d.success) {
        toast.error(d.reason || d.error || 'Die Aufgabe konnte nicht erstellt werden.');
        return;
      }
      setVorschau(d.field_values || {});
    },
    onError: (e) => toast.error(e?.message || 'Die Aufgabe konnte nicht erstellt werden.'),
  });

  const uebernehmen = useMutation({
    mutationFn: () =>
      base44.entities.StundenSequenz.update(phase.id, { field_values: vorschau, is_complete: true }),
    onSuccess: () => {
      setVorschau(null);
      queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stundeId] });
      toast.success('Aufgabe übernommen.');
    },
    onError: (e) => toast.error(e?.message || 'Übernehmen fehlgeschlagen.'),
  });

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 space-y-3">
      <div>
        <p className="text-sm font-semibold text-indigo-900 inline-flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Aufgabe von der KI erstellen lassen
        </p>
        <p className="text-xs text-indigo-800/80">
          Beschreiben Sie, was die Schüler in dieser Phase tun sollen. Sie sehen das Ergebnis zuerst als
          Vorschau und übernehmen es erst, wenn es passt.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Ihre Beschreibung der Aufgabe</Label>
        <Textarea
          value={hinweis}
          onChange={(e) => setHinweis(e.target.value)}
          placeholder="z. B. Die Schüler sollen anhand von drei Beispielen erkennen, warum …"
          className="min-h-[90px] bg-white"
        />
        <SpeechInputButton
          value={hinweis}
          onResult={setHinweis}
          maxSeconds={60}
          label="Beschreibung einsprechen"
          listeningLabel="Aufnahme stoppen"
        />
      </div>

      {!vorschau && (
        <Button
          size="sm"
          className="gap-2"
          onClick={() => generieren.mutate()}
          disabled={generieren.isPending}
        >
          {generieren.isPending
            ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Sparkles className="w-3.5 h-3.5" />}
          KI-Aufgabe jetzt generieren
        </Button>
      )}

      {vorschau && (
        <div className="space-y-3">
          <StundenAufgabeVorschau fieldValues={vorschau} katalogEntry={katalogEntry} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-2" onClick={() => uebernehmen.mutate()} disabled={uebernehmen.isPending}>
              <Check className="w-3.5 h-3.5" /> So übernehmen
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => generieren.mutate()} disabled={generieren.isPending}>
              <RotateCcw className="w-3.5 h-3.5" /> Neu generieren
            </Button>
            <Button size="sm" variant="ghost" className="gap-2" onClick={() => setVorschau(null)}>
              <X className="w-3.5 h-3.5" /> Verwerfen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}