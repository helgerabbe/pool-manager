/**
 * KI-Mit-Erstellung einer digitalen Aufgabe (MUG, 2026-08-16).
 *
 * Steht im Verlaufsplan unter jeder digitalen Phase: Soll die KI die Aufgabe
 * beim Generieren der Stunde gleich mitbauen? Wenn ja, werden Aufgabenart und
 * zusätzliche Hinweise gepflegt. Der KI-Generator füllt diese Felder aus dem
 * Gespräch selbst vor; die Lehrkraft kann alles überschreiben.
 */
import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const HINWEIS_PLATZHALTER =
  'z. B. Achsen des Gitters: viel Kontakt zu Menschen / eher handwerklich; nur die Berufe vom Arbeitsblatt verwenden';

export default function StundenPlanKiAufgabeFelder({ stunde, plan, index }) {
  const queryClient = useQueryClient();
  const phase = (plan?.verlaufsplan || [])[index] || {};
  const [hinweis, setHinweis] = React.useState(phase.ki_hinweis || '');

  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalogAktiv'],
    queryFn: () => base44.entities.AktivitaetenKatalog.filter({ is_active: true }, 'name', 200),
  });

  const speichern = useMutation({
    mutationFn: async (patch) => {
      const verlaufsplan = (plan?.verlaufsplan || []).map((p, i) => (i === index ? { ...p, ...patch } : p));
      return base44.entities.Unterrichtsstunde.update(stunde.id, {
        coach_plan: { ...plan, verlaufsplan },
        coach_plan_updated_at: new Date().toISOString(),
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['unterrichtsstunde', stunde.id] }),
    onError: (err) => toast.error(err?.message || 'Konnte nicht gespeichert werden.'),
  });

  const aktiv = phase.ki_erstellen === true;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-700 shrink-0" />
        <Label className="text-xs font-semibold flex-1">
          Digitale Aufgabe von der KI gleich mit erstellen
        </Label>
        <Switch
          checked={aktiv}
          onCheckedChange={(v) => speichern.mutate({ ki_erstellen: v })}
          disabled={speichern.isPending}
        />
      </div>

      {aktiv && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">Welche Aufgabenart?</Label>
            <Select
              value={phase.ki_aktivitaet || ''}
              onValueChange={(v) => speichern.mutate({ ki_aktivitaet: v })}
            >
              <SelectTrigger className="bg-card h-9">
                <SelectValue placeholder="Aufgabenart auswählen" />
              </SelectTrigger>
              <SelectContent>
                {katalog.map((k) => (
                  <SelectItem key={k.id} value={k.name}>{k.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Zusätzliche Informationen zur Aufgabe</Label>
            <Textarea
              className="bg-card"
              rows={3}
              value={hinweis}
              onChange={(e) => setHinweis(e.target.value)}
              onBlur={() => {
                if (hinweis !== (phase.ki_hinweis || '')) speichern.mutate({ ki_hinweis: hinweis });
              }}
              placeholder={HINWEIS_PLATZHALTER}
            />
          </div>
        </div>
      )}
    </div>
  );
}