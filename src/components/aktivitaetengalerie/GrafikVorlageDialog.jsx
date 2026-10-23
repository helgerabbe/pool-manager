import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sparkles, Monitor, Tablet, RefreshCw, PenTool, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FREIGABE_TEXT } from '@/lib/folienSymbole';
import useFoliensatz from '@/hooks/useFoliensatz';
import FolienLeiste from './foliensatz/FolienLeiste';
import FolieAnzeige from './foliensatz/FolieAnzeige';
import FolieErklaerung from './foliensatz/FolieErklaerung';
import LehrerTutorial from './foliensatz/LehrerTutorial';
import GestaltungPlatzhalter from './foliensatz/GestaltungPlatzhalter';
import BauFortschrittLeiste from './foliensatz/BauFortschrittLeiste';

const SCHRITTE = [['funktion', '1. Foliensatz der Methode'], ['gestaltung', '2. Layoutvorlagen'], ['tutorial', '3. Lehrer-Tutorial']];

/** Grafische Vorlage: Der Grafikassistent baut den Foliensatz Folie für Folie, hier wird er durchgeblättert. */
export default function GrafikVorlageDialog({ open, onOpenChange, methode, werte }) {
  const navigate = useNavigate();
  const fach = 'Fächerübergreifend';
  const [ansicht, setAnsicht] = React.useState('lehrer');
  const [aktivId, setAktivId] = React.useState(null);
  const [kanal, setKanal] = React.useState('analog');
  const [schritt, setSchritt] = React.useState('funktion');
  const { satz, planen, allesBauen, folieNeu } = useFoliensatz(methode, werte, fach, kanal);
  const folien = satz?.folien || [];
  const folie = folien.find((f) => f.id === aktivId) || folien[0];
  const baut = planen || folien.some((f) => f.status === 'baut');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[90vh] max-w-7xl flex-col">
        <DialogHeader><DialogTitle>Grafische Vorlage · {methode.name}{satz?.thema ? ` · ${satz.thema}` : ''}</DialogTitle></DialogHeader>
        <div className="flex gap-2 border-b pb-2">
          {SCHRITTE.map(([k, l]) => <Button key={k} size="sm" variant={schritt === k ? 'secondary' : 'ghost'} onClick={() => setSchritt(k)}>{l}</Button>)}
        </div>
        {schritt === 'gestaltung' && <GestaltungPlatzhalter />}
        {schritt === 'tutorial' && <LehrerTutorial key={kanal + fach} folien={folien} />}
        {schritt === 'funktion' && <>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border px-3 py-1 text-xs">Fächerübergreifende Vorlage · gestalteter Look</span>
          {['analog', 'digital'].map((k) => (
            <Button key={k} size="sm" variant={kanal === k ? 'default' : 'outline'} disabled={baut} onClick={() => { setKanal(k); setAktivId(null); setAnsicht('lehrer'); }}>
              {k === 'analog' ? 'Analoge Folien' : 'Digitale Folien'}
            </Button>
          ))}
          <Button size="sm" className="ml-auto gap-2" disabled={baut || !werte.info_grafikassistent} onClick={allesBauen}>
            {baut ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {satz ? 'Foliensatz neu bauen' : 'Foliensatz bauen'}
          </Button>
        </div>
        {baut && <BauFortschrittLeiste planen={planen} folien={planen ? [] : folien} />}
        {!folie ? (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">
            {planen ? 'Der Grafikassistent plant die Folienfolge …' : werte.info_grafikassistent ? 'Noch kein Foliensatz für dieses Fach.' : 'Befülle zuerst die Informationen für den Grafikassistenten.'}
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 gap-4">
            <FolienLeiste folien={folien} aktiv={folie.id} setAktiv={setAktivId} />
            <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-y-auto">
              <div className="flex flex-wrap items-center gap-2">
                <Button variant={ansicht === 'lehrer' ? 'default' : 'outline'} size="sm" onClick={() => setAnsicht('lehrer')}><Monitor /> Tafel</Button>
                <Button variant={ansicht === 'schueler' ? 'default' : 'outline'} size="sm" onClick={() => setAnsicht('schueler')}><Tablet /> Tablet</Button>
                <div className="ml-auto flex gap-2">
                  <Button variant="outline" size="sm" disabled={folie.status === 'baut' || planen} onClick={() => folieNeu(folie)}><RefreshCw /> Folie neu erzeugen</Button>
                  <Button variant="outline" size="sm" disabled={folie.status !== 'fertig' || !!folie.vorlage} title={folie.vorlage ? 'Vorlagenfolien sind fest gestaltet' : undefined} onClick={() => navigate('/folien-designer', { state: { elemente: folie[ansicht] } })}><PenTool /> Im Folien-Designer öffnen</Button>
                </div>
              </div>
              {folie.status === 'fertig' ? (
                ansicht === 'schueler' && (folie.kanal === 'analog' || (!folie.vorlage && !folie.schueler?.length))
                  ? <p className="flex aspect-video items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Analoge Folie: keine Tablet-Ansicht.</p>
                  : <FolieAnzeige folie={folie} ansicht={ansicht} kopf={satz?.thema} />
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
                  {folie.status === 'fehler' ? 'Diese Folie konnte nicht gebaut werden. Bitte neu erzeugen.' : <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Folie wird gebaut …</>}
                </div>
              )}
              <p className="flex items-center gap-2 text-sm text-accent"><Lock className="h-4 w-4" /> Weiter: {FREIGABE_TEXT[folie.freigabe] || 'Lehrkraft gibt frei'}{folie.freigabe === 'zeit' && folie.minuten ? ` (${folie.minuten} Min.)` : ''}</p>
            </div>
            <FolieErklaerung folie={folie} folien={folien} />
          </div>
        )}
        </>}
      </DialogContent>
    </Dialog>
  );
}