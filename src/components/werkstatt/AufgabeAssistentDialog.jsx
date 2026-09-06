import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { AlertCircle } from 'lucide-react';
import AufgabeIdeeErfassung from '@/components/werkstatt/AufgabeIdeeErfassung';
import AufgabeFormatVorschlaege from '@/components/werkstatt/AufgabeFormatVorschlaege';

/**
 * AufgabeAssistentDialog
 * ──────────────────────
 * Der Weg zu EINER Aufgabe im Ablauf — seit 2026-09-06 der einzige.
 *
 * Vorher musste die Lehrkraft im Anlege-Menü zwischen „Format aus dem Katalog"
 * und „Offene Aufgabe" entscheiden, bevor sie über ihre Aufgabe nachgedacht
 * hatte. Jetzt ist die Reihenfolge umgekehrt: erst Material und Idee, dann
 * sieht die App nach, ob es dafür schon eine erprobte Mechanik gibt — im
 * Aktivitätenkatalog UND in der Aufgabengalerie. Erst danach steht fest, was
 * für ein Schritt daraus wird.
 *
 * Der Dialog entscheidet nichts selbst: Er liefert die Wahl zurück, das
 * Umsetzen in einen Schritt macht lib/aufgabeFormatWahl.js.
 */
export default function AufgabeAssistentDialog({
  open,
  onOpenChange,
  materialien = [],
  onMaterialienChange,
  startIdee = '',
  disabled = false,
  onWahl,           // (wahl, idee) => void
}) {
  const [idee, setIdee] = useState('');
  const [treffer, setTreffer] = useState(null);   // null = noch nicht gesucht

  useEffect(() => {
    if (!open) return;
    setIdee(startIdee || '');
    setTreffer(null);
  }, [open, startIdee]);

  const suche = useMutation({
    mutationFn: async (text) => {
      const res = await base44.functions.invoke('aufgabenFormatVorschlag', { beschreibung: text });
      return res.data;
    },
    onSuccess: (d) => setTreffer(d?.treffer || []),
  });

  const waehlen = (wahl) => {
    onWahl(wahl, idee.trim());
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Aufgabe hinzufügen</DialogTitle>
          <DialogDescription>
            {treffer === null
              ? 'Legen Sie Ihr Material ab und erzählen Sie, was die Schüler:innen tun sollen. Ich sehe dann nach, ob es dafür schon ein passendes Aufgabenformat gibt.'
              : 'Wählen Sie ein Format — die Inhalte setzen Sie danach im Schritt ein.'}
          </DialogDescription>
        </DialogHeader>

        {suche.isError && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>
              Die Suche hat nicht geklappt: {suche.error?.message}. Sie können die Aufgabe auch
              direkt neu bauen lassen.
            </span>
          </div>
        )}

        {treffer === null ? (
          <AufgabeIdeeErfassung
            materialien={materialien}
            onMaterialienChange={onMaterialienChange}
            idee={idee}
            onIdeeChange={setIdee}
            onSuchen={() => suche.mutate(idee.trim())}
            busy={suche.isPending}
            disabled={disabled}
          />
        ) : (
          <AufgabeFormatVorschlaege
            treffer={treffer}
            disabled={disabled}
            onWahl={waehlen}
            onZurueck={() => setTreffer(null)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}