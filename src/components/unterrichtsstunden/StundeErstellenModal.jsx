import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';

const NEUE_EINHEIT = '__neu__';

/** Dreistelliger Zufalls-Code (100-999) für Notfall-/Phasen-Freischaltung. */
export function dreistelligerCode() {
  return String(Math.floor(100 + Math.random() * 900));
}

/**
 * Paket 1 des Moodle-Unterrichts-Generators: Eine Unterrichtsstunde anlegen.
 * Die Stunde gehört immer zu einer Einheit — dadurch bleibt die Gruppierung
 * Fach > Einheit > Stunden in der Privaten Bibliothek eindeutig.
 */
export default function StundeErstellenModal({ open, onOpenChange, einheiten = [], besitzerEmail, onCreated }) {
  const [arbeitstitel, setArbeitstitel] = useState('');
  const [einheitId, setEinheitId] = useState('');
  const [datum, setDatum] = useState('');
  // Neue Einheit direkt aus dem Dialog anlegen (erste Stunde einer Einheit).
  const [neuTitel, setNeuTitel] = useState('');
  const [neuFach, setNeuFach] = useState('');
  const [neuJahrgang, setNeuJahrgang] = useState('');
  const queryClient = useQueryClient();
  const neueEinheit = einheitId === NEUE_EINHEIT;

  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecherAktiv'],
    queryFn: () => base44.entities.LookupFaecher.filter({ ist_aktiv: true }, 'reihenfolge', 100),
    enabled: neueEinheit,
  });
  const { data: jahrgaenge = [] } = useQuery({
    queryKey: ['lookupJahrgaengeAktiv'],
    queryFn: () => base44.entities.LookupJahrgaenge.filter({ ist_aktiv: true }, 'reihenfolge', 100),
    enabled: neueEinheit,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      let einheit = einheiten.find((e) => e.id === einheitId);

      if (neueEinheit) {
        const res = await base44.functions.createEinheitMitDefaults({
          metaData: {
            fach: neuFach,
            titel_der_einheit: neuTitel.trim(),
            jahrgangsstufe: neuJahrgang,
          },
          privat: true,
        });
        einheit = res?.data?.einheit;
        if (!einheit?.id) throw new Error(res?.data?.error || 'Einheit konnte nicht angelegt werden.');
        // Direkt nutzbar machen (kein Wizard-Entwurf).
        await base44.entities.Einheiten.update(einheit.id, { wizard_status: 'aktiv' });
      }

      return base44.entities.Unterrichtsstunde.create({
        einheit_id: einheit.id,
        fach: einheit?.fach || '',
        jahrgangsstufe: String(einheit?.jahrgangsstufe || ''),
        arbeitstitel: arbeitstitel.trim() || 'Neue Unterrichtsstunde',
        datum: datum || undefined,
        besitzer_email: besitzerEmail,
        status: 'entwurf',
        notfall_code: dreistelligerCode(),
      });
    },
    onSuccess: (stunde) => {
      queryClient.invalidateQueries({ queryKey: ['unterrichtsstunden'] });
      queryClient.invalidateQueries({ queryKey: ['einheitenList'] });
      setArbeitstitel('');
      setEinheitId('');
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
            <Label>Zu welcher Einheit gehört die Stunde? *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={einheitId}
              onChange={(e) => setEinheitId(e.target.value)}
            >
              <option value="" disabled>Einheit auswählen...</option>
              <option value={NEUE_EINHEIT}>➕ Neue Einheit anlegen</option>
              {einheiten.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fach} · {e.titel_der_einheit}
                </option>
              ))}
            </select>
          </div>

          {neueEinheit && (
            <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
              <div className="space-y-2">
                <Label>Titel der neuen Einheit *</Label>
                <Input
                  placeholder="z.B. Lineare Funktionen"
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
              <p className="text-xs text-muted-foreground">
                Die Einheit wird als private Einheit angelegt — Ihre Stunde landet direkt darin.
              </p>
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
              Nur zur Wiedererkennung in der Bibliothek. Leer lassen ist okay — im Stunden-Coach schlägt die KI später einen Titel vor.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Geplantes Datum (optional)</Label>
            <Input type="date" value={datum} onChange={(e) => setDatum(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={
              !einheitId ||
              (neueEinheit && (!neuTitel.trim() || !neuFach || !neuJahrgang)) ||
              createMutation.isPending
            }
          >
            Stunde anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}