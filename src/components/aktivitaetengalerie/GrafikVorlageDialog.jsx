import React from 'react';
import { Loader2, Sparkles, Monitor, Tablet, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FAECHER } from '@/lib/stundenDesign';
import { erstellePrototyp, gestalteVorlage } from '@/lib/grafikVorlageErstellen';
import VorlagenAnzeige from './VorlagenAnzeige';

/** Grafische Vorlage einer Methode: je Fach erzeugen, speichern und zwischen Lehrer/Schüler wechseln. */
export default function GrafikVorlageDialog({ open, onOpenChange, methode, werte }) {
  const [vorlagen, setVorlagen] = React.useState(methode.grafik_vorlagen || {});
  const [fach, setFach] = React.useState(FAECHER[0]);
  const [ansicht, setAnsicht] = React.useState('lehrer');
  const [laedt, setLaedt] = React.useState(false);
  const vorlage = vorlagen[fach];

  const [zeigePrototyp, setZeigePrototyp] = React.useState(false);
  const gestaltet = vorlage?.stufe === 'gestaltet';
  const prototyp = vorlage?.prototyp || vorlage;
  const html = gestaltet && !zeigePrototyp ? vorlage[ansicht] : prototyp?.[ansicht];

  const lauf = async (art, schritt) => {
    setLaedt(art);
    try {
      const eintrag = await schritt();
      const neu = { ...vorlagen, [fach]: { ...eintrag, erstellt_am: new Date().toISOString() } };
      await base44.entities.MethodenKatalog.update(methode.id, { grafik_vorlagen: neu });
      setVorlagen(neu);
      setZeigePrototyp(false);
    } catch (e) {
      toast.error('Das hat nicht geklappt. Bitte noch einmal versuchen.');
    } finally {
      setLaedt(false);
    }
  };
  const prototypBauen = () => lauf('prototyp', async () => {
    const p = await erstellePrototyp({ ...methode, ...werte }, fach);
    return { ...p, stufe: 'prototyp', prototyp: p };
  });
  const gestalten = () => lauf('gestalten', async () => {
    const g = await gestalteVorlage(prototyp, { ...methode, ...werte });
    return { ...g, stufe: 'gestaltet', prototyp };
  });

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
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-2" disabled={!!laedt} onClick={prototypBauen}>
              {laedt === 'prototyp' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />} {vorlage ? '1. Prototyp neu bauen' : '1. Prototyp bauen'}
            </Button>
            <Button size="sm" className="gap-2" disabled={!vorlage || !!laedt} onClick={gestalten}>
              {laedt === 'gestalten' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {gestaltet ? '2. Neu gestalten' : '2. Gestalten'}
            </Button>
          </div>
        </div>
        {vorlage ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Beispielthema: {vorlage.thema}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{gestaltet && !zeigePrototyp ? 'Gestaltete Vorlage' : 'Prototyp (ohne Gestaltung)'}</span>
              {gestaltet && <button className="underline" onClick={() => setZeigePrototyp((z) => !z)}>{zeigePrototyp ? 'Gestaltete Vorlage zeigen' : 'Prototyp zeigen'}</button>}
            </div>
            {!gestaltet && <p className="text-xs text-muted-foreground">Prüfe den Prototyp. Passt die Funktion, lass ihn im zweiten Schritt gestalten. Sonst passe die Anweisung für den Grafikassistenten an und baue den Prototyp neu.</p>}
            <VorlagenAnzeige html={html} ansicht={ansicht} />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            {laedt ? 'Der erste Grafikassistent baut den Prototyp …' : 'Für dieses Fach gibt es noch keine Vorlage. Beschreib in der Anweisung für den Grafikassistenten, was gebraucht wird, und bau dann den Prototyp.'}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}