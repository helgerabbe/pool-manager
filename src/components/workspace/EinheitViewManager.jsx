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
    <div className="flex flex-col h-screen w-full bg-background">
      <main className="flex-1 overflow-hidden min-h-0">
        <Workspace initialEinheitId={einheitId} />
      </main>
    </div>
  );
}