import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { getSchrittTyp } from '@/lib/schrittTypen';

/**
 * Warnung vor dem Übernehmen eines geänderten Ablaufs: Diese Schritte haben
 * schon Inhalt und würden wegfallen. Nichts passiert ohne Bestätigung.
 */
export default function AblaufUebernehmenWarnung({ open, verloren = [], onBestaetigen, onAbbrechen }) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onAbbrechen(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-5 h-5" /> Ausgearbeitete Aufgaben gehen verloren
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-700">
          Im neuen Ablauf {verloren.length === 1 ? 'fehlt dieser Schritt' : `fehlen diese ${verloren.length} Schritte`} —
          {' '}{verloren.length === 1 ? 'er ist' : 'sie sind'} aber bereits ausgearbeitet. Beim Übernehmen wird der Inhalt gelöscht.
        </p>
        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
          {verloren.map((s) => {
            const typ = getSchrittTyp(s.typ);
            return (
              <li key={s.id} className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm">
                <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-bold ${typ?.classes?.badge || ''}`}>
                  {typ?.kurz || s.typ}
                </span>
                <span className="font-medium text-slate-800 truncate">{s.titel || 'Ohne Titel'}</span>
              </li>
            );
          })}
        </ul>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onAbbrechen}>Abbrechen — Ablauf behalten</Button>
          <Button variant="destructive" onClick={onBestaetigen}>Trotzdem übernehmen</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}