import React from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

const Regler = ({ titel, links, rechts, wert, setWert }) => (
  <div className="space-y-3 rounded-xl border bg-card p-4">
    <p className="text-sm font-semibold">{titel}</p>
    <Slider min={1} max={5} step={1} value={[wert]} onValueChange={([v]) => setWert(v)} />
    <div className="flex justify-between text-xs text-muted-foreground"><span>{links}</span><span>{rechts}</span></div>
  </div>
);

/** Schritt 5: Lerngruppe – Standard ist „normale Klasse“, genauere Einordnung nur bei Bedarf. */
export default function ProtoLerngruppe({ gruppe, setGruppe, onWeiter }) {
  const [genauer, setGenauer] = React.useState(false);
  const standard = gruppe.fit === 3 && gruppe.stark === 3;
  return (
    <div className="space-y-4">
      <div className="flex gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
        <Users className="h-5 w-5 shrink-0 text-primary" />
        <div>
          <p className="text-sm font-semibold">{standard ? 'Ich plane für eine ganz normale Klasse' : 'Ich plane mit deiner Einschätzung'}</p>
          <p className="text-sm text-muted-foreground">{standard ? 'Mittleres Arbeitstempo, normale Selbstständigkeit. Das reicht für einen guten Entwurf.' : 'Der Entwurf berücksichtigt Arbeitstempo und Selbstständigkeit der Klasse.'}</p>
        </div>
      </div>
      <button className="flex items-center gap-1 text-xs text-primary" onClick={() => setGenauer(!genauer)}>
        <ChevronDown className={`h-3 w-3 transition-transform ${genauer ? 'rotate-180' : ''}`} /> Genauer einordnen (optional)
      </button>
      {genauer && (
        <div className="space-y-3">
          <Regler titel="Wie ist das Arbeitstempo der Klasse?" links="Eher langsam" rechts="Eher schnell"
            wert={gruppe.fit} setWert={(v) => setGruppe({ ...gruppe, fit: v })} />
          <Regler titel="Wie selbstständig arbeitet die Klasse?" links="Braucht viel Anleitung" rechts="Sehr selbstständig"
            wert={gruppe.stark} setWert={(v) => setGruppe({ ...gruppe, stark: v })} />
        </div>
      )}
      <Button onClick={onWeiter}>{standard ? 'Mach einfach – weiter' : 'Weiter zum Stundentyp'}</Button>
    </div>
  );
}