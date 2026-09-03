/**
 * ThemenfeldBeschreibungDialog
 *
 * Ein Satz zum Themenfeld, in Schülersprache. Die MBK zeigt ihn als Untertitel
 * der Gruppe im Weg-Baum an; bisher blieb das Feld leer, weil es in der App
 * nirgends gepflegt werden konnte (Rückmeldung 2026-09-03).
 *
 * Speichert direkt — unabhängig vom Struktur-Speichern des Boards, damit ein
 * Satz nicht am großen Speichervorgang hängt.
 */

import React, { useEffect, useState } from 'react';
import { updateThemenfeld } from '@/services/ThemenfeldService';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
  beschreibung = '',
  onSaved,
}) {
  const [text, setText] = useState(beschreibung || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setText(beschreibung || '');
  }, [open, beschreibung]);

  const speichern = async () => {
    if (!themenfeldId) return;
    setSaving(true);
    try {
      await updateThemenfeld(themenfeldId, { beschreibung: text.trim() });
      toast.success('Beschreibung gespeichert.');
      onSaved?.(text.trim());
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
          <DialogTitle>Beschreibung: {titel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-1">
          <Label>Ein Satz für die Schüler</Label>
          <Textarea
            autoFocus
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="z. B. Hier lernst du, Umfang und Fläche eines Kreises zu berechnen."
          />
          <p className="text-xs text-muted-foreground">
            Steht im Lernweg als Untertitel unter dem Themenfeld-Titel.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Abbrechen
          </Button>
          <Button onClick={speichern} disabled={saving}>
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}