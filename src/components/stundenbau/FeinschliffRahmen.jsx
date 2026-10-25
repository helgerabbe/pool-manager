import React from 'react';
import { Button } from '@/components/ui/button';
import { EyeOff, Eye, RotateCcw } from 'lucide-react';

// Pfad eines Elements als Kind-Indizes ab dem Rahmen – so findet man es nach jedem Neuzeichnen wieder.
const pfadVon = (root, el) => { const p = []; while (el && el !== root) { p.unshift([...el.parentNode.children].indexOf(el)); el = el.parentNode; } return p.join('.'); };
const elVon = (root, pfad) => pfad.split('.').reduce((el, i) => el?.children[Number(i)], root);

/** Manueller Feinschliff: Elemente verschieben, ausblenden, Texte ändern (Doppelklick). Speichert nur die Abweichungen. */
export default function FeinschliffRahmen({ aktiv, anpassungen = [], onAendern, children }) {
  const root = React.useRef(null);
  const [wahl, setWahl] = React.useState(null);
  const zug = React.useRef(null);
  const liste = React.useRef(anpassungen); liste.current = anpassungen;

  const setze = (pfad, patch) => {
    const alt = liste.current.find((a) => a.pfad === pfad) || { pfad, dx: 0, dy: 0 };
    onAendern([...liste.current.filter((a) => a.pfad !== pfad), { ...alt, ...patch }]);
  };

  React.useLayoutEffect(() => {
    const w = root.current.offsetWidth;
    anpassungen.forEach((a) => {
      const el = elVon(root.current, a.pfad); if (!el) return;
      el.style.transform = `translate(${a.dx * w}px, ${a.dy * w}px)`;
      el.style.opacity = a.versteckt ? (aktiv ? '0.2' : '0') : '';
      if (a.text != null && el.children.length === 0 && el.textContent !== a.text) el.textContent = a.text;
    });
    root.current.querySelectorAll('[data-fs-wahl]').forEach((el) => { el.style.outline = ''; delete el.dataset.fsWahl; });
    const sel = wahl && elVon(root.current, wahl);
    if (aktiv && sel) { sel.style.outline = '2px dashed hsl(var(--accent))'; sel.dataset.fsWahl = '1'; }
  });

  const runter = (e) => {
    if (!aktiv || e.target === root.current || e.target.isContentEditable) return;
    e.preventDefault(); e.stopPropagation();
    const pfad = pfadVon(root.current, e.target); setWahl(pfad);
    const a = liste.current.find((x) => x.pfad === pfad) || { dx: 0, dy: 0 };
    zug.current = { pfad, x: e.clientX, y: e.clientY, dx: a.dx, dy: a.dy };
  };
  const bewegen = (e) => {
    const z = zug.current; if (!z) return;
    const w = root.current.offsetWidth;
    setze(z.pfad, { dx: z.dx + (e.clientX - z.x) / w, dy: z.dy + (e.clientY - z.y) / w });
  };
  const doppel = (e) => {
    if (!aktiv || e.target.children.length) return;
    const el = e.target, pfad = pfadVon(root.current, el);
    el.contentEditable = 'true'; el.focus();
    el.onblur = () => { el.contentEditable = 'false'; setze(pfad, { text: el.textContent }); };
  };
  const gewaehlt = anpassungen.find((a) => a.pfad === wahl);

  return (
    <div>
      <div ref={root} onPointerDownCapture={runter} onPointerMove={bewegen} onPointerUp={() => { zug.current = null; }} onDoubleClick={doppel}
        onClickCapture={(e) => aktiv && e.preventDefault()} className={aktiv ? 'cursor-move rounded ring-2 ring-accent/50 [&_*]:!pointer-events-auto' : ''}>
        {children}
      </div>
      {aktiv && (
        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
          <span>Element anklicken und ziehen · Doppelklick ändert Text</span>
          {wahl && <>
            <Button size="sm" variant="outline" className="h-7" onClick={() => setze(wahl, { versteckt: !gewaehlt?.versteckt })}>{gewaehlt?.versteckt ? <><Eye className="h-3.5 w-3.5" /> Einblenden</> : <><EyeOff className="h-3.5 w-3.5" /> Wegnehmen</>}</Button>
            <Button size="sm" variant="ghost" className="h-7" onClick={() => { const el = elVon(root.current, wahl); if (el) { el.style.transform = ''; el.style.opacity = ''; } onAendern(anpassungen.filter((a) => a.pfad !== wahl)); }}><RotateCcw className="h-3.5 w-3.5" /> Zurücksetzen</Button>
          </>}
        </div>
      )}
    </div>
  );
}