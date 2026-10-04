import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { istDigitalerTyp } from '@/lib/stundenPhasen';
import StundenDigitalSeite from '@/components/unterrichtsstunden/schueler/StundenDigitalSeite';
import StundenAnalogSeite from '@/components/unterrichtsstunden/schueler/StundenAnalogSeite';

/** Vorschau eines Schülergeräts für eine Phase (ohne Code-Sperre, ohne Navigation). */
export default function SchuelerGeraet({ phase }) {
  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalogAlle'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list('name', 200),
    staleTime: 10 * 60 * 1000,
  });
  const nix = () => {};
  return (
    <div className="mx-auto h-[32rem] w-full max-w-md overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-background text-foreground">
      {istDigitalerTyp(phase.typ)
        ? <StundenDigitalSeite key={phase.id} phase={phase} kat={katalog.find((k) => k.id === phase.aktivitaet_id)} onWeiter={nix} onZurueck={nix} />
        : <StundenAnalogSeite key={phase.id} phase={phase} onWeiter={nix} onZurueck={nix} />}
    </div>
  );
}