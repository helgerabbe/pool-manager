/**
 * FachEinsatzPanel.jsx
 *
 * Aufgeklappte Detailansicht eines Fachs in den Systemeinstellungen: Welche
 * Lehrkräfte unterrichten dieses Fach derzeit in Jahrgang 9?
 *
 * Moodle braucht diese Zuordnung, um zu wissen, wer in der Poolzeit eines
 * Jahrgangs welche Fachinhalte sehen darf. Eingetragen wird von Hand; die
 * Übernahme aus WebUntis kommt später und schreibt in dieselbe Zuordnung.
 */
import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

// Vorerst nur Jahrgang 9 — bewusst eng gehalten, damit nichts durcheinandergerät.
const JAHRGANG = '9';

export default function FachEinsatzPanel({ fach }) {
  const queryClient = useQueryClient();
  const [waehlen, setWaehlen] = useState(false);

  const queryKey = ['fachEinsatz', fach, JAHRGANG];
  const { data: einsaetze = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => base44.entities.FachEinsatz.filter({ fach, jahrgangsstufe: JAHRGANG }),
  });

  const { data: lehrkraefte = [] } = useQuery({
    queryKey: ['benutzerAktiv'],
    queryFn: () => base44.entities.Benutzer.filter({ ist_aktiv: true }, 'nachname', 500),
    enabled: waehlen,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const hinzufuegen = useMutation({
    mutationFn: (person) =>
      base44.entities.FachEinsatz.create({
        fach,
        jahrgangsstufe: JAHRGANG,
        lehrkraft_email: person.email,
        lehrkraft_name: person.name,
        quelle: 'manuell',
      }),
    onSuccess: () => { invalidate(); setWaehlen(false); },
    onError: (err) => toast.error(err?.message || 'Konnte nicht hinzugefügt werden.'),
  });

  const entfernen = useMutation({
    mutationFn: (id) => base44.entities.FachEinsatz.delete(id),
    onSuccess: invalidate,
    onError: (err) => toast.error(err?.message || 'Konnte nicht entfernt werden.'),
  });

  const vergeben = new Set(einsaetze.map((e) => e.lehrkraft_email));
  const auswahl = lehrkraefte
    .filter((b) => b.user_id && !vergeben.has(b.user_id))
    .map((b) => ({
      email: b.user_id,
      name: `${b.vorname || ''} ${b.nachname || ''}`.trim() || b.user_id,
    }));

  return (
    <div className="bg-muted/30 px-10 py-3 space-y-2 border-t">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          Unterrichtet in Jahrgang {JAHRGANG}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          onClick={() => setWaehlen((v) => !v)}
        >
          <UserPlus className="w-3.5 h-3.5" />
          Lehrkraft hinzufügen
        </Button>
      </div>

      {waehlen && (
        <Select
          onValueChange={(email) => {
            const person = auswahl.find((p) => p.email === email);
            if (person) hinzufuegen.mutate(person);
          }}
        >
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="Lehrkraft auswählen…" />
          </SelectTrigger>
          <SelectContent>
            {auswahl.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Keine weitere Lehrkraft verfügbar.
              </div>
            ) : (
              auswahl.map((p) => (
                <SelectItem key={p.email} value={p.email}>
                  {p.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Wird geladen…</p>
      ) : einsaetze.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Noch keine Lehrkraft für Jahrgang {JAHRGANG} eingetragen.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {einsaetze.map((e) => (
            <span
              key={e.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs"
            >
              {e.lehrkraft_name || e.lehrkraft_email}
              <button
                type="button"
                onClick={() => entfernen.mutate(e.id)}
                className="text-muted-foreground hover:text-destructive"
                title="Zuordnung entfernen"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}