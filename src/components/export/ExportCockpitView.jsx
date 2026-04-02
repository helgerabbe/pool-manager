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

export default function ExportCockpitView({ initialEinheitId = null, userRole = 'user' }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedEinheitId, setSelectedEinheitId] = useState(initialEinheitId);

  // ──────────────────────────────────────────────────────────────────────────────
  // Export-Lock Hook
  // ──────────────────────────────────────────────────────────────────────────────

  const { isLocked, pendingCount, pendingElements } = useExportLock(selectedEinheitId);

  // ──────────────────────────────────────────────────────────────────────────────
  // Daten laden
  // ──────────────────────────────────────────────────────────────────────────────

  const { data: einheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => base44.entities.Einheiten.list(),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', selectedEinheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: selectedEinheitId }),
    enabled: !!selectedEinheitId,
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', selectedEinheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: selectedEinheitId }),
    enabled: !!selectedEinheitId,
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

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (selectedIds.length === 0) {
        throw new Error('Keine Elemente ausgewählt');
      }

      // Bestimme Typ für jede selektierte ID
      const updates = selectedIds.map((id) => {
        if (visibleActivities.find(a => a.id === id)) {
          return { id, type: 'activity' };
        } else if (visibleMasters.find(m => m.id === id)) {
          return { id, type: 'master' };
        } else {
          return { id, type: 'klon' };
        }
      });

      // Batch-Update: Setze sync_status='pending' für alle selektierten Items
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
      // Query invalidieren → UI aktualisiert automatisch
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

  // ──────────────────────────────────────────────────────────────────────────────
  // Kaskadierende Checkbox-Logik
  // ──────────────────────────────────────────────────────────────────────────────

  const paketIds = lernpakete.filter(lp => lp.einheit_id === selectedEinheitId).map(lp => lp.id);
  const paketActivities = enrichedActivities.filter(a => paketIds.includes(a.lernpaket_id));
  
  const toggleEinheitCheckbox = useCallback(() => {
    const approved = paketActivities.filter(a => a.effective_content_status === 'approved');
    const approvedIds = approved.map(a => a.id);
    const allSelected = approvedIds.length > 0 && approvedIds.every(id => selectedIds.includes(id));
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !approvedIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...approvedIds])]);
    }
  }, [paketActivities, selectedIds]);

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
  }, [lernpakete, enrichedActivities, selectedEinheitId, selectedIds]);

  const toggleLernpaketCheckbox = useCallback((paketId) => {
    const actForPaket = enrichedActivities.filter(a => a.lernpaket_id === paketId && a.effective_content_status === 'approved');
    const actIds = actForPaket.map(a => a.id);
    
    const allSelected = actIds.length > 0 && actIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !actIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...actIds])]);
    }
  }, [enrichedActivities, selectedIds]);

  const toggleActivityCheckbox = (actId) => {
    setSelectedIds(prev =>
      prev.includes(actId) ? prev.filter(x => x !== actId) : [...prev, actId]
    );
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Status Berechnungen
  // ──────────────────────────────────────────────────────────────────────────────

  const getStatusEmoji = (status) => {
    if (status === 'approved') return '🟢';
    if (status === 'draft') return '🔴';
    return '⚪';
  };

  const canSelectForExport = paketActivities.some(a => a.effective_content_status === 'approved');
  const hasSelectedItems = selectedIds.length > 0;
  const currentEinheit = einheiten.find(e => e.id === selectedEinheitId);

  // ──────────────────────────────────────────────────────────────────────────────
  // Render: Lock-View wenn Export lädt
  // ──────────────────────────────────────────────────────────────────────────────

  if (isLocked) {
    return (
      <div className="space-y-3 p-3">
        <ExportLockBanner pendingCount={pendingCount} />
        <ExportWaitingView pendingElements={pendingElements} />
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Render: Cockpit mit hochverdichteter Struktur
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-2 p-3 min-h-screen flex flex-col">
      {/* Header */}
      <div className="space-y-1 mb-1">
        <h2 className="text-xl font-bold">Freigabe-Cockpit</h2>
        <p className="text-xs text-muted-foreground">
          Wähle Einheit aus und markiere exportierbare Aufgaben (🟢).
        </p>
      </div>

      {/* Einheit-Select */}
      <div className="flex gap-2 mb-2">
        <Select value={selectedEinheitId || ''} onValueChange={setSelectedEinheitId}>
          <SelectTrigger className="h-8 text-xs flex-1">
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
      </div>

      {!selectedEinheitId ? (
        <div className="text-center py-8 text-muted-foreground text-xs">
          Bitte wähle eine Einheit aus, um zu beginnen.
        </div>
      ) : (
        <>
          {/* Einheit als Root-Ebene */}
          {currentEinheit && (
            <div className="border border-border rounded-md p-2 bg-card mb-2">
              <div className="flex items-center gap-1">
                <Checkbox
                  checked={
                    paketActivities.filter(a => a.effective_content_status === 'approved').length > 0 &&
                    paketActivities
                      .filter(a => a.effective_content_status === 'approved')
                      .every(a => selectedIds.includes(a.id))
                  }
                  onChange={toggleEinheitCheckbox}
                  className="h-4 w-4"
                />
                <span className="text-xs font-semibold flex-1">{currentEinheit.titel_der_einheit}</span>
                <span className="text-[10px] text-muted-foreground">{getStatusEmoji(currentEinheit.content_status)}</span>
              </div>
            </div>
          )}

          {/* Themenfelder & Lernpakete (hochverdichtet) */}
          <div className="flex-1 overflow-y-auto border border-border rounded-md p-1 bg-card/50 space-y-0">
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
                  <div key={tf.id} className="border-b border-border/50 last:border-b-0">
                    {/* Themenfeld Header */}
                    <div className="flex items-center gap-1 px-1 py-0.5 hover:bg-muted/30">
                      <Checkbox
                        checked={allTfSelected}
                        onChange={() => toggleThemenfeldCheckbox(tf.id)}
                        disabled={tfActivities.length === 0}
                        className="h-3 w-3"
                      />
                      <span className="text-[11px] font-semibold flex-1 truncate">{tf.titel}</span>
                      {tfActivities.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">
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
                        <div key={paket.id} className="border-l-2 border-border/30 ml-3">
                          {/* Lernpaket Header */}
                          <div className="flex items-center gap-1 px-1 py-0.5 hover:bg-muted/20">
                            <Checkbox
                              checked={allPaketSelected}
                              onChange={() => toggleLernpaketCheckbox(paket.id)}
                              disabled={paketActivities.length === 0}
                              className="h-3 w-3"
                            />
                            <span className="text-[10px] font-medium flex-1 truncate">
                              {paket.titel_des_pakets}
                            </span>
                            {paketActivities.length > 0 && (
                              <span className="text-[9px] text-muted-foreground">
                                {paketSelectedCount}/{paketActivities.length}
                              </span>
                            )}
                          </div>

                          {/* Aktivitäten in Lernpaket */}
                          {paketActivities.map(act => {
                            const actName = aktivitaetenKatalog.find(k => k.id === act.aktivitaet_id)?.name || 'Aktivität';
                            const isSelected = selectedIds.includes(act.id);

                            return (
                              <div
                                key={act.id}
                                className={cn(
                                  'flex items-center gap-1 px-1 py-0.5 ml-3 border-l border-border/20 hover:bg-muted/10',
                                  isSelected && 'bg-primary/5'
                                )}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => toggleActivityCheckbox(act.id)}
                                  className="h-3 w-3"
                                />
                                <span className="text-[9px] flex-1 truncate text-muted-foreground">
                                  {actName}
                                </span>
                                <span className="text-[8px] text-muted-foreground/60">
                                  {getStatusEmoji(act.effective_content_status)}
                                </span>
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

          {/* Sticky Footer: Export */}
          {canSelectForExport && (
            <div className="sticky bottom-0 bg-background border-t border-border p-2 rounded-t-lg space-y-1 shadow-lg mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">
                  {hasSelectedItems ? `✓ ${selectedIds.length} markiert` : '→ Auswahl treffen'}
                </span>
                <span className="text-muted-foreground">
                  {paketActivities.filter(a => a.effective_content_status === 'approved').length} exportierbar
                </span>
              </div>

              <Button
                onClick={() => exportMutation.mutate()}
                disabled={!hasSelectedItems || exportMutation.isPending}
                className="w-full h-8 gap-1 text-xs"
                size="sm"
              >
                {exportMutation.isPending ? (
                  <>
                    <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                    Lädt…
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Zur Übergabe an das Export-Zentrum freigeben
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