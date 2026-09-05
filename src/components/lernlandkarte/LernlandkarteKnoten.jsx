/**
 * LernlandkarteKnoten.jsx
 *
 * EIN Knoten auf der Lernlandkarte. Trägt Titel, Art-Symbol und den
 * Fortschritt; gesperrte Knoten liegen sichtbar, aber matt im Nebel — die
 * Schüler sollen sehen, dass da noch etwas kommt.
 */
import React from 'react';
import { Layers, BookOpen, ListChecks, History, Compass, Lock, Check } from 'lucide-react';

const ART = {
  einheit: { icon: Compass, akzent: '#48cae4', breite: 300 },
  themenfeld: { icon: Compass, akzent: '#48cae4', breite: 260 },
  lernpaket: { icon: Layers, akzent: '#48cae4', breite: 230 },
  wissensspeicher: { icon: BookOpen, akzent: '#a8dadc', breite: 180 },
  aufgaben: { icon: ListChecks, akzent: '#f77f00', breite: 200 },
  vorwissen: { icon: History, akzent: '#a8dadc', breite: 200 },
  basispaket: { icon: BookOpen, akzent: '#a8dadc', breite: 200 },
};

export default function LernlandkarteKnoten({ node, position, status, aktiv, onClick }) {
  const art = ART[node.typ] || ART.lernpaket;
  const Icon = status?.gesperrt ? Lock : art.icon;
  const gross = node.typ === 'einheit';
  const geschafft = status?.geschafft;
  const anteil = Math.round((status?.anteil || 0) * 100);

  return (
    <button
      type="button"
      onClick={() => onClick?.(node)}
      style={{
        left: position.x,
        top: position.y,
        width: art.breite,
        transform: 'translate(-50%, -50%)',
        borderColor: aktiv ? art.akzent : 'rgba(255,255,255,0.12)',
        boxShadow: aktiv ? `0 0 0 1px ${art.akzent}, 0 0 42px ${art.akzent}55` : undefined,
      }}
      className={`absolute rounded-2xl border bg-[#1c2541] px-4 py-3 text-left transition-all duration-300 hover:border-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#48cae4] ${
        status?.gesperrt ? 'opacity-45' : 'opacity-100'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: geschafft ? '#06d6a020' : `${art.akzent}1f`,
            color: geschafft ? '#06d6a0' : art.akzent,
          }}
        >
          {geschafft ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <div className="min-w-0">
          <p
            className={`font-display font-bold leading-snug text-white ${
              gross ? 'text-xl' : 'text-[15px]'
            }`}
          >
            {node.titel}
          </p>
          {status?.zaehler?.gesamt > 0 && (
            <p className="mt-1 text-xs font-medium text-white/60">
              {status.zaehler.fertig} von {status.zaehler.gesamt} geschafft
            </p>
          )}
        </div>
      </div>

      {(node.typ === 'themenfeld' ||
        node.typ === 'aufgaben' ||
        node.typ === 'vorwissen' ||
        node.typ === 'einheit') &&
        status?.zaehler?.gesamt > 0 && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${anteil}%`, backgroundColor: '#06d6a0' }}
            />
          </div>
        )}
    </button>
  );
}