/**
 * Brian-Aufgabe einer Unterrichtsphase konfigurieren (2026-08-16).
 *
 * Bewusst als Dialogfenster mit Registern umgesetzt: Die Lehrkraft beschreibt
 * erst Aufgabe und Erwartungshorizont, lässt daraus die vier Brian-Felder
 * generieren und verlässt den Dialog wieder – im Regieblatt bleibt nur die
 * kompakte Übergabe an Brian sichtbar.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Sparkles, Info } from 'lucide-react';
import { toast } from 'sonner';
import { istBrianVollstaendig } from '@/lib/stundenPhasen';

const PERSONAS = [
  { value: 'standard', label: 'Standard-Tutor – ausgewogenes Scaffolding' },
  { value: 'unterstuetzend', label: 'Unterstützender Tutor – viele Hilfestellungen' },
  { value: 'streng', label: 'Strenger Tutor – wenig Hilfestellungen' },
  { value: 'restriktiv', label: 'Restriktiver Tutor – keine Hinweise' },
];

export default function StundenBrianDialog({ open, onOpenChange, phase, stunde, stundeId }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('aufgabe');
  const [brian, setBrian] = useState(() => ({
    aufgabenstellung: '',
    erwartungshorizont: '',
    tutor_persona: 'standard',
    tutor_persona_zusatz: '',
    dialog_name: '',
    learner_instruction: '',
    system_instruction: '',
    completion_rule: '',
    ...(phase.brian || {}),
  }));

  const set = (feld, wert) => setBrian((b) => ({ ...b, [feld]: wert }));

  const generieren = useMutation({
    mutationFn: async () => {
      const res = await base44.functions.invoke('generateBrianSegments', {
        aufgabe: {
          titel: phase.phasenname || 'Aufgabe der Unterrichtsstunde',
          aufgabenstellung: brian.aufgabenstellung,
          erwartungshorizont: brian.erwartungshorizont,
          anforderungsebene: '2 - Transfer',
          aufgaben_typ: 'inhalt',
          tutor_persona: brian.tutor_persona,
          tutor_persona_zusatz: brian.tutor_persona_zusatz,
        },
        einheit: {
          fach: stunde?.fach,
          jahrgangsstufe: stunde?.jahrgangsstufe,
          titel_der_einheit: stunde?.arbeitstitel,
        },
      });
      const s = res.data?.segments;
      if (!s) throw new Error('Es wurden keine Brian-Felder zurückgegeben.');
      return s;
    },
    onSuccess: (s) => {
      setBrian((b) => ({
        ...b,
        dialog_name: s.brian_dialog_name || b.dialog_name,
        learner_instruction: s.brian_learner_instruction || b.learner_instruction,
        system_instruction: s.brian_system_instruction || b.system_instruction,
        completion_rule: s.brian_completion_rule || b.completion_rule,
        generiert_am: new Date().toISOString(),
      }));
      setTab('uebergabe');
      toast.success('Brian-Felder generiert – bitte prüfen und speichern.');
    },
    onError: (err) => toast.error(err?.message || 'Die Brian-Felder konnten nicht generiert werden.'),
  });

  const speichern = useMutation({
    mutationFn: () =>
      base44.entities.StundenSequenz.update(phase.id, {
        brian,
        is_complete: istBrianVollstaendig(brian),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stundeId] });
      toast.success('Brian-Aufgabe gespeichert.');
      onOpenChange(false);
    },
    onError: (err) => toast.error(err?.message || 'Die Brian-Aufgabe konnte nicht gespeichert werden.'),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Brian-Aufgabe · {phase.phasenname || 'Phase'}</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="aufgabe">1. Aufgabe</TabsTrigger>
            <TabsTrigger value="erwartung">2. Erwartungshorizont</TabsTrigger>
            <TabsTrigger value="uebergabe">3. Übergabe an Brian</TabsTrigger>
          </TabsList>

          <TabsContent value="aufgabe" className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Aufgabenstellung für die Schüler</Label>
              <Textarea
                rows={7}
                value={brian.aufgabenstellung}
                onChange={(e) => set('aufgabenstellung', e.target.value)}
                placeholder="Was sollen die Schüler in dieser Phase erarbeiten?"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Betreuungsstil des KI-Tutors</Label>
              <Select value={brian.tutor_persona} onValueChange={(v) => set('tutor_persona', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERSONAS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea
                rows={2}
                className="mt-2"
                value={brian.tutor_persona_zusatz}
                onChange={(e) => set('tutor_persona_zusatz', e.target.value)}
                placeholder="Ergänzende Hinweise zum Betreuungsstil (optional)"
              />
            </div>
          </TabsContent>

          <TabsContent value="erwartung" className="space-y-3 mt-4">
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              Nicht schülersichtbar – Brian nutzt dies als fachliche Messlatte für sein Feedback.
            </p>
            <Textarea
              rows={10}
              value={brian.erwartungshorizont}
              onChange={(e) => set('erwartungshorizont', e.target.value)}
              placeholder="Welche Aspekte soll eine gute Bearbeitung enthalten?"
            />
          </TabsContent>

          <TabsContent value="uebergabe" className="space-y-3 mt-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-muted-foreground">
                Diese vier Felder werden an Brian übergeben. Sie können sie nachschärfen.
              </p>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => generieren.mutate()}
                disabled={generieren.isPending || !brian.aufgabenstellung.trim()}
              >
                {generieren.isPending
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird erstellt…</>
                  : <><Sparkles className="w-3.5 h-3.5" /> Mit KI befüllen</>}
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">1 · Dialogname</Label>
              <Input value={brian.dialog_name} onChange={(e) => set('dialog_name', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">2 · Anweisung für Lernende (schülersichtbar)</Label>
              <Textarea rows={4} value={brian.learner_instruction} onChange={(e) => set('learner_instruction', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">3 · Interne Anweisung für den Chatbot</Label>
              <Textarea rows={10} value={brian.system_instruction} onChange={(e) => set('system_instruction', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">4 · Wann ist der Dialog beendet?</Label>
              <Textarea rows={3} value={brian.completion_rule} onChange={(e) => set('completion_rule', e.target.value)} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button onClick={() => speichern.mutate()} disabled={speichern.isPending}>
            {speichern.isPending ? 'Wird gespeichert…' : 'Brian-Aufgabe speichern'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}