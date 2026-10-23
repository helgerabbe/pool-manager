import React, { useState } from 'react';
import { CI_GRUND, CI_RASTER, CI_ZONEN_JE_TYP, CI_FOLIENTYPEN, CI_STEUERUNG, CI_METHODE_ANZEIGE } from '@/lib/folienCI';

const zone = 'absolute flex items-center justify-center rounded-lg border border-dashed text-[10px] text-center';

/** Vorschau Teil 4: festes Folienraster mit Kopfleiste und zwei Eckzonen, je Folientyp. */
export default function CiRasterVorschau() {
  const [typ, setTyp] = useState('aufgabe');
  const z = CI_ZONEN_JE_TYP[typ];
  const { kopf, oben, unten } = CI_RASTER;
  return (
    <div className="space-y-3 rounded-xl p-4 ring-1 ring-border" style={{ background: CI_GRUND.hintergrund }}>
      <div className="flex flex-wrap gap-2">
        {Object.keys(CI_ZONEN_JE_TYP).map((k) => (
          <button key={k} onClick={() => setTyp(k)} className={`rounded-full border px-3 py-1 text-xs ${k === typ ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>{CI_FOLIENTYPEN[k].name}</button>
        ))}
      </div>
      <div className="relative mx-auto aspect-video w-full max-w-2xl overflow-hidden rounded-xl bg-card ring-1 ring-border">
        <div className="absolute inset-x-0 top-0 flex items-center border-b px-3 text-[10px] text-muted-foreground" style={{ height: `${kopf.hoehe}%` }}><img src={CI_RASTER.logo.url} alt="Logo" className="mr-2 rounded-sm object-contain opacity-80" style={{ height: `${CI_RASTER.logo.hoehe}%` }} />Erdkunde · Stadt und Land · Warum ziehen Menschen in die Städte?<span className="ml-auto rounded-full px-2 py-0.5 font-semibold" style={{ background: CI_METHODE_ANZEIGE.hg, color: CI_METHODE_ANZEIGE.text }}>{CI_METHODE_ANZEIGE.beispiel} · {CI_METHODE_ANZEIGE.schritt}</span></div>
        <div className={`${zone} border-primary/40 bg-primary/5 text-primary`} style={{ top: `${kopf.hoehe + 2}%`, left: '3%', right: z.oben ? `${oben.breite + 5}%` : '3%', bottom: '4%' }}>Inhaltsbereich</div>
        {z.oben && <div className={`${zone} bg-muted`} style={{ top: `${kopf.hoehe + 2}%`, right: '3%', width: `${oben.breite}%`, height: `${oben.hoehe}%` }}>{oben.inhalt}</div>}
        {z.unten && <div className={`${zone} bg-muted`} style={{ bottom: '4%', right: '3%', width: `${unten.breite}%`, height: `${unten.hoehe}%` }}>{unten.inhalt}</div>}
      </div>
      <p className="text-xs"><b>Steuerung – {CI_STEUERUNG.regel}:</b> Lehrkraft: {CI_STEUERUNG.lehrkraft} Schüler zurück: {CI_STEUERUNG.schueler_zurueck} Schüler vor: {CI_STEUERUNG.schueler_vor}</p>
      <p className="text-xs text-muted-foreground">Dieses Raster gilt für die Tafel (16:9). Das iPad nutzt dieselben Ecken, nur mit eigener Leiste oben (Teil 13). Die Ecken sind nur belegt, wenn der Folientyp sie braucht. Sonst gehört die Fläche dem Inhalt. Inhalte dürfen nie in eine belegte Zone ragen. Rechts in der Kopfleiste steht immer die laufende Methode mit dem aktuellen Schritt (nur Text, kein Symbol).</p>
    </div>
  );
}