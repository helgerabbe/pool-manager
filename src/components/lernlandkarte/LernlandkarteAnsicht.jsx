/**
 * LernlandkarteAnsicht.jsx
 *
 * Gemeinsame Ansicht der Lernlandkarte für Schüler UND Lehrer-Vorschau:
 * Kopfzeile, Karte, Seitenschiene und die Aufdeck-Logik.
 *
 * Die Karte deckt sich additiv auf: Zu Beginn sind die Wurzel und ihre
 * direkten Zweige zu sehen; jeder Klick zeigt die Kinder des Knotens.
 */
import React, { useMemo, useState } from 'react';
import { Map as MapIcon } from 'lucide-react';
import LernlandkarteCanvas from './LernlandkarteCanvas';
import LernlandkarteInspektor from './LernlandkarteInspektor';
import KleinerBildschirmHinweis from './KleinerBildschirmHinweis';
import { buildLernlandkarte, kinderVon, fokusLayout } from '@/lib/lernlandkarteGraph';
import { berechneStatus, darfSelbstMarkieren } from '@/lib/lernlandkarteStatus';

const LERNTYP_LABEL = {
  minimalist: 'Schritt für Schritt',
  pragmatiker: 'Zielgerichtet',
  ehrgeizig: 'Frei unterwegs',
  passioniert: 'Frei unterwegs',
};

export default function LernlandkarteAnsicht({
  einheitTitel,
  themenfelder = [],
  lernpakete = [],
  lernziele = [],
  aufgaben = [],
  vorwissenPakete = [],
  lerntyp = 'pragmatiker',
  einschaetzungByZiel = {},
  bearbeiteteAufgabenIds = [],
  onOeffnen,
  onMarkieren,
  busy,
}) {
  const { nodes } = useMemo(
    () =>
      buildLernlandkarte({
        einheitTitel,
        themenfelder,
        lernpakete,
        lernziele,
        aufgaben,
        vorwissenPakete,
      }),
    [einheitTitel, themenfelder, lernpakete, lernziele, aufgaben, vorwissenPakete]
  );

  const status = useMemo(
    () => berechneStatus({ nodes, lerntyp, einschaetzungByZiel, bearbeiteteAufgabenIds }),
    [nodes, lerntyp, einschaetzungByZiel, bearbeiteteAufgabenIds]
  );

  // Fokus-Navigation: Der angeklickte Knoten fährt in die Mitte, seine Kinder
  // ordnen sich neu darum an. So kann sich nichts überlappen.
  const [fokusId, setFokusId] = useState('root');
  const [aktivId, setAktivId] = useState(null);

  const positionen = useMemo(() => fokusLayout(nodes, fokusId), [nodes, fokusId]);

  const sichtbar = useMemo(() => {
    const set = new Set([fokusId]);
    const fokus = nodes.find((n) => n.id === fokusId);
    if (fokus?.parentId) set.add(fokus.parentId);
    for (const kind of kinderVon(nodes, fokusId)) set.add(kind.id);
    return set;
  }, [fokusId, nodes]);

  const handleClick = (node) => {
    setAktivId(node.id);
    if (kinderVon(nodes, node.id).length > 0) setFokusId(node.id);
  };

  const aktiv = nodes.find((n) => n.id === aktivId) || null;
  const gesamt = status.root || {};

  if (nodes.length <= 1) {
    return (
      <div className="flex h-full items-center justify-center bg-[#0b132b] px-8 text-center text-white/60">
        Für diese Einheit sind noch keine Themenfelder und Lernziele hinterlegt —
        die Lernlandkarte bleibt leer.
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#0b132b]">
      {/* Kopfzeile */}
      <header className="flex shrink-0 items-center gap-3 border-b border-white/10 px-5 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-[#48cae4]">
          <MapIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-bold text-white">
            {einheitTitel || 'Deine Einheit'}
          </p>
          <p className="text-xs text-white/50">Lernlandkarte</p>
        </div>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
          {LERNTYP_LABEL[lerntyp] || 'Dein Weg'}
        </span>
        {gesamt.zaehler?.gesamt > 0 && (
          <span className="text-xs font-semibold text-[#06d6a0]">
            {gesamt.zaehler.fertig}/{gesamt.zaehler.gesamt} geschafft
          </span>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <LernlandkarteCanvas
          nodes={nodes}
          positionen={positionen}
          status={status}
          sichtbar={sichtbar}
          aktivId={aktivId}
          fokusId={fokusId}
          onKnotenClick={handleClick}
        />
        <LernlandkarteInspektor
          node={aktiv}
          status={aktiv ? status[aktiv.id] : null}
          kannSelbstMarkieren={darfSelbstMarkieren(lerntyp)}
          onOeffnen={onOeffnen}
          onMarkieren={onMarkieren}
          busy={busy}
        />
      </div>

      <KleinerBildschirmHinweis titel={einheitTitel} />
    </div>
  );
}