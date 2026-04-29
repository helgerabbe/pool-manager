/**
 * LernzielEditList.jsx
 *
 * Inline-Editor für die Lernziele eines Lernpakets im Tab-3-Bearbeitungs-
 * dialog. Erlaubt es Fachschaftsleitungen (und allen, die `kannBearbeiten`
 * haben), sowohl die offizielle Formulierung (Fachsprache) als auch die
 * Schüler-Übersetzung jedes Ziels direkt aus dem Lernpaket-Edit-Dialog
 * heraus zu pflegen — bis dato gab es dort nur den Phasen-Editor.
 *
 * Das Anlegen/Löschen neuer Lernziele bleibt bewusst im Panel (Edit-Icon
 * je Zeile / „+ Hinzufügen"-Button), damit dieser Editor nur eine
 * Aufgabe hat: bestehende Texte in-place korrigieren.
 */

import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Target } from 'lucide-react';
import { kategorieColors } from './SharedUI';

function LernzielRow({ lernziel, onSaved }) {
  const [formulierung, setFormulierung] = useState(lernziel.formulierung_fachsprache || '');
  const [uebersetzung, setUebersetzung] = useState(lernziel.schueler_uebersetzung || '');

  // Beim Wechsel auf ein anderes Lernziel die lokalen Felder neu seeden.
  useEffect(() => {
    setFormulierung(lernziel.formulierung_fachsprache || '');
    setUebersetzung(lernziel.schueler_uebersetzung || '');
  }, [lernziel.id, lernziel.formulierung_fachsprache, lernziel.schueler_uebersetzung]);

  const update = useMutation({
    mutationFn: (data) => base44.entities.Lernziele.update(lernziel.id, data),
    onSuccess: () => {
      toast.success('Lernziel gespeichert.');
      onSaved?.();
    },
    onError: () => toast.error('Fehler beim Speichern des Lernziels.'),
  });

  const trimmedFormulierung = formulierung.trim();
  const trimmedUebersetzung = uebersetzung.trim();
  const isDirty =
    trimmedFormulierung !== (lernziel.formulierung_fachsprache || '').trim() ||
    trimmedUebersetzung !== (lernziel.schueler_uebersetzung || '').trim();

  const handleSave = () => {
    if (!trimmedFormulierung) {
      toast.error('Die offizielle Formulierung darf nicht leer sein.');
      return;
    }
    update.mutate({
      formulierung_fachsprache: trimmedFormulierung,
      schueler_uebersetzung: trimmedUebersetzung,
    });
  };

  return (
    <div className="p-3 rounded-lg border bg-card space-y-2.5">
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {lernziel.kategorie && (
              <Badge className={`text-[10px] ${kategorieColors[lernziel.kategorie] || ''}`}>
                {lernziel.kategorie}
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Offizielle Formulierung (Fachsprache)</Label>
            <input
              type="text"
              value={formulierung}
              onChange={(e) => setFormulierung(e.target.value)}
              placeholder="Ich kann..."
              className="w-full px-3 py-2 rounded-lg border border-input text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Schüler-Übersetzung</Label>
            <input
              type="text"
              value={uebersetzung}
              onChange={(e) => setUebersetzung(e.target.value)}
              placeholder="Schülergerechte Formulierung..."
              className="w-full px-3 py-2 rounded-lg border border-input text-sm"
            />
          </div>

          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || update.isPending}
              className="gap-1.5"
            >
              {update.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Save className="w-3.5 h-3.5" />}
              Speichern
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LernzielEditList({ lernziele, onSaved }) {
  if (!lernziele || lernziele.length === 0) {
    return (
      <div className="p-3 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
        Diesem Paket sind noch keine Lernziele zugeordnet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lernziele.map((lz) => (
        <LernzielRow key={lz.id} lernziel={lz} onSaved={onSaved} />
      ))}
    </div>
  );
}