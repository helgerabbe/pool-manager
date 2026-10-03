import React, { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

/** Einzel- (45 → 40 Min. netto) und Doppelstunden (90 → 85 Min. netto). */
export default function ZeitbudgetFeld({ planung, onSpeichern }) {
  const [einzel, setEinzel] = useState(0);
  const [doppel, setDoppel] = useState(0);
  useEffect(() => {
    setEinzel(planung?.einzelstunden || 0);
    setDoppel(planung?.doppelstunden || 0);
  }, [planung?.id]);

  const sichern = () => onSpeichern({ einzelstunden: Number(einzel) || 0, doppelstunden: Number(doppel) || 0 });
  const netto = (Number(einzel) || 0) * 40 + (Number(doppel) || 0) * 85;

  return (
    <div className="flex flex-wrap items-end gap-4 rounded-lg bg-muted/50 p-3">
      <label className="space-y-1 text-xs font-medium">
        Einzelstunden (45 Min.)
        <Input type="number" min={0} className="w-28" value={einzel} onChange={(e) => setEinzel(e.target.value)} onBlur={sichern} />
      </label>
      <label className="space-y-1 text-xs font-medium">
        Doppelstunden (90 Min.)
        <Input type="number" min={0} className="w-28" value={doppel} onChange={(e) => setDoppel(e.target.value)} onBlur={sichern} />
      </label>
      <p className="pb-2 text-xs text-muted-foreground">
        Planungszeit: <span className="font-semibold text-foreground">{netto} Min.</span> (je Stunde 5 Min. abgezogen)
      </p>
    </div>
  );
}