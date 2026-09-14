import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

/**
 * Ein Feld, ein Knopf.
 *
 * Fach, Jahrgang und Einheit stehen beim Anlegen aus dem Kontext schon fest —
 * gefragt wird nur noch der Name. Deshalb braucht es hier kein Formular,
 * sondern genau eine Zeile.
 */
export default function SchnellAnlegenDialog({
  open,
  onOpenChange,
  titel,
  label,
  platzhalter,
  hinweis,
  aktionText = 'Anlegen',
  laeuft = false,
  fehler,
  onSubmit,
}) {
  const [name, setName] = useState('');

  const absenden = () => {
    if (!name.trim()) return;
    onSubmit(name.trim(), () => setName(''));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titel}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 py-2">
          <Label>{label}</Label>
          <Input
            autoFocus
            value={name}
            placeholder={platzhalter}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') absenden(); }}
          />
          {hinweis && <p className="text-xs text-muted-foreground">{hinweis}</p>}
          {fehler && <p className="text-sm text-destructive">{fehler}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Abbrechen</Button>
          <Button className="gap-2" onClick={absenden} disabled={!name.trim() || laeuft}>
            {laeuft && <Loader2 className="w-4 h-4 animate-spin" />}
            {aktionText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}