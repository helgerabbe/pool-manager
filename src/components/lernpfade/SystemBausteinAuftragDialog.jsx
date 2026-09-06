/**
 * SystemBausteinAuftragDialog.jsx
 *
 * Arbeitsauftrag eines Standard-Elements (Systembaustein) an EINER Stelle im
 * Lernpfad. Hintergrund (Meldung 2026-09-06): Bei Stopps wie dem Lehrer-Check
 * stand nirgends, was dort konkret zu tun ist — die Schüler sahen nur den
 * Baustein-Titel, und beim Moodle-Bau musste geraten werden. Der Text hängt
 * bewusst an der INSTANZ (instance_id), nicht am Baustein: derselbe Baustein
 * kann in verschiedenen Sektoren etwas anderes verlangen.
 */

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export default function SystemBausteinAuftragDialog({
  open,
  onOpenChange,
  bausteinTitel = 'Standard-Element',
  hinweis = '',
  value = '',
  onSave,
}) {
  const [text, setText] = useState(value || '');

  useEffect(() => {
    if (open) setText(value || '');
  }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Was sollen die Schüler hier tun?</DialogTitle>
          <DialogDescription>
            „{bausteinTitel}" an dieser Stelle im Lernplan. Dieser Text erscheint den
            Schülern als Arbeitsauftrag und geht so auch in den Moodle-Bau.
          </DialogDescription>
        </DialogHeader>

        {hinweis && (
          <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded-md px-3 py-2 leading-relaxed">
            {hinweis}
          </p>
        )}

        <Textarea
          autoFocus
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={'z. B. „Zeige dein Heft deiner Lehrkraft. Sie prüft die Aufgaben 3–5 und gibt dir das Signal zum Weiterarbeiten."'}
          className="text-sm"
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => {
              onSave?.(text.trim());
              onOpenChange?.(false);
            }}
          >
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}