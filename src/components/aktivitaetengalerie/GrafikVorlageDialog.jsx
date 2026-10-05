import React from 'react';
import { Loader2, Sparkles, Monitor, Tablet } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FAECHER } from '@/lib/stundenDesign';
import { erstelleGrafikVorlage } from '@/lib/grafikVorlageErstellen';
import VorlagenAnzeige from './VorlagenAnzeige';

/** Grafische Vorlage einer Methode: je Fach erzeugen, speichern und zwischen Lehrer/Schüler wechseln. */
export default function GrafikVorlageDialog({ open, onOpenChange, methode, werte }) {
  const [vorlagen, setVorlagen] = React.useState(methode.grafik_vorlagen || {});
  const [fach, setFach] = React.useState(FAECHER[0]);
  const [ansicht, setAnsicht] = React.useState('lehrer');
  const [laedt, setLaedt] = React.useState(false);
  const vorlage = vorlagen[fach];

  const erstellen = async () => {
    setLaedt(true);
    try {
      const res = await erstelleGrafikVorlage({ ...methode, ...werte }, fach);
      const neu = { ...vorlagen, [fach]: { ...res, erstellt_am: new Date().toISOString() } };
      await base44.entities.MethodenKatalog.update(methode.id, { grafik_vorlagen: neu });
      setVorlagen(neu);
    } catch (e) {
      toast.error('Die Vorlage konnte nicht erstellt werden.');
    } finally {
      setLaedt(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader><DialogTitle>Grafische Vorlage · {methode.name}</DialogTitle></DialogHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={fach} onValueChange={setFach}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{FAECHER.map((f) => <SelectItem key={f} value={f}>{f}{vorlagen[f] ? ' ✓' : ''}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant={ansicht === 'lehrer' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setAnsicht('lehrer')}><Monitor className="h-4 w-4" /> Lehrer-Display</Button>
          <Button variant={ansicht === 'schueler' ? 'default' : 'outline'} size="sm" className="gap-2" onClick={() => setAnsicht('schueler')}><Tablet className="h-4 w-4" /> Schüler-Display</Button>
          <Button variant="outline" size="sm" className="ml-auto gap-2" disabled={laedt} onClick={erstellen}>
            {laedt ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {vorlage ? 'Neu erstellen' : 'Vorlage erstellen'}
          </Button>
        </div>
        {vorlage ? (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Beispielthema: {vorlage.thema}</p>
            <VorlagenAnzeige html={vorlage[ansicht]} ansicht={ansicht} />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {laedt ? 'Der Grafikassistent baut die Vorlage …' : 'Für dieses Fach gibt es noch keine Vorlage.'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}