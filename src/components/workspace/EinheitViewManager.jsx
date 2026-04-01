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
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { usePresence } from '@/hooks/usePresence';
import { isStructurallyLocked } from '@/hooks/useStructuralLock';
import UnitToolbar from '@/components/layout/UnitToolbar';
import EinheitStrukturBoard from '@/pages/EinheitStrukturBoard';
import Workspace from '@/pages/Workspace';
import EinheitSettingsModal from '@/components/einheiten/EinheitSettingsModal';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function EinheitViewManager() {
  const { id: einheitId } = useParams();
  const navigate = useNavigate();
  const { authUser, permissions } = useRBAC();

  // ── View-Mode Toggle ──────────────────────────────────────────────────────
  const lsKey = `einheit_view_${einheitId}`;
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem(lsKey) || 'struktur';
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem(lsKey, mode);
  };

  // ── Settings Modal ────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Query: Einheit laden ──────────────────────────────────────────────────
  const { data: einheit, isLoading: einheitLoading } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: () => base44.entities.Einheiten.filter({ id: einheitId }),
    enabled: !!einheitId,
    select: (data) => data[0],
  });

  // ── Präsenz ───────────────────────────────────────────────────────────────
  const { onlineUsers } = usePresence(einheitId);

  // ── Structural Lock Check ─────────────────────────────────────────────────
  const structLocked = einheit ? isStructurallyLocked(einheit, authUser?.email) : false;

  // ── Laden ─────────────────────────────────────────────────────────────────
  if (einheitLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!einheit) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <p className="font-semibold">Einheit nicht gefunden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Die angeforderte Einheit existiert nicht oder wurde gelöscht.
          </p>
        </div>
        <Link to="/einheiten">
          <Button>Zu den Einheiten</Button>
        </Link>
      </div>
    );
  }

  const kannDieseEinheitBearbeiten = permissions.kannEinheitBearbeiten(einheit.fach);

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER — Strikte vertikale Stacking-Hierarchie
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex flex-col h-screen w-full bg-background">

      {/* Container 1: UnitToolbar (Sub-Header) ────────────────────────────────── */}
      <UnitToolbar
        einheit={einheit}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onSettingsOpen={() => setSettingsOpen(true)}
      />

      {/* Container 2: Hinweis-Banner (Struktur-Lock / Optional) ──────────────── */}
      {structLocked && (
        <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-3 bg-orange-100 border-b-2 border-orange-300">
          <p className="text-sm font-medium text-orange-900">
            <strong>⚠️ Struktur wird gerade bearbeitet</strong> — von {einheit?.structural_lock}. 
            Bestehende Inhalte können gespeichert werden.
          </p>
        </div>
      )}

      {/* Container 3: Main Content (Kanban-Board oder Workspace) ──────────────── */}
      <main className="flex-1 overflow-hidden min-h-0">
        {viewMode === 'struktur' ? (
          // ── Struktur-Ansicht: Kanban-Board mit Themenfeldern + Lernpaketen ──
          <EinheitStrukturBoard
            einheitId={einheitId}
            kannBearbeiten={kannDieseEinheitBearbeiten}
            onSaved={() => handleViewModeChange('inhalte')}
          />
        ) : (
          // ── Inhalts-Ansicht: Workspace mit Detail-Bearbeitung ────────────────
          <Workspace
            // Der Workspace wird mit dem einheitId über URL-Parametern initialisiert
            // Die Komponente liest den Parameter selbst: ?einheit=<id>
          />
        )}
      </main>

      {/* Settings Modal ────────────────────────────────────────────────────────── */}
      {einheit && (
        <EinheitSettingsModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          einheit={einheit}
          currentUserEmail={authUser?.email}
        />
      )}
    </div>
  );
}