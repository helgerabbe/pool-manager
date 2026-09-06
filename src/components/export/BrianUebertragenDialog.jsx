/**
 * BrianUebertragenDialog.jsx
 *
 * Bestätigungs-Dialog beim Markieren einer Aufgabe als "In Brian übertragen".
 * Erfasst die Brian-Aufgaben-ID (Rückkanal) und optional die direkte URL,
 * damit Moodle-HTML-Seiten später direkt auf die richtige Brian-Aufgabe
 * verlinken können.
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function BrianUebertragenDialog({ open, onOpenChange, aufgabe, dialog, onConfirm, isSaving }) {
  const [dialogId, setDialogId] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (open) {
      setDialogId(dialog?.dialog_id || aufgabe?.brian_dialog_id || '');
      setUrl(dialog?.url || aufgabe?.brian_url || '');
    }
  }, [open, aufgabe, dialog]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>In Brian übertragen bestätigen</DialogTitle>
          <DialogDescription>
            Trage die Adresse (URL) ein, unter der „{dialog?.titel || aufgabe?.titel || 'die Aufgabe'}" in Brian.study
            erreichbar ist. Die URL ist der Nachweis, dass das Gespräch dort wirklich existiert — erst damit gilt die
            Aufgabe als übertragen. Sie wird an die Aufgabe geschrieben und in den Export übernommen, sodass die
            Schüler den Link erhalten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="brian-url">Brian-URL des Gesprächs *</Label>
            <Input
              id="brian-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://brian.study/…"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="brian-dialog-id">Brian-Aufgaben-ID (optional)</Label>
            <Input
              id="brian-dialog-id"
              value={dialogId}
              onChange={(e) => setDialogId(e.target.value)}
              placeholder="z.B. dlg_8f3a21…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Abbrechen
          </Button>
          <Button
            onClick={() => onConfirm({ brian_dialog_id: dialogId.trim(), brian_url: url.trim() })}
            disabled={!url.trim() || isSaving}
            className="gap-1.5 bg-green-600 hover:bg-green-700"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Übertragen bestätigen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}