import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

/**
 * Name und Beschreibung eines Formats pflegen.
 *
 * Die Beschreibung ist KEIN Beiwerk: Mit ihr wird später abgeglichen, ob ein
 * Format zu dem passt, was eine Lehrkraft vorhat. Deshalb steht der Hinweis
 * dabei, dass sie die Funktionsweise erklären soll — nicht den Inhalt.
 */
export default function AufgabenFormatBearbeitenDialog({ format, open, onOpenChange, onSpeichern, isPending }) {
  const [name, setName] = useState('');
  const [beschreibung, setBeschreibung] = useState('');

  useEffect(() => {
    if (open && format) {
      setName(format.name || '');
      setBeschreibung(format.beschreibung || '');
    }
  }, [open, format]);

  if (!format) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Aufgabenformat beschreiben</DialogTitle>
          <DialogDescription>
            Name und Beschreibung entscheiden darüber, ob dieses Format später gefunden wird.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="format-name">Name</Label>
            <Input
              id="format-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z. B. Aussagen zuordnen (drei Spalten)"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="format-beschreibung">Wie funktioniert dieses Format?</Label>
            <Textarea
              id="format-beschreibung"
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              rows={7}
              placeholder="Was sehen die Schüler:innen, was tun sie, welche Rückmeldung bekommen sie, wofür eignet sich das Format? Bitte die Funktionsweise beschreiben, nicht den Unterrichtsinhalt."
            />
            <p className="text-xs text-muted-foreground">
              Je genauer diese Beschreibung, desto sicherer wird das Format vorgeschlagen, wenn eine
              Lehrkraft ihr Vorhaben schildert. Ein oder zwei Wörter genügen nicht.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button
            onClick={() => onSpeichern({ name: name.trim(), beschreibung: beschreibung.trim() })}
            disabled={isPending || !name.trim()}
          >
            Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}