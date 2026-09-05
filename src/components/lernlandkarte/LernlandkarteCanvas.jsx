/**
 * LernlandkarteCanvas.jsx
 *
 * Die zieh- und zoombare Fläche der Lernlandkarte: dezente Verbindungslinien
 * als SVG, darüber die Knoten. Etappe 1 bewusst OHNE Animation — erst muss
 * die Logik stimmen.
 */
import React, { useRef, useState } from 'react';
import { Plus, Minus, Crosshair } from 'lucide-react';
import LernlandkarteKnoten from './LernlandkarteKnoten';

const START = { x: 0, y: 0, zoom: 0.72 };

export default function LernlandkarteCanvas({
  nodes,
  positionen,
  status,
  sichtbar,
  aktivId,
  onKnotenClick,
}) {
  const [view, setView] = useState(START);
  const ziehen = useRef(null);

  const sichtbareNodes = nodes.filter((n) => sichtbar.has(n.id));
  const kanten = sichtbareNodes
    .filter((n) => n.parentId && sichtbar.has(n.parentId) && positionen[n.parentId] && positionen[n.id])
    .map((n) => ({
      id: n.id,
      von: positionen[n.parentId],
      bis: positionen[n.id],
      gesperrt: status[n.id]?.gesperrt,
    }));

  const onPointerDown = (e) => {
    ziehen.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    if (!ziehen.current) return;
    // Werte VOR dem Setter auslesen: React kann die Update-Funktion später
    // (auch nach dem Loslassen) erneut auswerten — dann wäre ziehen.current null.
    const { x, y, vx, vy } = ziehen.current;
    const naechstesX = vx + (e.clientX - x);
    const naechstesY = vy + (e.clientY - y);
    setView((v) => ({ ...v, x: naechstesX, y: naechstesY }));
  };
  const onPointerUp = () => {
    ziehen.current = null;
  };
  const zoomen = (delta) =>
    setView((v) => ({ ...v, zoom: Math.min(1.4, Math.max(0.35, v.zoom + delta)) }));

  return (
    <div
      className="relative flex-1 cursor-grab overflow-hidden bg-[#0b132b] active:cursor-grabbing"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={(e) => {
        e.preventDefault();
        zoomen(e.deltaY > 0 ? -0.06 : 0.06);
      }}
    >
      {/* Aura hinter der Mitte */}
      <div
        className="pointer-events-none absolute rounded-full"
        style={{
          left: '50%',
          top: '50%',
          width: 620,
          height: 620,
          transform: `translate(calc(-50% + ${view.x}px), calc(-50% + ${view.y}px))`,
          background: 'radial-gradient(circle, rgba(72,202,228,0.16) 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute left-1/2 top-1/2"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
      >
        <svg
          className="pointer-events-none absolute overflow-visible"
          style={{ left: 0, top: 0, width: 1, height: 1 }}
        >
          {kanten.map((k) => (
            <line
              key={k.id}
              x1={k.von.x}
              y1={k.von.y}
              x2={k.bis.x}
              y2={k.bis.y}
              stroke="rgba(255,255,255,0.16)"
              strokeWidth="2"
              strokeDasharray={k.gesperrt ? '6 8' : undefined}
            />
          ))}
        </svg>

        {sichtbareNodes.map((n) => (
          <LernlandkarteKnoten
            key={n.id}
            node={n}
            position={positionen[n.id]}
            status={status[n.id]}
            aktiv={aktivId === n.id}
            onClick={onKnotenClick}
          />
        ))}
      </div>

      {/* Steuerung */}
      <div className="absolute bottom-5 right-5 flex flex-col gap-2">
        {[
          { icon: Plus, label: 'Größer', action: () => zoomen(0.12) },
          { icon: Minus, label: 'Kleiner', action: () => zoomen(-0.12) },
          { icon: Crosshair, label: 'Mitte', action: () => setView(START) },
        ].map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={b.action}
            title={b.label}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/12 bg-[#1c2541] text-white/80 transition-colors hover:text-white"
          >
            <b.icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </div>
  );
}