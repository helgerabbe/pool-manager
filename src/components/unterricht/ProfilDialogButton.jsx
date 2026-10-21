import React from 'react';
import { SlidersHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import LerngruppenProfil from './LerngruppenProfil';

const NORMAL = { fit: 3, stark: 3, leistung: 3 };

/** Knopf + Dialog für die Einschätzung (Lerngruppe oder einzelne Unterrichtseinheit). */
export default function ProfilDialogButton({ label, titel, beschreibung, profil, standard, eigen, onSpeichern, onZuruecksetzen }) {
  const [offen, setOffen] = React.useState(false);
  const [wert, setWert] = React.useState(NORMAL);
  const [laeuft, setLaeuft] = React.useState(false);
  const oeffnen = () => { setWert({ ...NORMAL, ...standard, ...profil }); setOffen(true); };
  const fertig = async (fn) => { setLaeuft(true); await fn(); setLaeuft(false); setOffen(false); };

  return (
    <>
      <Button size="sm" variant="outline" className={`gap-2 ${eigen ? 'border-chart-3 text-chart-3' : ''}`} onClick={oeffnen}>
        <SlidersHorizontal className="h-4 w-4" /> {label}
      </Button>
      <Dialog open={offen} onOpenChange={setOffen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{titel}</DialogTitle><DialogDescription>{beschreibung}</DialogDescription></DialogHeader>
          <LerngruppenProfil profil={wert} setProfil={setWert} hinweis="" />
          <div className="flex flex-wrap justify-end gap-2">
            {onZuruecksetzen && eigen && <Button variant="outline" disabled={laeuft} onClick={() => fertig(onZuruecksetzen)}>Standard der Lerngruppe übernehmen</Button>}
            <Button disabled={laeuft} onClick={() => fertig(() => onSpeichern(wert))}>{laeuft && <Loader2 className="animate-spin" />} Speichern</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}