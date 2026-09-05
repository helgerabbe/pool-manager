/**
 * ThemenfeldBeschreibungDialog
 *
 * Pflegt die zwei schülergerechten Sätze eines Themenfelds:
 *  1. LEITFRAGE (Pflicht) — die Frage, die auf dem Themenfeld-Knoten der
 *     Lernlandkarte steht ("Was sind Quadratzahlen und wie erkenne ich sie?").
 *  2. Beschreibung (optional) — ein Satz, den die MBK als Untertitel der
 *     Gruppe im Weg-Baum anzeigt.
 *
 * Speichert direkt — unabhängig vom Struktur-Speichern des Boards, damit ein
 * Satz nicht am großen Speichervorgang hängt.
 */

import React, { useEffect, useState } from 'react';
import { updateThemenfeld } from '@/services/ThemenfeldService';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ThemenfeldBeschreibungDialog({
  open,
  onOpenChange,
  themenfeldId,
  titel,
  leitfrage = '',
  beschreibung = '',
  onSaved,
}) {
  const [frage, setFrage] = useState(leitfrage || '');
  const [text, setText] = useState(beschreibung || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFrage(leitfrage || '');
      setText(beschreibung || '');
    }
  }, [open, leitfrage, beschreibung]);

  const speichern = async () => {
    if (!themenfeldId || !frage.trim()) return;
    setSaving(true);
    try {
      await updateThemenfeld(themenfeldId, {
        leitfrage: frage.trim(),
        beschreibung: text.trim(),
      });
      toast.success('Gespeichert.');
      onSaved?.({ leitfrage: frage.trim(), beschreibung: text.trim() });
      onOpenChange(false);
    } catch (e) {
      toast.error(`Speichern fehlgeschlagen: ${e?.message || 'Unbekannter Fehler'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Themenfeld: {titel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label>
              Leitfrage <span className="text-destructive">*</span>
            </Label>
            <Input
              autoFocus
              value={frage}
              onChange={(e) => setFrage(e.target.value)}
              placeholder="z. B. Wie berechne ich Umfang und Fläche eines Kreises?"
            />
            <p className="text-xs text-muted-foreground">
              Diese Frage sehen deine Schüler auf der Lernlandkarte. Sie ist Pflicht —
              sie sagt in einem Satz, worum es hier geht.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Ein Satz für die Schüler (optional)</Label>
            <Textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="z. B. Hier lernst du, Umfang und Fläche eines Kreises zu berechnen."
            />
            <p className="text-xs text-muted-foreground">
              Steht im Lernweg als Untertitel unter dem Themenfeld-Titel.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={speichern} disabled={saving || !frage.trim()}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}