/**
 * BasismodulViewManager
 * ────────────────────────────────────────────────────────────────────
 * Detailansicht eines Basismoduls. Nutzt denselben Workspace wie reguläre
 * Einheiten, schaltet aber per isBasismodul-Flag in den reduzierten Modus
 * (nur Tabs 1–5: Verwalten · Struktur · Lernziele · Aktivitäten · Basisaufgaben).
 *
 * Route: `/basismodule/:id`
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import Workspace from '@/pages/Workspace';

export default function BasismodulViewManager() {
  const { id } = useParams();

  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <Workspace initialEinheitId={id} isBasismodul />
    </div>
  );
}