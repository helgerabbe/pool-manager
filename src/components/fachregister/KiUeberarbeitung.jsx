import React from 'react';
import { Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import FreitextMitSprache from '@/components/stundenplaner/FreitextMitSprache';
import LehrwerkUpload from '@/components/fachregister/LehrwerkUpload';
import { ueberarbeiten } from '@/lib/fachregisterKi';

/** Interaktion mit der KI: Materialien + Anweisung → überarbeitete Abschnitte. */
export default function KiUeberarbeitung({ einheit, onMaterialien, onErgebnis, gesperrt }) {
  const [anweisung, setAnweisung] = React.useState('');
  const [laeuft, setLaeuft] = React.useState(false);
  const los = async () => {
    setLaeuft(true);
    try {
      onErgebnis(await ueberarbeiten(einheit, anweisung));
      setAnweisung('');
      toast.success('Überarbeitet. Bitte prüfen und speichern.');
    } catch { toast.error('Die KI-Anfrage ist fehlgeschlagen.'); }
    setLaeuft(false);
  };
  return (
    <section className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div>
        <h3 className="font-display font-bold">Didaktische Schwerpunktsetzung mit der KI</h3>
        <p className="text-xs text-muted-foreground">Materialien hochladen und sagen, was ergänzt, verändert oder anders gewichtet werden soll. Die KI baut die Abschnitte um; danach prüfen und speichern.</p>
      </div>
      <LehrwerkUpload dateien={einheit.zusatz_materialien} onChange={onMaterialien} label="Materialien hochladen" />
      <FreitextMitSprache rows={4} value={anweisung} onChange={setAnweisung}
        placeholder="z. B. „Bitte stärker auf den Lebensweltbezug eingehen und die Materialien zur Erzählperspektive einbauen.“" />
      <Button onClick={los} disabled={gesperrt || laeuft || !anweisung.trim()} className="gap-2">
        {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />} Mit KI überarbeiten
      </Button>
    </section>
  );
}