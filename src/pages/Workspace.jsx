import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import SidebarTree from '@/components/workspace/SidebarTree';
import WorkspaceDetailPanel from '@/components/workspace/WorkspaceDetailPanel';
import WorkspaceStats from '@/components/workspace/WorkspaceStats';
import TransferSaeule from '@/components/workspace/TransferSaeule';
import PresenceBadge from '@/components/workspace/PresenceBadge';
import { usePresence } from '@/hooks/usePresence';
import { isStructurallyLocked } from '@/hooks/useStructuralLock';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Layers, Zap, FolderOpen, LayoutGrid, SlidersHorizontal, Lock, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import StrukturBoardEmbedded from '@/components/workspace/StrukturBoardEmbedded';

/**
 * Workspace — Drei-Säulen-Architektur
 *
 * Säule 1 (Tab "Basis"):      Hierarchischer Baum + Detail-Panel (Lernpakete → Atome)
 * Säule 2 (Tab "Transfer"):   Transfer-Aufgaben (anforderungsebene: "2 - Transfer") + Mapping
 * Säule 3 (Tab "Projekte"):   Anwendungsprojekte (anforderungsebene: "3 - Projekt") + Mapping
 *
 * Cross-Highlighting: Beim Klick auf eine Transfer/Projekt-Aufgabe werden die
 * gemappten Lernziel-Atome in Säule 1 visuell hervorgehoben.
 */
