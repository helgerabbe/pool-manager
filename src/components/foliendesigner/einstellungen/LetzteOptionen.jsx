import React from 'react';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import Umschalter from './Umschalter';

const ZUFALL = [['rad', 'Glücksrad'], ['wuerfel', 'Würfel'], ['namen', 'Namen ziehen']];

/** Einstellungen: Zufallsgenerator, externe Seite, Raster als Kreuzworträtsel, Audioaufnahme zur Zeichnung. */
export default function LetzteOptionen({ el, setze }) {
  if (el.typ === 'zufall') return (
    <div className="space-y-2">
      <Umschalter titel="Art" optionen={ZUFALL} wert={el.art_zufall || 'rad'} setze={(v) => setze({ art_zufall: v })} />
      {(el.art_zufall || 'rad') === 'rad' && <Input value={el.felder || ''} onChange={(e) => setze({ felder: e.target.value })} placeholder="Felder, durch Komma getrennt" />}
      {el.art_zufall === 'namen' && <p className="text-xs text-muted-foreground">Gezogen wird aus der Klasse; schon Gezogene kommen erst wieder, wenn alle dran waren.</p>}
    </div>
  );
  if (el.typ === 'extern') return (
    <div className="space-y-1"><p className="text-xs font-medium text-muted-foreground">Adresse der Seite</p>
      <Input value={el.url || ''} onChange={(e) => setze({ url: e.target.value })} placeholder="https://www.geogebra.org/m/…" /></div>
  );
  if (el.typ === 'raster') return (
    <Umschalter titel="Raster als" optionen={[['felder', 'Aufdeckfelder'], ['kreuzwort', 'Kreuzworträtsel']]} wert={el.raster_art || 'felder'} setze={(v) => setze({ raster_art: v })} />
  );
  if (el.typ === 'audioaufnahme') return (
    <label className="flex items-start justify-between gap-3">
      <span><span className="block text-sm font-medium">Zur Zeichenfläche aufnehmen</span><span className="block text-xs text-muted-foreground">Ton und Zeichnung werden gemeinsam aufgenommen (Erklärvideo).</span></span>
      <Switch checked={!!el.mit_zeichnung} onCheckedChange={(v) => setze({ mit_zeichnung: v })} />
    </label>
  );
  return null;
}