import React, { useRef, useState } from 'react';
import { Eye, X, Link2, Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import KarteVorlage, { KARTEN_FARBEN } from './KarteVorlage';
import KartenStapel from './KartenStapel';

let naechsteId = 1;

/** Tafel: Sammeln (verdeckter Stapel) und Clustern (aufdecken, frei schieben, auf das Verbinden-Symbol ziehen = Stapel mit Oberbegriff). */
export default function KartenTafel({ stapel, setStapel }) {
  const [modus, setModus] = useState('sammeln');
  const [items, setItems] = useState([]); // {id, x, y, titel, offen, karten:[{t,n,f,zeigen}]}
  const [zug, setZug] = useState(null);
  const board = useRef(null);

  const aufdecken = () => {
    const [oben, ...rest] = stapel; setStapel(rest);
    setItems([...items, { id: naechsteId++, x: 18 + (items.length % 4) * 4, y: 8 + (items.length % 4) * 6, titel: '', karten: [{ ...oben, f: KARTEN_FARBEN[items.length % 4] }] }]);
  };
  const aendern = (id, f) => setItems((alt) => alt.map((it) => (it.id === id ? f(it) : it)));
  const prozent = (e) => { const r = board.current.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100]; };

  const start = (e, it) => { if (e.target.closest('[data-knopf]')) return; const [px, py] = prozent(e); setZug({ id: it.id, dx: px - it.x, dy: py - it.y, bewegt: false }); e.currentTarget.setPointerCapture(e.pointerId); };
  const bewegen = (e) => { if (!zug) return; const [px, py] = prozent(e); if (!zug.bewegt) setZug({ ...zug, bewegt: true }); aendern(zug.id, (it) => ({ ...it, x: Math.max(0, Math.min(85, px - zug.dx)), y: Math.max(0, Math.min(85, py - zug.dy)) })); };
  const ende = (e) => {
    if (!zug) return;
    if (!zug.bewegt) { aendern(zug.id, (it) => (it.karten.length > 1 ? { ...it, offen: !it.offen } : it)); setZug(null); return; }
    const ziel = document.elementsFromPoint(e.clientX, e.clientY).map((el) => el.closest?.('[data-verbinden]')).find((el) => el && Number(el.dataset.verbinden) !== zug.id);
    if (ziel) {
      const zid = Number(ziel.dataset.verbinden);
      setItems((alt) => { const q = alt.find((it) => it.id === zug.id); return alt.filter((it) => it.id !== zug.id).map((it) => (it.id === zid ? { ...it, karten: [...it.karten, ...q.karten], titel: it.titel || q.titel } : it)); });
    }
    setZug(null);
  };
  const karte = (it, k, i) => (
    <KarteVorlage key={i} farbe={k.f} className="pr-4">
      <span className="font-hand text-[11px]">{k.t}</span>
      {k.zeigen && <span className="block text-[7px] text-[#6A7181]">{k.n}</span>}
      <span data-knopf className="absolute right-0.5 top-1.5 flex flex-col gap-0.5">
        <Eye onClick={() => aendern(it.id, (g) => ({ ...g, karten: g.karten.map((x, j) => (j === i ? { ...x, zeigen: !x.zeigen } : x)) }))} className="h-2.5 w-2.5 cursor-pointer text-[#6A7181]" />
        <X onClick={() => (it.karten.length === 1 ? setItems(items.filter((x) => x.id !== it.id)) : aendern(it.id, (g) => ({ ...g, karten: g.karten.filter((_, j) => j !== i) })))} className="h-2.5 w-2.5 cursor-pointer text-[#C0392B]" />
      </span>
    </KarteVorlage>
  );

  return (
    <div ref={board} onPointerMove={bewegen} onPointerUp={ende} className="absolute inset-0 select-none p-[2%] text-[9px]">
      <div className="absolute right-[2%] top-[3%] z-20 flex items-center gap-0.5">
        <Popover>
          <PopoverTrigger className="rounded-full bg-white p-0.5 text-[#6A7181] ring-1 ring-[#E4E1DA]"><Info className="h-3 w-3" /></PopoverTrigger>
          <PopoverContent className="w-64 text-xs">
            {modus === 'sammeln' ? 'Die Schüler schreiben ihre Karten. Sie landen verdeckt im Stapel. Danach auf „Clustern“ wechseln.'
              : 'Stapel oben links antippen: Die oberste Karte wird aufgedeckt. Karte frei auf der Tafel ablegen. Auf das orange Verbinden-Symbol einer anderen Karte ziehen: Es entsteht ein Stapel mit Oberbegriff. Stapel antippen zeigt die Karten darin.'}
          </PopoverContent>
        </Popover>
        {['sammeln', 'clustern'].map((m) => <button key={m} onClick={() => setModus(m)} className={`rounded-full px-1.5 py-0.5 text-[8px] ${modus === m ? 'bg-[#2A4074] text-white' : 'border bg-white'}`}>{m === 'sammeln' ? 'Sammeln' : 'Clustern'}</button>)}
      </div>
      {modus === 'sammeln' ? (
        <div className="flex h-full flex-col items-center justify-center gap-1 text-[11px]">
          <p className="font-display text-[12px] font-bold">Was fällt euch dazu ein?</p>
          <KartenStapel anzahl={stapel.length} />
        </div>
      ) : (
        <>
          <div className="absolute left-[2%] top-[3%] z-20"><KartenStapel anzahl={stapel.length} aktiv onAufdecken={aufdecken} /></div>
          {items.map((it) => {
            const gruppe = it.karten.length > 1;
            return (
              <div key={it.id} onPointerDown={(e) => start(e, it)} style={{ left: `${it.x}%`, top: `${it.y}%` }} className={`absolute touch-none ${gruppe ? 'w-[20%]' : 'w-[16%]'} ${zug?.id === it.id ? 'z-30 cursor-grabbing opacity-90' : it.offen ? 'z-20 cursor-grab' : 'z-10 cursor-grab'}`}>
                {gruppe ? (
                  <div className="flex flex-col items-start gap-0.5">
                    <input data-knopf value={it.titel} onChange={(e) => aendern(it.id, (g) => ({ ...g, titel: e.target.value }))} placeholder="Oberbegriff …" className="w-full border-b-2 border-[#2A4074] bg-transparent font-display font-bold text-[#2A4074] outline-none" />
                    <KartenStapel anzahl={it.karten.length} aktiv text={`${it.karten.length} Karten`} />
                    {it.offen && <div data-knopf className="mt-1 w-[130%] space-y-1 rounded-lg bg-white/95 p-1 shadow-lg ring-1 ring-[#2A4074]/15">{it.karten.map((k, i) => karte(it, k, i))}</div>}
                  </div>
                ) : karte(it, it.karten[0], 0)}
                <div data-verbinden={it.id} title="Karte hierher ziehen, um zu verbinden" className={`absolute ${gruppe ? 'left-[3.4em] top-[3.3em]' : '-bottom-2 left-1/2 -translate-x-1/2'} flex h-4 w-4 items-center justify-center rounded-full bg-[#E07A5F] text-white shadow ${zug && zug.id !== it.id ? 'scale-125 ring-2 ring-[#E07A5F]/40' : ''}`}><Link2 className="h-2.5 w-2.5" /></div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}