/**
 * AnlegenMitWizardDialog
 * ──────────────────────
 * Ein Name — und danach die Entscheidung: selbst Schritt für Schritt bauen
 * oder den bestehenden Assistenten nutzen. Der Dialog legt nichts selbst an;
 * er meldet nur Name und Weg an den Aufrufer.
 */
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, ListOrdered } from 'lucide-react';

export default function AnlegenMitWizardDialog({
  open,
  onOpenChange,
  titel,
  label,
  platzhalter,
  hinweis,
  selbstText = 'Schritt für Schritt selbst',
  wizardText = 'Mit Assistent erstellen',
  laeuft = false,
  onSubmit,
}) {
  const [name, setName] = useState('');
  const bereit = !!name.trim() && !laeuft;

  const senden = (weg) => {
    if (!bereit) return;
    onSubmit(name.trim(), weg, () => setName(''));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!laeuft) onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{titel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <Label>{label}</Label>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={platzhalter}
            onKeyDown={(e) => { if (e.key === 'Enter') senden('wizard'); }}
          />
          {hinweis && <p className="text-xs text-muted-foreground">{hinweis}</p>}
        </div>

        <div className="space-y-2 pt-2">
          <Button
            className="w-full gap-2"
            disabled={!bereit}
            onClick={() => senden('wizard')}
          >
            {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {wizardText}
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={!bereit}
            onClick={() => senden('selbst')}
          >
            <ListOrdered className="w-4 h-4" />
            {selbstText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}