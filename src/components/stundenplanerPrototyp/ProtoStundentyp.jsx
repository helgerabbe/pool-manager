import React from 'react';
import { Compass, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ModellKarte from './ModellKarte';
import InduktivVarianten from './InduktivVarianten';
import { DEDUKTIVE_VARIANTEN } from '@/lib/deduktiveVarianten';
import { VERTIEFTE_VARIANTEN } from '@/lib/vertiefteVarianten';

/** Schritt 3: Welche Art von Stunde ist das? KI-Vorschlag aus den didaktischen Grundmodellen. */
const STUFE = { 1: 'sehr niedrig', 2: 'eher niedrig', 3: 'normal', 4: 'eher hoch', 5: 'sehr hoch' };

export default function ProtoStundentyp({ gruppe, typ, modell, setModell, variante, setVariante, dVariante, setDVariante, vVariante, setVVariante, onErstellen, onWeiter }) {
  const [laedt, setLaedt] = React.useState(false);
  const [fehler, setFehler] = React.useState(false);
  const erstellen = () => { setLaedt(true); setFehler(false); onErstellen().catch(() => setFehler(true)).finally(() => setLaedt(false)); };
  React.useEffect(() => { if (!typ) erstellen(); }, []);
  if (laedt) return <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Ich überlege, wie die Stunde aufgebaut sein sollte …</p>;
  if (fehler || !typ) return <div className="space-y-2"><p className="text-sm text-destructive">Der Stundentyp konnte nicht vorgeschlagen werden.</p><Button size="sm" onClick={erstellen}>Noch einmal versuchen</Button></div>;
  const vorschlag = modell === typ.vorschlag;
  const andere = [{ key: typ.vorschlag, wann: 'Mein ursprünglicher Vorschlag.' }, ...typ.alternativen].filter((a) => a.key !== modell);
  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"><Compass className="h-4 w-4" /> {vorschlag ? 'So würde ich die Stunde anlegen' : 'Deine Wahl'}</p>
      <ModellKarte modellKey={modell} hervorgehoben text={vorschlag ? typ.begruendung : 'Der Entwurf folgt diesem Aufbau.'} />
      {gruppe && <p className="text-xs text-muted-foreground">Berücksichtigte Lerngruppe: Arbeitstempo {STUFE[gruppe.fit]}, Selbstständigkeit {STUFE[gruppe.stark]}.</p>}
      {modell === 'induktiv' && <InduktivVarianten wert={variante} setWert={setVariante} empfehlung={typ.variante} begruendung={typ.variante_begruendung} />}
      {modell === 'deduktiv' && <InduktivVarianten varianten={DEDUKTIVE_VARIANTEN} frage="Wie soll die Regel vermittelt werden?" wert={dVariante} setWert={setDVariante} empfehlung={typ.deduktiv_variante} begruendung={typ.deduktiv_begruendung} />}
      {modell === 'vertieft' && <InduktivVarianten varianten={VERTIEFTE_VARIANTEN} frage="Was soll das Team am Ende erarbeiten?" wert={vVariante} setWert={setVVariante} empfehlung={typ.vertieft_variante} begruendung={typ.vertieft_begruendung} />}
      <p className="text-sm text-muted-foreground">Ist das in deinem Sinne – oder soll der Schwerpunkt woanders liegen?</p>
      <div className="space-y-2">
        {andere.map((a) => (
          <ModellKarte key={a.key} modellKey={a.key} text={a.wann}>
            <Button size="sm" variant="outline" onClick={() => setModell(a.key)}>Stattdessen</Button>
          </ModellKarte>
        ))}
      </div>
      <Button onClick={onWeiter}>Passt so – weiter zum Stundenziel</Button>
    </div>
  );
}