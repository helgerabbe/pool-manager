import React from 'react';
import { X } from 'lucide-react';
import ElementInhalt from './ElementInhalt';
import GroessenGriff from './GroessenGriff';
import { FOLIEN_ELEMENT } from '@/lib/folienElemente';
import { VORGABEN } from '@/lib/folienStil';

/** Die Folie (16:9): Elemente hineinziehen, verschieben, auswählen und entfernen. */
export default function FolienArbeitsflaeche({ elemente, setElemente, gewaehlt, setGewaehlt }) {
  const ref = React.useRef(null);

  const drop = (e) => {
    e.preventDefault();
    const r = ref.current.getBoundingClientRect();
    const neu = e.dataTransfer.getData('neu');
    const id = e.dataTransfer.getData('id');
    if (neu) {
      const d = FOLIEN_ELEMENT[neu];
      const el = { ...VORGABEN[neu], id: `${Date.now()}`, typ: neu, x: e.clientX - r.left - d.b / 2, y: e.clientY - r.top - d.h / 2, b: d.b, h: d.h };
      setElemente([...elemente, el]); setGewaehlt(el.id);
    } else if (id) {
      const [dx, dy] = e.dataTransfer.getData('versatz').split(',').map(Number);
      setElemente(elemente.map((el) => (el.id === id ? { ...el, x: e.clientX - r.left - dx, y: e.clientY - r.top - dy } : el)));
    }
  };

  return (
    <div ref={ref} onDragOver={(e) => e.preventDefault()} onDrop={drop} onClick={() => setGewaehlt(null)}
      className="relative aspect-video w-full max-w-5xl overflow-hidden rounded-xl bg-card shadow-lg ring-1 ring-border">
      {!elemente.length && <p className="absolute inset-0 flex items-center justify-center text-muted-foreground">Elemente aus der linken Leiste hierher ziehen</p>}
      {elemente.map((el) => (
        <div key={el.id} draggable
          onDragStart={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.dataTransfer.setData('id', el.id); e.dataTransfer.setData('versatz', `${e.clientX - r.left},${e.clientY - r.top}`); }}
          onClick={(e) => { e.stopPropagation(); setGewaehlt(el.id); }}
          style={{ left: el.x, top: el.y, width: el.b, height: el.h }}
          className={`absolute flex cursor-move items-center justify-center ${gewaehlt === el.id ? 'outline outline-2 outline-offset-2 outline-primary' : ''}`}>
          <div className="pointer-events-none flex h-full w-full items-center justify-center"><ElementInhalt el={el} /></div>
          {gewaehlt === el.id && <GroessenGriff el={el} nurBreite={el.typ === 'pfeil_duenn'} setze={(p) => setElemente((alle) => alle.map((x) => (x.id === el.id ? { ...x, ...p } : x)))} />}
          {gewaehlt === el.id && (
            <button onClick={() => { setElemente(elemente.filter((x) => x.id !== el.id)); setGewaehlt(null); }}
              className="absolute -right-3 -top-3 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}