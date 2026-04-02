/**
 * ExportCockpitView.jsx
 * 
 * Ebene 5 – Freigabe-Cockpit für Moodle-Export
 * 
 * Implementiert das 2-Signal-System mit:
 * - Pädagogischer Status (content_status: draft | approved)
 * - Technischer Moodle-Status (sync_status: new | pending | synced | modified | to_delete)
 * - Rekursive Status-Vererbung (Worst-Case-Prinzip)
 * - Smart Expand/Collapse (grüne Container eingeklappt, rote ausgeklappt)
 * - Selektive Checkboxen (nur für 'approved' Items)
 * - Deep Links zu Task-Editor (Ebene 4)
 * - Export-Integration (setze sync_status='pending' für selektierte Items)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { enrichDataWithEffectiveStatus } from './StatusCalculations';
import { useExportLock } from '@/hooks/useExportLock';
import { ExportLockBanner } from './ExportLockBanner';
import { ExportWaitingView } from './ExportWaitingView';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────────────────────────
// Hilfskomponente: Single Cockpit Slot
// ────────────────────────────────────────────────────────────────────────────────

function CockpitSlot({
  slotId,
  selectedEinheitId,
  setSelectedEinheitId,
  selectedIds,
  setSelectedIds,
  einheiten,
  lernpakete,
  themenfelder,
  enrichedActivities,
  aktivitaetenKatalog,
  exportMutation,
  isLocked,
  pendingCount,
  pendingElements,
}) {
  const getStatusEmoji = (status) => {
    if (status === 'approved') return '🟢';
    if (status === 'draft') return '🔴';
    return '⚪';
  };

  const getSyncStatusBadge = (syncStatus) => {
    if (syncStatus === 'new') return { emoji: '🆕', label: 'neu', color: 'bg-blue-100 text-blue-800' };
    if (syncStatus === 'synced') return { emoji: '✅', label: 'synced', color: 'bg-green-100 text-green-800' };
    if (syncStatus === 'modified') return { emoji: '⚠️', label: 'verändert', color: 'bg-yellow-100 text-yellow-800' };
    if (syncStatus === 'pending') return { emoji: '🔒', label: 'pending', color: 'bg-blue-100 text-blue-700' };
    return null;
  };

  const paketIds = lernpakete.filter(lp => lp.einheit_id === selectedEinheitId).map(lp => lp.id);
  const paketActivities = enrichedActivities.filter(a => paketIds.includes(a.lernpaket_id));
  const currentEinheit = einheiten.find(e => e.id === selectedEinheitId);

  const toggleEinheitCheckbox = useCallback(() => {
    const approved = paketActivities.filter(a => a.effective_content_status === 'approved');
    const approvedIds = approved.map(a => a.id);
    const allSelected = approvedIds.length > 0 && approvedIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !approvedIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...approvedIds])]);
    }
  }, [paketActivities, selectedIds, setSelectedIds]);

  const toggleThemenfeldCheckbox = useCallback((themenfeldId) => {
    const lpForTf = lernpakete.filter(lp => lp.themenfeld_id === themenfeldId && lp.einheit_id === selectedEinheitId);
    const lpIds = lpForTf.map(lp => lp.id);
    const actForTf = enrichedActivities.filter(a => lpIds.includes(a.lernpaket_id) && a.effective_content_status === 'approved');
    const actIds = actForTf.map(a => a.id);
    
    const allSelected = actIds.length > 0 && actIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !actIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...actIds])]);
    }
  }, [lernpakete, enrichedActivities, selectedEinheitId, selectedIds, setSelectedIds]);

  const toggleLernpaketCheckbox = useCallback((paketId) => {
    const actForPaket = enrichedActivities.filter(a => a.lernpaket_id === paketId && a.effective_content_status === 'approved');
    const actIds = actForPaket.map(a => a.id);
    
    const allSelected = actIds.length > 0 && actIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !actIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...actIds])]);
    }
  }, [enrichedActivities, selectedIds, setSelectedIds]);

  const toggleActivityCheckbox = (actId) => {
    setSelectedIds(prev =>
      prev.includes(actId) ? prev.filter(x => x !== actId) : [...prev, actId]
    );
  };

  const canSelectForExport = paketActivities.some(a => a.effective_content_status === 'approved');
  const hasSelectedItems = selectedIds.length > 0;

  if (isLocked) {
    return (
      <div className="space-y-2 p-2 border border-border rounded-lg bg-muted/20">
        <ExportLockBanner pendingCount={pendingCount} />
        <ExportWaitingView pendingElements={pendingElements} />
      </div>
    );
  }

  return (
    <div className="space-y-2 p-3 border border-border rounded-lg bg-card/50 h-full flex flex-col">
      {/* Slot Header */}
      <div className="text-xs font-semibold text-muted-foreground">Slot {slotId}</div>

      {/* Einheit-Select */}
      <Select value={selectedEinheitId || ''} onValueChange={setSelectedEinheitId}>
        <SelectTrigger className="h-7 text-xs flex-1">
          <SelectValue placeholder="Einheit auswählen..." />
        </SelectTrigger>
        <SelectContent className="text-xs">
          {einheiten.map(e => (
            <SelectItem key={e.id} value={e.id} className="text-xs">
              {e.titel_der_einheit} ({e.fach})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedEinheitId ? (
        <div className="text-center py-4 text-muted-foreground text-[10px] italic">
          Einheit auswählen
        </div>
      ) : (
        <>
          {/* Einheit als Root */}
          {currentEinheit && (
            <div className="border border-border/50 rounded p-1.5 bg-background">
              <div className="flex items-center gap-1">
                <Checkbox
                  checked={
                    paketActivities.filter(a => a.effective_content_status === 'approved').length > 0 &&
                    paketActivities
                      .filter(a => a.effective_content_status === 'approved')
                      .every(a => selectedIds.includes(a.id))
                  }
                  onChange={toggleEinheitCheckbox}
                  className="h-3 w-3"
                />
                <span className="text-[10px] font-semibold flex-1 truncate">{currentEinheit.titel_der_einheit}</span>
                <span className="text-[10px]">{getStatusEmoji(currentEinheit.content_status)}</span>
              </div>
            </div>
          )}

          {/* Themenfelder & Lernpakete */}
          <div className="flex-1 overflow-y-auto space-y-0 border border-border/30 rounded p-1 bg-muted/10">
            {themenfelder
              .filter(tf => tf.einheit_id === selectedEinheitId)
              .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
              .map(tf => {
                const tfPakete = lernpakete.filter(lp => lp.themenfeld_id === tf.id);
                const tfActivities = enrichedActivities.filter(a =>
                  tfPakete.some(lp => lp.id === a.lernpaket_id) && a.effective_content_status === 'approved'
                );
                const tfSelectedCount = tfActivities.filter(a => selectedIds.includes(a.id)).length;
                const allTfSelected = tfActivities.length > 0 && tfSelectedCount === tfActivities.length;

                return (
                  <div key={tf.id}>
                    {/* Themenfeld Header */}
                    <div className="flex items-center gap-1 px-1 py-0.5 hover:bg-muted/40 rounded">
                      <Checkbox
                        checked={allTfSelected}
                        onChange={() => toggleThemenfeldCheckbox(tf.id)}
                        disabled={tfActivities.length === 0}
                        className="h-3 w-3"
                      />
                      <span className="text-[10px] font-semibold flex-1 truncate">{tf.titel}</span>
                      {tfActivities.length > 0 && (
                        <span className="text-[9px] text-muted-foreground">
                          {tfSelectedCount}/{tfActivities.length}
                        </span>
                      )}
                    </div>

                    {/* Lernpakete in Themenfeld */}
                    {tfPakete.map(paket => {
                      const paketActivities = enrichedActivities.filter(
                        a => a.lernpaket_id === paket.id && a.effective_content_status === 'approved'
                      );
                      const paketSelectedCount = paketActivities.filter(a => selectedIds.includes(a.id)).length;
                      const allPaketSelected = paketActivities.length > 0 && paketSelectedCount === paketActivities.length;

                      return (
                        <div key={paket.id} className="ml-2 pl-1 border-l border-border/20">
                          {/* Lernpaket Header */}
                          <div className="flex items-center gap-1 px-1 py-0.5 hover:bg-muted/30 rounded">
                            <Checkbox
                              checked={allPaketSelected}
                              onChange={() => toggleLernpaketCheckbox(paket.id)}
                              disabled={paketActivities.length === 0}
                              className="h-3 w-3"
                            />
                            <span className="text-[9px] font-medium flex-1 truncate">
                              {paket.titel_des_pakets}
                            </span>
                            {paketActivities.length > 0 && (
                              <span className="text-[8px] text-muted-foreground">
                                {paketSelectedCount}/{paketActivities.length}
                              </span>
                            )}
                          </div>

                          {/* Aktivitäten in Lernpaket */}
                          {paketActivities.map(act => {
                            const actName = aktivitaetenKatalog.find(k => k.id === act.aktivitaet_id)?.name || 'Aktivität';
                            const isSelected = selectedIds.includes(act.id);
                            const syncBadge = getSyncStatusBadge(act.sync_status);

                            return (
                              <div
                                key={act.id}
                                className={cn(
                                  'flex items-center gap-1 px-1 py-0.5 ml-2 rounded hover:bg-muted/20',
                                  isSelected && 'bg-primary/5'
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => toggleActivityCheckbox(act.id)}
                                  className="h-3 w-3 shrink-0"
                                />
                                <span className="text-[9px] flex-1 truncate text-muted-foreground">
                                  {actName}
                                </span>
                                {syncBadge && (
                                  <span className={cn('text-[8px] px-1 py-0.5 rounded whitespace-nowrap shrink-0', syncBadge.color)}>
                                    {syncBadge.emoji} {syncBadge.label}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
          </div>

          {/* Slot Export Button */}
          {canSelectForExport && (
            <div className="space-y-1 p-1.5 border-t border-border/30 bg-muted/5 rounded">
              <div className="flex items-center justify-between text-[9px]">
                <span className="font-medium">
                  {hasSelectedItems ? `✓ ${selectedIds.length} markiert` : '→ Auswahl'}
                </span>
                <span className="text-muted-foreground">
                  {paketActivities.filter(a => a.effective_content_status === 'approved').length} verfügbar
                </span>
              </div>

              <Button
                onClick={() => exportMutation.mutate()}
                disabled={!hasSelectedItems || exportMutation.isPending}
                className="w-full h-7 gap-1 text-[9px]"
                size="sm"
              >
                {exportMutation.isPending ? (
                  <>
                    <div className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full animate-spin" />
                    Lädt…
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3" />
                    Freigeben
                  </>
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────────

export default function ExportCockpitView({ initialEinheitId = null, userRole = 'user' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [slot1SelectedIds, setSlot1SelectedIds] = useState([]);
  const [slot1EinheitId, setSlot1EinheitId] = useState(initialEinheitId);
  const [slot2SelectedIds, setSlot2SelectedIds] = useState([]);
  const [slot2EinheitId, setSlot2EinheitId] = useState(null);

  // ──────────────────────────────────────────────────────────────────────────────
  // Export-Lock Hooks (für beide Slots)
  // ──────────────────────────────────────────────────────────────────────────────

  const { isLocked: isLocked1, pendingCount: pendingCount1, pendingElements: pendingElements1 } = useExportLock(slot1EinheitId);
  const { isLocked: isLocked2, pendingCount: pendingCount2, pendingElements: pendingElements2 } = useExportLock(slot2EinheitId);

  // ──────────────────────────────────────────────────────────────────────────────
  // Daten laden
  // ──────────────────────────────────────────────────────────────────────────────

  const { data: einheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder'],
    queryFn: () => base44.entities.Themenfeld.list(),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const { data: klone = [] } = useQuery({
    queryKey: ['aufgabenbausteine', 'klone'],
    queryFn: () => base44.entities.Aufgabenbausteine.filter({ is_master: false }),
  });

  const { data: masters = [] } = useQuery({
    queryKey: ['masterAufgaben'],
    queryFn: () => base44.entities.MasterAufgabe.list(),
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Daten filtern & anreichern
  // ──────────────────────────────────────────────────────────────────────────────

  // Tombstones ausfiltern
  const visibleActivities = activities.filter(a => a.sync_status !== 'to_delete');
  const visibleKlone = klone.filter(k => k.sync_status !== 'to_delete');
  const visibleMasters = masters.filter(m => m.sync_status !== 'to_delete');

  // Status-Vererbung anwenden (Worst-Case-Prinzip)
  const enrichedActivities = useMemo(
    () => enrichDataWithEffectiveStatus(visibleActivities, visibleKlone, visibleMasters),
    [visibleActivities, visibleKlone, visibleMasters]
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // Export-Mutation
  // ──────────────────────────────────────────────────────────────────────────────

  // ─ Factory für Export-Mutation pro Slot
  const createExportMutation = (selectedIds, setSelectedIds) => {
    return useMutation({
      mutationFn: async () => {
        if (selectedIds.length === 0) {
          throw new Error('Keine Elemente ausgewählt');
        }

        const updates = selectedIds.map((id) => {
          if (visibleActivities.find(a => a.id === id)) {
            return { id, type: 'activity' };
          } else if (visibleMasters.find(m => m.id === id)) {
            return { id, type: 'master' };
          } else {
            return { id, type: 'klon' };
          }
        });

        for (const { id, type } of updates) {
          if (type === 'activity') {
            await base44.entities.LernpaketPhaseAktivitaet.update(id, {
              sync_status: 'pending',
            });
          } else if (type === 'master') {
            await base44.entities.MasterAufgabe.update(id, {
              sync_status: 'pending',
            });
          } else if (type === 'klon') {
            await base44.entities.Aufgabenbausteine.update(id, {
              sync_status: 'pending',
            });
          }
        }

        return updates.length;
      },
      onSuccess: (count) => {
        queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
        queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
        queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
        
        setSelectedIds([]);
        toast.success(`🚀 ${count} Element${count !== 1 ? 'e' : ''} zum Export markiert.`);
      },
      onError: (err) => {
        toast.error('Fehler beim Export: ' + err.message);
      },
    });
  };

  const exportMutation1 = createExportMutation(slot1SelectedIds, setSlot1SelectedIds);
  const exportMutation2 = createExportMutation(slot2SelectedIds, setSlot2SelectedIds);



  // ──────────────────────────────────────────────────────────────────────────────
  // Render: Dual-Slot Side-by-Side Layout
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 min-h-screen bg-background">
      {/* Header */}
      <div className="space-y-1 mb-4 max-w-7xl mx-auto">
        <h2 className="text-2xl font-bold">Freigabe-Cockpit</h2>
        <p className="text-sm text-muted-foreground">
          Wähle bis zu zwei Einheiten aus, um diese nebeneinander zu vergleichen und separat zum Export freizugeben.
        </p>
      </div>

      {/* Dual-Slot Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto h-[calc(100vh-180px)]">
        {/* Slot 1 */}
        <CockpitSlot
          slotId="1"
          selectedEinheitId={slot1EinheitId}
          setSelectedEinheitId={setSlot1EinheitId}
          selectedIds={slot1SelectedIds}
          setSelectedIds={setSlot1SelectedIds}
          einheiten={einheiten}
          lernpakete={lernpakete}
          themenfelder={themenfelder}
          enrichedActivities={enrichedActivities}
          aktivitaetenKatalog={aktivitaetenKatalog}
          exportMutation={exportMutation1}
          isLocked={isLocked1}
          pendingCount={pendingCount1}
          pendingElements={pendingElements1}
        />

        {/* Slot 2 */}
        <CockpitSlot
          slotId="2"
          selectedEinheitId={slot2EinheitId}
          setSelectedEinheitId={setSlot2EinheitId}
          selectedIds={slot2SelectedIds}
          setSelectedIds={setSlot2SelectedIds}
          einheiten={einheiten}
          lernpakete={lernpakete}
          themenfelder={themenfelder}
          enrichedActivities={enrichedActivities}
          aktivitaetenKatalog={aktivitaetenKatalog}
          exportMutation={exportMutation2}
          isLocked={isLocked2}
          pendingCount={pendingCount2}
          pendingElements={pendingElements2}
        />
      </div>
    </div>
  );
}