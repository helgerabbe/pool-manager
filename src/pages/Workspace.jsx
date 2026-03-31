import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import SidebarTree from '@/components/workspace/SidebarTree';
import BreadcrumbHeader from '@/components/workspace/BreadcrumbHeader';
import WorkspaceDetailPanel from '@/components/workspace/WorkspaceDetailPanel';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PanelLeftClose, PanelLeft, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

/**
 * Workspace — Master-Detail-Planungsbereich
 *
 * URL-Schema: /workspace?einheit=<id>
 * State:
 *  selectedEinheitId  — aktive Einheit (aus URL-Param oder Dropdown)
 *  selectedNode       — { type, id, data?, paketId?, lernzielId? }
 *  sidebarOpen        — Sidebar sichtbar?
 */
export default function Workspace() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialEinheitId = urlParams.get('einheit') || null;

  const { permissions, authUser, rolle, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedEinheitId, setSelectedEinheitId] = useState(initialEinheitId);
  const [selectedNode, setSelectedNode]           = useState(null);
  const [sidebarOpen, setSidebarOpen]             = useState(true);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: einheiten = [], isLoading: einheitenLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list('-created_date'),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!selectedEinheitId,
  });

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: !!selectedEinheitId,
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    enabled: !!selectedEinheitId,
  });

  // ── Aktive Einheit ─────────────────────────────────────────────────────────
  const einheit = einheiten.find(e => e.id === selectedEinheitId) || null;

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === selectedEinheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  const paketIds = paketeFuerEinheit.map(p => p.id);
  const zieleFuerEinheit   = lernziele.filter(lz => paketIds.includes(lz.lernpaket_id));
  const aufgabenFuerEinheit = aufgaben.filter(a  => paketIds.includes(a.lernpaket_id));

  // ── RBAC ───────────────────────────────────────────────────────────────────
  const kannDieseEinheitBearbeiten = einheit
    ? permissions.kannEinheitBearbeiten(einheit.fach)
    : false;
  const istAdmin = rolle === ROLLEN.ADMIN;

  // ── Navigations-Callbacks ─────────────────────────────────────────────────
  const handleSelect = useCallback((node) => {
    setSelectedNode(node);
  }, []);

  const handleEinheitChange = (id) => {
    setSelectedEinheitId(id);
    setSelectedNode({ type: 'einheit', id });
    // URL-Param aktualisieren (kein Router-Push nötig)
    const url = new URL(window.location.href);
    url.searchParams.set('einheit', id);
    window.history.replaceState({}, '', url);
  };

  // ── Delete-Mutations ───────────────────────────────────────────────────────
  const deleteLernpaket = useMutation({
    mutationFn: async (id) => {
      const relZiele   = zieleFuerEinheit.filter(lz => lz.lernpaket_id === id);
      const relAufgaben = aufgabenFuerEinheit.filter(a => a.lernpaket_id === id);
      for (const z of relZiele)   await base44.entities.Lernziele.delete(z.id);
      for (const a of relAufgaben) await base44.entities.Aufgabenbausteine.delete(a.id);
      return base44.entities.Lernpakete.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setSelectedNode({ type: 'einheit', id: selectedEinheitId });
    },
  });

  const deleteLernziel = useMutation({
    mutationFn: (id) => base44.entities.Lernziele.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      // Zurück zum übergeordneten Paket navigieren
      const lz = zieleFuerEinheit.find(lz => lz.id === id);
      if (lz) setSelectedNode({ type: 'lernpaket', id: lz.lernpaket_id });
    },
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (rbacLoading || einheitenLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // ── Keine Einheiten vorhanden ──────────────────────────────────────────────
  if (einheiten.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <BookOpen className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <p className="font-semibold">Keine Einheiten vorhanden</p>
          <p className="text-sm text-muted-foreground mt-1">
            Legen Sie zuerst eine Einheit an, um den Workspace zu nutzen.
          </p>
        </div>
        <Link to="/einheiten">
          <Button>Zu den Einheiten</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -my-8">

      {/* ── Top-Bar: Einheitenauswahl ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(o => !o)}
          title="Sidebar umschalten"
        >
          {sidebarOpen
            ? <PanelLeftClose className="w-4 h-4" />
            : <PanelLeft      className="w-4 h-4" />
          }
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm text-muted-foreground shrink-0">Einheit:</span>
          <Select value={selectedEinheitId || ''} onValueChange={handleEinheitChange}>
            <SelectTrigger className="w-64 h-8 text-sm">
              <SelectValue placeholder="Einheit auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {einheiten.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.fach} – {e.titel_der_einheit} (Jg. {e.jahrgangsstufe})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Link to="/einheiten" className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0">
          ← Übersicht
        </Link>
      </div>

      {/* ── Split-Screen ──────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar (Master) ──────────────────────────────────────────────── */}
        <aside className={cn(
          'border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden transition-all duration-200',
          sidebarOpen ? 'w-72' : 'w-0'
        )}>
          {sidebarOpen && einheit && (
            <div className="flex-1 overflow-y-auto p-3">
              <SidebarTree
                einheit={einheit}
                lernpakete={paketeFuerEinheit}
                lernziele={zieleFuerEinheit}
                aufgaben={aufgabenFuerEinheit}
                selectedNode={selectedNode}
                onSelect={handleSelect}
                kannBearbeiten={kannDieseEinheitBearbeiten}
              />
            </div>
          )}
          {sidebarOpen && !einheit && (
            <div className="flex items-center justify-center h-full text-center p-6">
              <p className="text-sm text-muted-foreground">Wählen Sie oben eine Einheit aus.</p>
            </div>
          )}
        </aside>

        {/* ── Detail-Bereich (Master) ───────────────────────────────────────── */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Breadcrumb (fixiert am oberen Rand der Arbeitsfläche) */}
          {einheit && (
            <BreadcrumbHeader
              einheit={einheit}
              lernpakete={paketeFuerEinheit}
              lernziele={zieleFuerEinheit}
              selectedNode={selectedNode}
              onNavigate={handleSelect}
            />
          )}

          {/* Scrollbarer Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-6">
              {!einheit ? (
                /* Wizard-Schritt 0: Keine Einheit ausgewählt */
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground/30" />
                  <div>
                    <p className="font-semibold">Einheit auswählen</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Wählen Sie oben eine Einheit aus, um mit der Planung zu beginnen.
                    </p>
                  </div>
                </div>
              ) : (
                /* Conditional Rendering: Formular-Panel je nach Node-Typ */
                <WorkspaceDetailPanel
                  selectedNode={selectedNode}
                  einheit={einheit}
                  lernpakete={paketeFuerEinheit}
                  lernziele={zieleFuerEinheit}
                  aufgaben={aufgabenFuerEinheit}
                  userEmail={authUser?.email}
                  kannBearbeiten={kannDieseEinheitBearbeiten}
                  istAdmin={istAdmin}
                  onNavigate={handleSelect}
                  onNewLernpaket={() => handleSelect({ type: 'new-lernpaket' })}
                  onNewLernziel={(paketId) => handleSelect({ type: 'new-lernziel', paketId })}
                  onNewAufgabe={(paketId, lernzielId) => handleSelect({ type: 'new-aufgabe', paketId, lernzielId })}
                  onEditEinheit={() => {}}
                  onDeleteLernpaket={(id) => deleteLernpaket.mutate(id)}
                  onDeleteLernziel={(id) => deleteLernziel.mutate(id)}
                />
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}