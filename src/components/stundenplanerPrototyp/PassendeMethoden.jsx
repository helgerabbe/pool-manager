import React from 'react';
import { ListChecks, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { EINORDNUNG_PROBE } from '@/lib/stundenModelle';
import { VARIANTEN_PASSUNG } from '@/lib/methodenVariantenPassung';

const LABEL = { 1: 'passt sehr gut', 2: 'passt gut' };

// Passung zuerst nach gewählter Variante, sonst nach Stundenmodell.
const passendeNamen = (modellKey, varianteKey) => {
  const namen = new Set([...Object.keys(EINORDNUNG_PROBE), ...Object.keys(VARIANTEN_PASSUNG)]);
  return [...namen].map((name) => {
    const v = varianteKey && VARIANTEN_PASSUNG[name]?.[varianteKey];
    const r = EINORDNUNG_PROBE[name]?.[modellKey];
    return v ? { name, wert: v[0], hinweis: v[1] } : r ? { name, wert: r.passung, hinweis: r.hinweis } : null;
  }).filter((x) => x && x.wert <= 2).sort((a, b) => a.wert - b.wert || a.name.localeCompare(b.name));
};

/** Zeigt alle Methoden, die laut Raster gut zu dieser Stunde passen. */
export default function PassendeMethoden({ modellKey, varianteKey, onWahl }) {
  const [liste, setListe] = React.useState(null);
  const [laedt, setLaedt] = React.useState(false);

  const zeigen = async () => {
    setLaedt(true);
    const passend = passendeNamen(modellKey, varianteKey);
    const page = await base44.entities.MethodenKatalog.filter(
      { name: { $in: passend.map((p) => p.name) }, quelle: { $ne: 'poolzeit' }, ist_aktiv: { $ne: false } },
      { limit: 200, fields: ['name', 'stufe', 'kurzbeschreibung', 'dauer_min', 'dauer_max'] });
    const byName = Object.fromEntries(page.items.map((m) => [m.name, m]));
    setListe(passend.filter((p) => byName[p.name]).map((p) => ({ ...p, methode: byName[p.name] })));
    setLaedt(false);
  };

  if (!liste) return <Button size="sm" variant="outline" disabled={laedt} onClick={zeigen}>{laedt ? <Loader2 className="animate-spin" /> : <ListChecks />} Passende Methoden zeigen</Button>;
  return (
    <div className="w-full space-y-2 rounded-xl border bg-card p-3">
      <p className="text-xs font-semibold">{liste.length} Methoden passen gut zu dieser Stunde</p>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {liste.map(({ name, wert, hinweis, methode: m }) => (
          <button key={name} onClick={() => { onWahl(m); setListe(null); }} className="block w-full rounded-lg border p-2 text-left text-sm hover:border-primary/40">
            <span className="font-semibold">{name}</span>
            <span className={`ml-2 rounded px-1.5 text-[11px] ${wert === 1 ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>{LABEL[wert]}</span>
            <span className="ml-2 text-xs text-muted-foreground">{m.dauer_min ? `${m.dauer_min}–${m.dauer_max || m.dauer_min} Min.` : ''}</span>
            {hinweis && <span className="block text-xs text-muted-foreground">{hinweis}</span>}
          </button>
        ))}
      </div>
      <button className="text-xs text-muted-foreground" onClick={() => setListe(null)}>Schließen</button>
    </div>
  );
}