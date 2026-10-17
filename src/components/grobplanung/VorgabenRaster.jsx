import React from 'react';
import { BookOpen, Target, Users, Shapes, Repeat, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ContainerKarte from './ContainerKarte';
import AnkerFelder from './AnkerFelder';
import ZielEditor from './ZielEditor';
import LerngruppeEditor from './LerngruppeEditor';
import MethodenSuche from './MethodenSuche';
import MaterialUpload from '@/components/unterrichtsplanung/MaterialUpload';
import { ankerVorhanden, stundentypName } from '@/lib/kiGrobplanung';

/** Sechs Vorgaben-Container; ein Klick öffnet den jeweiligen Bereich im Dialog. */
export default function VorgabenRaster({ v, setze, verlauf, assistent, onZielVorschlag }) {
  const [offen, setOffen] = React.useState(null);
  const a = v.anker;
  const normal = v.gruppe.fit === 3 && v.gruppe.stark === 3;
  const C = [
    { key: 'thema', icon: BookOpen, titel: 'Thema', pflicht: true, rand: 'border-l-accent', gesetzt: ankerVorhanden(a), stand: [...a.abschnitte.map((s) => s.titel), a.text, a.richtung].filter(Boolean).join(' · ') || 'Noch offen',
      hinweis: 'Worum geht es in der Stunde? Hier kannst du das Thema ausschärfen oder ergänzen. Materialien findest du im Bereich „Materialien“.', editor: <AnkerFelder verlauf={verlauf} anker={a} setAnker={setze('anker')} ohneMaterial /> },
    { key: 'ziel', icon: Target, titel: 'Stundenziel', rand: 'border-l-primary', gesetzt: !!v.ziel.haupt, stand: [stundentypName(v.ziel.stundentyp) && v.ziel.stundentyp && stundentypName(v.ziel.stundentyp), v.ziel.haupt].filter(Boolean).join(' · ') || 'Noch offen – ich schlage dir eine Richtung vor',
      hinweis: 'Erst mal nur grob: In welche Richtung soll die Stunde gehen? Die genaue Formulierung kommt später.', editor: <ZielEditor ziel={v.ziel} setZiel={setze('ziel')} onVorschlag={onZielVorschlag} /> },
    { key: 'gruppe', icon: Users, titel: 'Lerngruppe', rand: 'border-l-chart-3', gesetzt: !normal, stand: normal ? 'Normale Lerngruppe (Standard)' : `Arbeitstempo ${v.gruppe.fit}/5 · Selbstständigkeit ${v.gruppe.stark}/5`,
      hinweis: 'Wie arbeitet die Klasse?', editor: <LerngruppeEditor gruppe={v.gruppe} setGruppe={setze('gruppe')} /> },
    { key: 'methode', icon: Shapes, titel: 'Methodenwunsch', rand: 'border-l-chart-4', gesetzt: !!v.methode, stand: v.methode ? `${v.methode.name} – wird möglichst verwendet` : 'Keine besondere Methode gewählt',
      hinweis: 'Hast du eine methodische Idee? Beschreib sie, und wir suchen die passende Methode. Sie wird dann in der Stunde eingebaut.', editor: <MethodenSuche wahl={v.methode} setWahl={setze('methode')} assistent={assistent} ideePlatzhalter="z. B. Die Schüler sollen ihre Ergebnisse an Stationen im Raum präsentieren." /> },
    { key: 'ritual', icon: Repeat, titel: 'Rituale', rand: 'border-l-chart-5', gesetzt: !!v.ritual, stand: v.ritual ? v.ritual.name : 'Kein festes Ritual',
      hinweis: 'Machst du etwas in jeder Stunde, z. B. eine Begrüßungsrunde oder einen Wochenplan-Check?', editor: <MethodenSuche wahl={v.ritual} setWahl={setze('ritual')} assistent={assistent} eigenErlaubt ideePlatzhalter="z. B. Zu Beginn drei Minuten Blitzlicht, wie es allen geht." /> },
    { key: 'material', icon: Paperclip, titel: 'Materialien', rand: 'border-l-bundle', gesetzt: a.materialien.length > 0, stand: a.materialien.length ? `${a.materialien.length} Material(ien): ${a.materialien.map((m) => m.name).join(', ')}` : 'Noch kein Material',
      hinweis: 'Buchseiten, Arbeitsblätter, Präsentationen oder PDFs, die in der Stunde eine Rolle spielen.', editor: <MaterialUpload materialien={a.materialien} onChange={(m) => setze('anker')((x) => ({ ...x, materialien: m }))} /> },
  ];
  const akt = C.find((c) => c.key === offen);
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {C.map((c) => <ContainerKarte key={c.key} {...c} onClick={() => setOffen(c.key)} />)}
      </div>
      <Dialog open={!!akt} onOpenChange={(o) => !o && setOffen(null)}>
        {akt && (
          <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
            <DialogHeader><DialogTitle>{akt.titel}</DialogTitle><DialogDescription>{akt.hinweis}</DialogDescription></DialogHeader>
            {akt.editor}
            <Button onClick={() => setOffen(null)}>Fertig</Button>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}