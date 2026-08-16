import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => {
      const einheit = einheiten.find((e) => e.id === einheitId);
      return base44.entities.Unterrichtsstunde.create({
        einheit_id: einheitId,
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
      setArbeitstitel('');
      setEinheitId('');
      setDatum('');
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
              {einheiten.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.fach} · {e.titel_der_einheit}
                </option>
              ))}
            </select>
            {einheiten.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Sie brauchen zuerst eine Einheit — legen Sie unten eine an.
              </p>
            )}
          </div>
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
          <Button onClick={() => createMutation.mutate()} disabled={!einheitId || createMutation.isPending}>
            Stunde anlegen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}