export default function Workspace() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialEinheitId = urlParams.get('einheit') || null;

  const { permissions, authUser, rolle, isLoading: rbacLoading } = useRBAC();
  const queryClient = useQueryClient();

  // ── State ────────────────────────────────────────────────────────────────────
  const [selectedEinheitId, setSelectedEinheitId] = useState(initialEinheitId);
  const [selectedThemenfeldId, setSelectedThemenfeldId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [activeTab, setActiveTab] = useState('basis');
  const [highlightedAtomIds, setHighlightedAtomIds] = useState(new Set());

  // View-Toggle: 'struktur' | 'detail'
  // Beim ersten Laden nach Wizard (fromWizard param) → Struktur, sonst letzter Modus aus localStorage
  const fromWizard = new URLSearchParams(window.location.search).get('fromWizard') === '1';
  const lsKey = `workspace_view_${selectedEinheitId}`;
  const [viewMode, setViewMode] = useState(() => {
    if (fromWizard) return 'struktur';
    return localStorage.getItem(lsKey) || 'detail';
  });

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (selectedEinheitId) localStorage.setItem(`workspace_view_${selectedEinheitId}`, mode);
  };

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: einheiten = [], isLoading: einheitenLoading } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list('-created_date')
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
    enabled: !!selectedEinheitId
  });

  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
    enabled: !!selectedEinheitId
  });

  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    enabled: !!selectedEinheitId
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['mappingBasisziele'],
    queryFn: () => base44.entities.MappingAufgabeBasisziel.list(),
    enabled: !!selectedEinheitId
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', selectedEinheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: selectedEinheitId }),
    enabled: !!selectedEinheitId
  });

  // ── Aktive Einheit ────────────────────────────────────────────────────────────
  const einheit = einheiten.find((e) => e.id === selectedEinheitId) || null;

  const paketeFuerEinheit = lernpakete.
  filter((lp) => lp.einheit_id === selectedEinheitId).
  sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  const paketIds = paketeFuerEinheit.map((p) => p.id);
  const zieleFuerEinheit = lernziele.filter((lz) => paketIds.includes(lz.lernpaket_id));
  const aufgabenFuerEinheit = aufgaben.filter((a) => paketIds.includes(a.lernpaket_id));

  // ── RBAC ──────────────────────────────────────────────────────────────────────
  const kannDieseEinheitBearbeiten = einheit ?
  permissions.kannEinheitBearbeiten(einheit.fach) :
  false;
  const istAdmin = rolle === ROLLEN.ADMIN;

  // ── Präsenz ──────────────────────────────────────────────────────────────────
  const { onlineUsers } = usePresence(selectedEinheitId);

  // ── Structural-Lock-Check + "Paket verschoben"-Notification ──────────────────
  const [movedNotification, setMovedNotification] = useState(null);

  useEffect(() => {
    if (!selectedEinheitId) return;
    const ch = new BroadcastChannel(`presence_${selectedEinheitId}`);
    ch.onmessage = (ev) => {
      if (ev.data?.type === 'paket_moved') {
        setMovedNotification(ev.data);
        setTimeout(() => setMovedNotification(null), 6000);
      }
    };
    return () => ch.close();
  }, [selectedEinheitId]);

  const structLocked = einheit ? isStructurallyLocked(einheit, authUser?.email) : false;

  // ── Callbacks ─────────────────────────────────────────────────────────────────
  // handleSelect is defined below with themenfeld-awareness

  const handleEinheitChange = (id) => {
    setSelectedEinheitId(id);
    setSelectedThemenfeldId(null);
    setSelectedNode({ type: 'einheit', id });
    setHighlightedAtomIds(new Set());
    const url = new URL(window.location.href);
    url.searchParams.set('einheit', id);
    window.history.replaceState({}, '', url);
  };

  // Cross-Highlighting von Säule 2/3 → Säule 1
  const handleAtomHighlight = useCallback((atomIds) => {
    setHighlightedAtomIds(new Set(atomIds));
  }, []);

  // Beim Navigieren zu einem Themenfeld: selectedThemenfeldId setzen
  const handleSelect = useCallback((node) => {
    if (node?.type === 'themenfeld') setSelectedThemenfeldId(node.themenfeldId);
    setSelectedNode(node);
  }, []);

  // Pakete/Ziele/Aufgaben gefiltert nach aktivem Themenfeld (für Säulen 1+2)
  const paketeFuerThemenfeld = selectedThemenfeldId
    ? paketeFuerEinheit.filter(p => p.themenfeld_id === selectedThemenfeldId)
    : paketeFuerEinheit;
  const paketIdsFuerThemenfeld = paketeFuerThemenfeld.map(p => p.id);
  const zieleFuerThemenfeld  = lernziele.filter(lz => paketIdsFuerThemenfeld.includes(lz.lernpaket_id));
  const aufgabenFuerThemenfeld = aufgaben.filter(a => paketIdsFuerThemenfeld.includes(a.lernpaket_id) && a.anforderungsebene !== '3 - Projekt');

  // Säule 3: globale Projektaufgaben der gesamten Einheit (unabhängig vom Themenfeld)
  const projektaufgabenFuerEinheit = aufgabenFuerEinheit.filter(a => a.anforderungsebene === '3 - Projekt');

  // ── Delete-Mutations ──────────────────────────────────────────────────────────
  const deleteLernpaket = useMutation({
    mutationFn: async (id) => {
      const relZiele = zieleFuerEinheit.filter((lz) => lz.lernpaket_id === id);
      const relAufgaben = aufgabenFuerEinheit.filter((a) => a.lernpaket_id === id);
      for (const z of relZiele) await base44.entities.Lernziele.delete(z.id);
      for (const a of relAufgaben) await base44.entities.Aufgabenbausteine.delete(a.id);
      return base44.entities.Lernpakete.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      setSelectedNode({ type: 'einheit', id: selectedEinheitId });
    }
  });

  const deleteLernziel = useMutation({
    mutationFn: (id) => base44.entities.Lernziele.delete(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      const lz = zieleFuerEinheit.find((lz) => lz.id === id);
      if (lz) setSelectedNode({ type: 'lernpaket', id: lz.lernpaket_id });
    }
  });

  // ── Loading ───────────────────────────────────────────────────────────────────
  if (rbacLoading || einheitenLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>);

  }

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
        <Link to="/einheiten"><Button>Zu den Einheiten</Button></Link>
      </div>);

  }

  const transferCount = aufgabenFuerEinheit.filter((a) => a.anforderungsebene === '2 - Transfer').length;
  const projektCount = aufgabenFuerEinheit.filter((a) => a.anforderungsebene === '3 - Projekt').length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-4 sm:-mx-6 lg:-mx-8 -my-8">

      {/* ── Structural-Lock-Banner ───────────────────────────────────────────── */}
      {structLocked && (
        <div className="shrink-0 px-4 py-2 bg-orange-50 border-b border-orange-200 text-xs text-orange-800 flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 shrink-0 text-orange-600" />
          <span>
            <strong>Struktur wird angepasst</strong> von {einheit?.structural_lock}. Bestehende Inhalte können gespeichert werden, neue Bearbeitungssitzungen sind kurzzeitig gesperrt.
          </span>
        </div>
      )}

      {/* ── "Paket verschoben"-Toast-Banner ─────────────────────────────────── */}
      {movedNotification && (
        <div className="shrink-0 px-4 py-2 bg-blue-50 border-b border-blue-200 text-xs text-blue-800 flex items-center gap-2 animate-in slide-in-from-top-1">
          <ArrowRight className="w-3.5 h-3.5 shrink-0 text-blue-600" />
          <span>
            <strong>Achtung:</strong> Das Paket „{movedNotification.paketTitel}" wurde in das Themenfeld <strong>{movedNotification.neuesThemenfeld}</strong> verschoben.
          </span>
          <button onClick={() => setMovedNotification(null)} className="ml-auto text-blue-500 hover:text-blue-700">✕</button>
        </div>
      )}

      {/* ── Top-Bar ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card shrink-0 flex-wrap gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm text-muted-foreground shrink-0">Einheit:</span>
          <Select value={selectedEinheitId || ''} onValueChange={handleEinheitChange}>
            <SelectTrigger className="w-56 h-8 text-sm">
              <SelectValue placeholder="Einheit auswählen…" />
            </SelectTrigger>
            <SelectContent>
              {einheiten.map((e) =>
              <SelectItem key={e.id} value={e.id}>
                  {e.fach} – {e.titel_der_einheit} (Jg. {e.jahrgangsstufe})
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        {/* View-Toggle */}
        {einheit && (
          <div className="flex items-center bg-muted rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => handleViewModeChange('struktur')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                viewMode === 'struktur'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Struktur
            </button>
            <button
              onClick={() => handleViewModeChange('detail')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                viewMode === 'detail'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Detail
            </button>
          </div>
        )}

        {/* Statistik-Leiste (nur Detail-Modus) */}
        {einheit && viewMode === 'detail' &&
        <WorkspaceStats
          lernpakete={paketeFuerEinheit}
          lernziele={zieleFuerEinheit}
          aufgaben={aufgabenFuerEinheit}
          mappings={mappings}
          userEmail={authUser?.email || ''} />
        }

        <div className="ml-auto flex items-center gap-3 shrink-0">
          <PresenceBadge onlineUsers={onlineUsers} />
          <Link to="/einheiten" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            ← Übersicht
          </Link>
        </div>
      </div>

      {/* ── Haupt-Inhalt ─────────────────────────────────────────────────────── */}
      {!einheit ?
      <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
          <BookOpen className="w-12 h-12 text-muted-foreground/30" />
          <div>
            <p className="font-semibold">Einheit auswählen</p>
            <p className="text-sm text-muted-foreground mt-1">
              Wählen Sie oben eine Einheit aus, um mit der Planung zu beginnen.
            </p>
          </div>
        </div>
      : viewMode === 'struktur' ? (
        <StrukturBoardEmbedded
          einheitId={selectedEinheitId}
          lernpakete={paketeFuerEinheit}
          themenfelder={themenfelder}
          queryClient={queryClient}
          onSaved={() => handleViewModeChange('detail')}
        />
      ) :

      <Tabs
        value={activeTab}
        onValueChange={(tab) => {setActiveTab(tab);setHighlightedAtomIds(new Set());}}
        className="flex flex-col flex-1 overflow-hidden">
        
          {/* Tab-Leiste */}
          <div className="px-4 pt-2 border-b border-border bg-card shrink-0">
            <TabsList className="bg-muted text-muted-foreground my-3 pt-1 pr-4 pb-1 pl-4 rounded-lg inline-flex items-center justify-center h-9">
              <TabsTrigger value="basis" className="bg-lime-200 px-3 py-1 text-xs font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Basis-Lernpakete
                {paketeFuerEinheit.length > 0 &&
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {paketeFuerEinheit.length}
                  </span>
              }
              </TabsTrigger>
              <TabsTrigger value="transfer" className="bg-sky-200 text-slate-600 mx-5 px-3 py-1 text-xs font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Transfer-Übungen
                {transferCount > 0 &&
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold">
                    {transferCount}
                  </span>
              }
              </TabsTrigger>
              <TabsTrigger value="projekt" className="bg-purple-200 text-slate-600 px-3 py-1 text-xs font-medium rounded-md inline-flex items-center justify-center whitespace-nowrap ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow gap-1.5">
                <FolderOpen className="w-3.5 h-3.5" />
                Projekte
                {projektCount > 0 &&
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold">
                    {projektCount}
                  </span>
              }
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ── Säule 1: Basis-Lernpakete (Master-Detail) ────────────────────── */}
          <TabsContent value="basis" className="flex flex-1 overflow-hidden m-0 p-0">
            {/* Sidebar */}
            <aside className="w-72 border-r border-border bg-card/50 flex flex-col shrink-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-3">
                <SidebarTree
                einheit={einheit}
                lernpakete={paketeFuerEinheit}
                lernziele={zieleFuerEinheit}
                aufgaben={aufgabenFuerEinheit}
                mappings={mappings}
                themenfelder={themenfelder}
                selectedNode={selectedNode}
                onSelect={handleSelect}
                kannBearbeiten={kannDieseEinheitBearbeiten}
                userEmail={authUser?.email || ''}
                highlightedAtomIds={highlightedAtomIds} />
              
              </div>
            </aside>

            {/* Detail-Panel */}
            <main className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 py-6">
                <WorkspaceDetailPanel
                selectedNode={selectedNode}
                einheit={einheit}
                lernpakete={paketeFuerEinheit}
                lernziele={zieleFuerEinheit}
                aufgaben={aufgabenFuerEinheit}
                themenfelder={themenfelder}
                userEmail={authUser?.email}
                kannBearbeiten={kannDieseEinheitBearbeiten}
                istAdmin={istAdmin}
                onNavigate={handleSelect}
                onNewLernpaket={() => handleSelect({ type: 'new-lernpaket' })}
                onNewLernziel={(paketId) => handleSelect({ type: 'new-lernziel', paketId })}
                onNewAufgabe={(paketId, lernzielId) => handleSelect({ type: 'new-aufgabe', paketId, lernzielId })}
                onEditEinheit={() => {}}
                onDeleteLernpaket={(id) => deleteLernpaket.mutate(id)}
                onDeleteLernziel={(id) => deleteLernziel.mutate(id)} />
              
              </div>
            </main>
          </TabsContent>

          {/* ── Säule 2: Transfer-Übungen (Themenfeld-gefiltert) ──────────────── */}
          <TabsContent value="transfer" className="flex-1 overflow-hidden m-0 p-0">
            <TransferSaeule
            ebene="2 - Transfer"
            lernpakete={paketeFuerThemenfeld}
            lernziele={zieleFuerThemenfeld}
            aufgaben={aufgabenFuerThemenfeld}
            mappings={mappings}
            einheitId={einheit.id}
            kannBearbeiten={kannDieseEinheitBearbeiten}
            onAtomHighlight={handleAtomHighlight}
            highlightedAufgabeId={null} />
          
          </TabsContent>

          {/* ── Säule 3: Projekte (globaler Einheits-Scope) ───────────────────── */}
          <TabsContent value="projekt" className="flex-1 overflow-hidden m-0 p-0">
            <TransferSaeule
            ebene="3 - Projekt"
            lernpakete={paketeFuerEinheit}
            lernziele={zieleFuerEinheit}
            aufgaben={projektaufgabenFuerEinheit}
            mappings={mappings}
            einheitId={einheit.id}
            kannBearbeiten={kannDieseEinheitBearbeiten}
            onAtomHighlight={handleAtomHighlight}
            highlightedAufgabeId={null} />
          
          </TabsContent>
        </Tabs>
      }
    </div>);

}