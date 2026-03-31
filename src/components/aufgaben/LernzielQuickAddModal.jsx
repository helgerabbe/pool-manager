import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Target, Zap } from 'lucide-react';

export default function LernzielQuickAddModal({ open, onOpenChange, onSubmit }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      formulierung_fachsprache: text,
      kategorie: 'Fachwissen',
    });
    setText('');
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Basiskompetenz schnell anlegen
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2 text-xs text-green-800">
            <Target className="w-3.5 h-3.5 mt-0.5 shrink-0 text-green-600" />
            <span>
              Wird als <strong>Basiskompetenz</strong> im aktuellen Lernpaket angelegt
              und erscheint sofort in der Drag-Liste.
            </span>
          </div>
          <div className="space-y-2">
            <Label>Ich kann … *</Label>
            <Textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Ich kann die Grundbegriffe der linearen Funktionen benennen."
              rows={3}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={!text.trim() || saving} className="gap-2">
              {saving
                ? <div className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                : <Zap className="w-3.5 h-3.5" />
              }
              Anlegen & zur Liste
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}