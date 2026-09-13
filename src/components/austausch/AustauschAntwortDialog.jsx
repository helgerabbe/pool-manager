import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Send } from 'lucide-react';
import { useAustauschAntworten } from '@/hooks/useAustausch';

/**
 * Neue Nachricht an den Kursbau — als Antwort auf eine bestehende oder frei.
 * Es entsteht immer eine NEUE Datei; die Ursprungsnachricht wird nur im
 * Status auf „beantwortet" gesetzt.
 */
export default function AustauschAntwortDialog({ nachricht = null, trigger }) {
  const [open, setOpen] = useState(false);
  const [betreff, setBetreff] = useState(nachricht ? `Antwort: ${nachricht.betreff}` : '');
  const [text, setText] = useState('');
  const [brauchtMalte, setBrauchtMalte] = useState(false);
  const senden = useAustauschAntworten();

  const abschicken = () =>
    senden.mutate(
      {
        betreff,
        text,
        antwortet_auf: nachricht?.datei || null,
        braucht_malte: brauchtMalte,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setText('');
        },
      }
    );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{nachricht ? 'Antwort an den Kursbau' : 'Neue Nachricht an den Kursbau'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {nachricht && (
            <p className="text-xs text-muted-foreground">Antwortet auf: {nachricht.datei}</p>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="austausch-betreff">Betreff</Label>
            <Input id="austausch-betreff" value={betreff} onChange={(e) => setBetreff(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="austausch-text">Text (Markdown, in ganzen Sätzen mit Begründung)</Label>
            <Textarea
              id="austausch-text"
              rows={12}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Was wurde entschieden oder gefragt — und warum?"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={brauchtMalte} onCheckedChange={(v) => setBrauchtMalte(v === true)} />
            Ein Mensch muss entscheiden (braucht_malte)
          </label>
          <div className="flex justify-end">
            <Button onClick={abschicken} disabled={senden.isPending || !betreff.trim() || !text.trim()} className="gap-2">
              {senden.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Ins Repository legen
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}