import React from 'react';
import { Users, Network, Hand, Check, Star, VolumeX } from 'lucide-react';

/** Kachel eines Paares/einer Gruppe. Mit eingeschalteten Rückmeldungen: Stern (sichtbar an der Tafel) oder Leise-Hinweis (nur auf die Geräte des Teams). */
export default function TeamKachel({ t, gruppe, rueckmeldung, sterne, onStern, onLeise }) {
  return (
    <div className="rounded-md border bg-white p-1 text-[9px]" style={t.g ? { background: t.g.hg, color: t.g.text, borderColor: t.g.hg } : undefined}>
      <b className="flex items-center gap-0.5">{gruppe ? <Network className="h-2.5 w-2.5" /> : <Users className="h-2.5 w-2.5" />}{t.n}
        {sterne > 0 && <span className="flex items-center text-[#C98A12]">{Array.from({ length: Math.min(sterne, 3) }).map((_, i) => <Star key={i} className="h-2.5 w-2.5 fill-current" />)}</span>}
        {t.m && <Hand className="ml-auto h-2.5 w-2.5 text-[#8A4B3C]" />}{t.p === 100 && <Check className="ml-auto h-2.5 w-2.5 text-[#24553A]" />}</b>
      <div className="mt-1 h-1 rounded bg-[#E4E1DA]"><div className="h-1 rounded bg-[#7FA6D6]" style={{ width: `${t.p}%` }} /></div>
      {rueckmeldung && (
        <div className="mt-1 flex gap-1">
          <button type="button" onClick={onStern} title="Stern: Ihr arbeitet richtig gut" className="flex flex-1 justify-center rounded bg-[#FBEEDD] py-0.5 text-[#C98A12]"><Star className="h-2.5 w-2.5" /></button>
          <button type="button" onClick={onLeise} title="Leise-Hinweis nur an dieses Team" className="flex flex-1 justify-center rounded bg-[#E3EFE6] py-0.5 text-[#24553A]"><VolumeX className="h-2.5 w-2.5" /></button>
        </div>
      )}
    </div>
  );
}