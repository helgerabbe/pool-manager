import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const NEUE_EINHEIT = '__neu__';

/** Dreistelliger Zufalls-Code (100-999) für Notfall-/Phasen-Freischaltung. */
export function dreistelligerCode() {
  return String(Math.floor(100 + Math.random() * 900));
}

/**
 * Eine Unterrichtsstunde anlegen. Sie gehört immer zu einer
 * UNTERRICHTSEINHEIT — der thematischen Mappe im Bereich „Mein Unterricht"
 * (z. B. „Rechtschreibung"). Das ist bewusst NICHT eine „Einheit" im Sinne des
 * vollständigen Lernszenarios mit Dashboards und Moodle-Kurs; deshalb entsteht
 * hier auch keine solche Einheit mehr.
 */
export default function StundeErstellenModal({ open, onOpenChange, besitzerEmail, onCreated }) {
  const [arbeitstitel, setArbeitstitel] = useState('');
  const [mappeId, setMappeId] = useState('');
  const [datum, setDatum] = useState('');
  const [neuTitel, setNeuTitel] = useState('');
  const [neuFach, setNeuFach] = useState('');
  const [neuJahrgang, setNeuJahrgang] = useState('');
  const queryClient = useQueryClient();
  const neueMappe = mappeId === NEUE_EINHEIT;

  const { data: mappen = [] } = useQuery({
    queryKey: ['unterrichtseinheiten', besitzerEmail],
    queryFn: () => base44.entities.Unterrichtseinheit.filter({ besitzer_email: besitzerEmail }, 'fach', 200),
    enabled: open && !!besitzerEmail,
  });
  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecherAktiv'],
    queryFn: () => base44.entities.LookupFaecher.filter({ ist_aktiv: true }, 'reihenfolge', 100),
    enabled: neueMappe,
  });
  const { data: jahrgaenge = [] } = useQuery({
    queryKey: ['lookupJahrgaengeAktiv'],
    queryFn: () => base44.entities.LookupJahrgaenge.filter({ ist_aktiv: true }, 'reihenfolge', 100),
    enabled: neueMappe,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let mappe = mappen.find((m) => m.id === mappeId);

      if (neueMappe) {
        mappe = await base44.entities.Unterrichtseinheit.create({
          besitzer_email: besitzerEmail,
          fach: neuFach,
          jahrgangsstufe: neuJahrgang,
          titel: neuTitel.trim(),
        });
      }

      return base44.entities.Unterrichtsstunde.create({
        unterrichtseinheit_id: mappe.id,
        fach: mappe?.fach || '',
        jahrgangsstufe: String(mappe?.jahrgangsstufe || ''),
        arbeitstitel: arbeitstitel.trim() || 'Neue Unterrichtsstunde',
        datum: datum || undefined,
        besitzer_email: besitzerEmail,
        status: 'entwurf',
        notfall_code: dreistelligerCode(),
      });
    },
    onSuccess: (stunde) => {
      queryClient.invalidateQueries({ queryKey: ['unterrichtsstunden'] });
      queryClient.invalidateQueries({ queryKey: ['unterrichtseinheiten'] });
      setArbeitstitel('');
      setMappeId('');
      setDatum('');
      setNeuTitel('');
      setNeuFach('');
      setNeuJahrgang('');
      onOpenChange(false);
      onCreated?.(stunde);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neue Unterrichtsstunde planen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Zu welcher Unterrichtseinheit gehört die Stunde? *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={mappeId}
              onChange={(e) => setMappeId(e.target.value)}
            >
              <option value="" disabled>Unterrichtseinheit auswählen...</option>
              <option value={NEUE_EINHEIT}>➕ Neue Unterrichtseinheit anlegen</option>
              {mappen.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fach} · Jg. {m.jahrgangsstufe} · {m.titel}
                </option>
              ))}
            </select>
          </div>

          {neueMappe && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="space-y-2">
                <Label>Name der Unterrichtseinheit *</Label>
                <Input
                  placeholder="z.B. Rechtschreibung"
                  value={neuTitel}
                  onChange={(e) => setNeuTitel(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Fach *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={neuFach}
                    onChange={(e) => setNeuFach(e.target.value)}
                  >
                    <option value="" disabled>Fach...</option>
                    {faecher.map((f) => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Jahrgang *</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={neuJahrgang}
                    onChange={(e) => setNeuJahrgang(e.target.value)}
                  >
                    <option value="" disabled>Jg....</option>
                    {jahrgaenge.map((j) => (
                      <option key={j.id} value={j.bezeichnung}>{j.bezeichnung}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-2">
            <Label>Arbeitstitel der Stunde</Label>
            <Input
              placeholder="z.B. Einstieg lineare Funktionen"
              value={arbeitstitel}
              onChange={(e) => setArbeitstitel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Nur zur Wiedererkennung. Leer lassen ist okay — im Stunden-Coach schlägt die KI später einen Titel vor.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Geplantes Datum (optional)</Label>
            <Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>
        </div>
        {createMutation.isError && (
          <p className="text-sm text-destructive">
            {createMutation.error?.message || 'Die Stunde konnte nicht angelegt werden.'}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            className="gap-2"
            onClick={() => createMutation.mutate()}
            disabled={
              !mappeId ||
              (neueMappe && (!neuTitel.trim() || !neuFach || !neuJahrgang)) ||
              createMutation.isPending
            }
          >
            {createMutation.isPending && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Stunde anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}