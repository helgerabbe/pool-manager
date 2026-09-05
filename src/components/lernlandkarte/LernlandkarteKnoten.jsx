/**
 * LernlandkarteKnoten.jsx
 *
 * EIN Knoten auf der Lernlandkarte. Jede Art sieht bewusst ANDERS aus, damit
 * Schüler auf einen Blick erkennen, was sie da vor sich haben:
 *   Einheit     — runder Stern in der Mitte, groß, mit Leuchtring
 *   Themenfeld  — breite Karte mit farbigem Kopfbalken und Leitfrage
 *   Lernziel    — schmalere, hellere Karte mit Selbsteinschätzungs-Punkten
 *   Aufgaben    — orange Pille
 *   Vorwissen   — gestrichelter Rahmen (zeigt „rückwärts")
 *
 * Gesperrte Knoten liegen sichtbar, aber matt im Nebel — die Schüler sollen
 * sehen, dass da noch etwas kommt.
 */
import React from 'react';
import { Layers, BookOpen, ListChecks, History, Compass, Lock, Check } from 'lucide-react';
import { STUFEN_ANZAHL, stufeIndex, stufeVon } from '@/lib/lernlandkarteEinschaetzung';

const ART = {
  einheit: { icon: Compass, akzent: '#48cae4', breite: 260 },
  themenfeld: { icon: Compass, akzent: '#48cae4', breite: 280 },
  lernpaket: { icon: Layers, akzent: '#a8dadc', breite: 250 },
  aufgaben: { icon: ListChecks, akzent: '#f77f00', breite: 220 },
  vorwissen: { icon: History, akzent: '#a8dadc', breite: 210 },
  basispaket: { icon: BookOpen, akzent: '#a8dadc', breite: 210 },
};

/** Punkte-Reihe der Selbsteinschätzung (rot → grün). */
function StufenPunkte({ wert }) {
  const aktiv = stufeIndex(wert);
  const farbe = stufeVon(wert)?.farbe;
  return (
    <div className="mt-2.5 flex items-center gap-1.5">
      {Array.from({ length: STUFEN_ANZAHL }).map((_, i) => (
        <span
          key={i}
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: i < aktiv ? farbe : 'rgba(255,255,255,0.16)' }}
        />
      ))}
      {wert && (
        <span className="ml-1 text-[11px] font-semibold" style={{ color: farbe }}>
          {stufeVon(wert)?.kurz}
        </span>
      )}
    </div>
  );
}

export default function LernlandkarteKnoten({ node, position, status, aktiv, onClick }) {
  const art = ART[node.typ] || ART.lernpaket;
  const Icon = status?.gesperrt ? Lock : art.icon;
  const geschafft = status?.geschafft;
  const anteil = Math.round((status?.anteil || 0) * 100);
  const istEinheit = node.typ === 'einheit';
  const istThemenfeld = node.typ === 'themenfeld';
  const istLernziel = node.typ === 'lernpaket';
  const stufenFarbe = istLernziel ? stufeVon(status?.einschaetzung)?.farbe : null;
  const rahmen = aktiv ? art.akzent : stufenFarbe || 'rgba(255,255,255,0.12)';

  // ── Einheit: runder Mittelpunkt ────────────────────────────────────────
  if (istEinheit) {
    return (
      <button
        type="button"
        onClick={() => onClick?.(node)}
        style={{
          left: position.x,
          top: position.y,
          width: 210,
          height: 210,
          transform: 'translate(-50%, -50%)',
          boxShadow: `0 0 0 2px ${art.akzent}66, 0 0 70px ${art.akzent}40`,
        }}
        className="absolute flex flex-col items-center justify-center rounded-full border border-white/15 bg-[#16234a] px-6 text-center transition-all duration-500 hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#48cae4]"
      >
        <Compass className="mb-2 h-6 w-6 text-[#48cae4]" />
        <p className="font-display text-lg font-extrabold leading-tight text-white">{node.titel}</p>
        {status?.zaehler?.gesamt > 0 && (
          <p className="mt-1.5 text-xs font-semibold text-[#06d6a0]">
            {status.zaehler.fertig}/{status.zaehler.gesamt} geschafft
          </p>
        )}
      </button>
    );
  }

  // ── Aufgaben: Pille ───────────────────────────────────────────────────
  if (node.typ === 'aufgaben') {
    return (
      <button
        type="button"
        onClick={() => onClick?.(node)}
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
          borderColor: aktiv ? art.akzent : '#f77f0055',
        }}
        className={`absolute flex items-center gap-2.5 rounded-full border-2 bg-[#2a1c0f] px-5 py-3 transition-all duration-500 hover:border-[#f77f00] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f77f00] ${
          status?.gesperrt ? 'opacity-45' : ''
        }`}
      >
        <ListChecks className="h-4 w-4 shrink-0 text-[#f77f00]" />
        <span className="font-display text-sm font-bold text-white">{node.titel}</span>
        {status?.zaehler?.gesamt > 0 && (
          <span className="text-xs font-semibold text-white/60">
            {status.zaehler.fertig}/{status.zaehler.gesamt}
          </span>
        )}
      </button>
    );
  }

  // ── Themenfeld / Lernziel / Vorwissen: Karten ─────────────────────────
  return (
    <button
      type="button"
      onClick={() => onClick?.(node)}
      style={{
        left: position.x,
        top: position.y,
        width: art.breite,
        transform: 'translate(-50%, -50%)',
        borderColor: rahmen,
        borderStyle: node.typ === 'vorwissen' ? 'dashed' : 'solid',
        boxShadow: aktiv ? `0 0 0 1px ${art.akzent}, 0 0 42px ${art.akzent}55` : undefined,
      }}
      className={`absolute overflow-hidden rounded-2xl border-2 text-left transition-all duration-500 hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#48cae4] ${
        istThemenfeld ? 'bg-[#1c2541]' : 'bg-[#16203c]'
      } ${status?.gesperrt ? 'opacity-45' : ''}`}
    >
      {istThemenfeld && (
        <div
          className="flex items-center gap-2 px-4 py-1.5"
          style={{ backgroundColor: `${art.akzent}22` }}
        >
          <Compass className="h-3.5 w-3.5" style={{ color: art.akzent }} />
          <span
            className="text-[11px] font-bold uppercase tracking-wide"
            style={{ color: art.akzent }}
          >
            Thema
          </span>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-start gap-2.5">
          {!istThemenfeld && (
            <span
              className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: geschafft ? '#06d6a020' : `${art.akzent}1f`,
                color: geschafft ? '#06d6a0' : art.akzent,
              }}
            >
              {geschafft ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
            </span>
          )}
          <div className="min-w-0">
            <p
              className={`font-display leading-snug text-white ${
                istThemenfeld ? 'text-base font-bold' : 'text-[14px] font-semibold'
              }`}
            >
              {node.titel}
            </p>
            {!istLernziel && status?.zaehler?.gesamt > 0 && (
              <p className="mt-1 text-xs font-medium text-white/60">
                {status.zaehler.fertig} von {status.zaehler.gesamt} geschafft
              </p>
            )}
          </div>
        </div>

        {istLernziel && <StufenPunkte wert={status?.einschaetzung} />}

        {!istLernziel && status?.zaehler?.gesamt > 0 && (
          <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${anteil}%`, backgroundColor: '#06d6a0' }}
            />
          </div>
        )}
      </div>
    </button>
  );
}