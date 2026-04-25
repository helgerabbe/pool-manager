/**
 * LernpfadeQuickAddModal.jsx
 *
 * Schlanker Dialog im Lernpfad-Architekten zum schnellen Anlegen von
 * Meta-Aufgaben (buendel, prozess, projekt_anker). 'inhalt' ist hier
 * BEWUSST nicht zur Auswahl gestellt.
 *
 * Nach erfolgreichem Speichern bekommt der Aufrufer die neue Aufgabe.
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import { AUFGABEN_TYPEN, AUFGABEN_TYPEN_ORDER } from '@/lib/aufgabenTypen';

const ALLOWED_TYPEN = AUFGABEN_TYPEN_ORDER.filter((k) => k !== 'inhalt');

export default function LernpfadeQuickAddModal({ open, onOpenChange, einheitId, onCreated }) {
  const [titel, setTitel] = useState('');
  const [typ, setTyp] = useState('buendel');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setTitel('');
      setTyp('buendel');
      setSaving(false);
    }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!einheitId) return;
    if (!titel.trim()) {
      toast.error('Bitte einen Titel eingeben.');
      return;
    }
    setSaving(true);
    try {
      const created = await createAllgemeineAufgabe({
        einheit_id: einheitId,
        titel: titel.trim(),
        // Quick-Add ist konzeptionell für Ebene-2-Meta-Aufgaben.
        anforderungsebene: '2 - Transfer',
        aufgaben_typ: typ,
      });
      toast.success('Aufgabe angelegt.');
      onCreated?.(created);
      onOpenChange(false);
    } catch (err) {
      console.error('[QuickAdd] Fehler:', err);
      toast.error('Aufgabe konnte nicht erstellt werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schnell hinzufügen</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="quickadd-titel" className="text-xs">Titel</Label>
            <Input
              id="quickadd-titel"
              autoFocus
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="z. B. Pflicht-Bündel: Grundlagen"
              disabled={saving}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Aufgaben-Typ</Label>
            <div className="grid grid-cols-1 gap-2">
              {ALLOWED_TYPEN.map((k) => {
                const meta = AUFGABEN_TYPEN[k];
                const Icon = meta.icon;
                const active = typ === k;
                return (
                  <button
                    type="button"
                    key={k}
                    onClick={() => setTyp(k)}
                    disabled={saving}
                    className={`flex items-start gap-2 rounded-lg border-2 p-2.5 text-left transition-all ${
                      active
                        ? `${meta.color.border} ${meta.color.bg}`
                        : 'border-border bg-card hover:border-primary/30'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-md ${meta.color.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${meta.color.iconText}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`text-xs font-semibold ${active ? meta.color.text : 'text-foreground'}`}>
                        {meta.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground line-clamp-2">
                        {meta.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground italic">
              Hinweis: Inhaltliche Aufgaben (Typ „Inhalt") werden im Aufgaben-Tab angelegt.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</> : 'Speichern'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}