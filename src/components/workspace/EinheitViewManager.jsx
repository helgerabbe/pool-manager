/**
 * EinheitViewManager
 * ────────────────────────────────────────────────────────────────────
 * CONTAINER-KOMPONENTE für die Detailansicht einer Einheit.
 *
 * Orchestriert das Zwei-Wege-Layout:
 *   - UnitToolbar (Sub-Header mit View-Toggle)
 *   - Bedingtes Rendering: EinheitStrukturBoard vs. Workspace
 *
 * Route: `/einheiten/:id`
 * Props: einheitId (aus URL-Parametern)
 */
import React from 'react';
import { useParams } from 'react-router-dom';
import Workspace from '@/pages/Workspace';

export default function EinheitViewManager() {
  const { id: einheitId } = useParams();

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — Strikte vertikale Stacking-Hierarchie
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-full w-full bg-background overflow-hidden">
      <Workspace initialEinheitId={einheitId} />
    </div>
  );
}