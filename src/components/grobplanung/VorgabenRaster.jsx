import React from 'react';
import { BookOpen, Target, Users, Shapes, Repeat, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ContainerKarte from './ContainerKarte';
import ThemaEditor from './ThemaEditor';
import ZielEditor from './ZielEditor';
import LerngruppeEditor from './LerngruppeEditor';
import MethodenSuche from './MethodenSuche';
import MaterialUpload from '@/components/unterrichtsplanung/MaterialUpload';
import { ankerVorhanden, stundentypName } from '@/lib/kiGrobplanung';
import { modellName } from '@/components/unterrichtsplanung/StundenmodellVorschlag';
import GrundstrukturWahl, { wirksameGrundstruktur } from './GrundstrukturWahl';

/** Sechs Vorgaben-Container; ein Klick öffnet den jeweiligen Bereich im Dialog. */
export default function VorgabenRaster({ v, setze, verlauf, assistent, onZielVorschlag, onThemaVorschlag }) {
  const [offen, setOffen] = React.useState(null);
  const a = v.anker;
  const modellAbschnitt = a.abschnitte.find((s) => s.modell);
  const grund = wirksameGrundstruktur(v.grundstruktur, modellAbschnitt);
  const normal = v.gruppe.fit === 3 && v.gruppe.stark === 3 && (v.gruppe.leistung ?? 3) === 3;
  const gruppeStand = [normal ? 'Normale Lerngruppe (Standard)' : `Tempo ${v.gruppe.fit}/5 · Selbstständigkeit ${v.gruppe.stark}/5 · Leistung ${v.gruppe.leistung ?? 3}/5`, a.vorwissen?.trim() && 'Lernausgangslage angegeben'].filter(Boolean).join(' · ');
  const C = [
    { key: 'thema', icon: BookOpen, titel: 'Thema / Inhalt', pflicht: true, rand: 'border-l-accent', gesetzt: ankerVorhanden(a), stand: [a.thema || [...a.abschnitte.map((s) => s.titel), a.text, a.richtung].filter(Boolean).join(' · '), a.inhalt?.trim() && `Inhalt: ${a.inhalt.trim()}`].filter(Boolean).join(' · ') || 'Noch offen',
      hinweis: 'Worum geht es in dieser Stunde? Materialien findest du im Bereich „Materialien“.', editor: <ThemaEditor anker={a} setAnker={setze('anker')} onVorschlag={onThemaVorschlag} /> },
    { key: 'ziel', icon: Target, titel: modellAbschnitt ? 'Grundstruktur / Stundenziel' : 'Stundenziel', rand: 'border-l-primary', gesetzt: !!v.ziel.haupt || !!grund, stand: [modellAbschnitt && `Grundstruktur: ${grund ? modellName(grund.modell, grund.variante) : 'offen'}`, stundentypName(v.ziel.stundentyp) && v.ziel.stundentyp && stundentypName(v.ziel.stundentyp), v.ziel.haupt].filter(Boolean).join(' · ') || 'Noch offen – ich schlage dir eine Richtung vor',
      hinweis: 'Erst mal nur grob: In welche Richtung soll die Stunde gehen? Die genaue Formulierung kommt später.', ohneUntertitel: true, editor: <>{modellAbschnitt && <GrundstrukturWahl abschnitt={modellAbschnitt} wahl={v.grundstruktur} setWahl={setze('grundstruktur')} />}<ZielEditor ziel={v.ziel} setZiel={setze('ziel')} onVorschlag={onZielVorschlag} /></> },
    { key: 'gruppe', icon: Users, titel: 'Lerngruppe', rand: 'border-l-chart-3', gesetzt: !normal || !!a.vorwissen?.trim(), stand: gruppeStand,
      hinweis: 'Wie arbeitet die Klasse, und worauf können wir aufbauen?', editor: <LerngruppeEditor gruppe={v.gruppe} setGruppe={setze('gruppe')} vorwissen={a.vorwissen} setVorwissen={(t) => setze('anker')((x) => ({ ...x, vorwissen: t }))} /> },
    { key: 'methode', icon: Shapes, titel: 'Methodenwunsch', rand: 'border-l-chart-4', gesetzt: !!v.methode, stand: v.methode ? (v.methode.idee ? `Idee: ${v.methode.kurzbeschreibung}` : `${v.methode.name} – wird möglichst verwendet`) : 'Keine besondere Methode gewählt',
      hinweis: 'Hast du eine methodische Idee? Beschreib sie, und wir suchen die passende Methode. Sie wird dann in der Stunde eingebaut.', ohneUntertitel: true, editor: <><MethodenSuche grund={grund} wahl={v.methode} setWahl={setze('methode')} assistent={assistent} ideePlatzhalter="z. B. Die Schüler sollen ihre Ergebnisse an Stationen im Raum präsentieren."
        hinweis="Wenn du schon eine ungefähre Idee hast, was methodisch passieren soll, beschreib sie einfach. Du kannst sie erst mal nur als Idee stehen lassen oder schon eine bestimmte Methode auswählen, beides geht. Du musst hier nicht auf Teufel komm raus die richtige Methode finden: Es reicht völlig, wenn du sagst, was du schön fändest." /></> },
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
            <DialogHeader><DialogTitle>{akt.titel}</DialogTitle><DialogDescription className={akt.ohneUntertitel ? 'sr-only' : ''}>{akt.hinweis}</DialogDescription></DialogHeader>
            {akt.editor}
            <Button onClick={() => setOffen(null)}>Fertig</Button>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}