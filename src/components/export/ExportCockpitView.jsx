/**
 * ExportCockpitView.jsx
 * 
 * Ebene 5 – Freigabe-Cockpit für Moodle-Export
 * 
 * Upgrades:
 * - Dynamisches Slot-Array-System mit Auto-Add beim Hinzufügen einer Einheit
 * - Exklusive Einheiten-Filter: Bereits verwendete Einheiten nicht in anderen Dropdowns
 * - Einklappbare Slots (Collapsible)
 * - Bugfix: Vollständige Hierarchie mit Aktivitäten/Aufgaben (tiefste Ebene)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lock, RotateCcw, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ────────────────────────────────────────────────────────────────────────────────
// 2-Badge System: Pädagogischer + Technischer Status
// ────────────────────────────────────────────────────────────────────────────────

function StatusBadges({ contentStatus, syncStatus }) {
  const contentBadges = {
    draft: { icon: '🔴', label: 'unfertig', color: 'bg-red-100 text-red-800 border-red-300' },
    approved: { icon: '🟢', label: 'freigegeben', color: 'bg-green-100 text-green-800 border-green-300' },
  };

  const syncBadges = {
    new: { icon: '🆕', label: 'neu', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    synced: { icon: '✅', label: 'synced', color: 'bg-green-100 text-green-800 border-green-300' },
    modified: { icon: '⚠️', label: 'verändert', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    pending: { icon: '🔒', label: 'gesperrt', color: 'bg-purple-100 text-purple-800 border-purple-300' },
    to_delete: { icon: '🗑️', label: 'wird entfernt', color: 'bg-red-100 text-red-800 border-red-300' },
  };

  const contentData = contentBadges[contentStatus];
  const syncData = syncBadges[syncStatus];

  return (
    <div className="flex gap-1.5 flex-wrap">
      {contentData && (
        <Badge className={cn('border text-xs font-semibold', contentData.color)}>
          {contentData.icon} {contentData.label}
        </Badge>
      )}
      {syncData && (
        <Badge className={cn('border text-xs font-semibold', syncData.color)}>
          {syncData.icon} {syncData.label}
        </Badge>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Undo-Button für Pending Items
// ────────────────────────────────────────────────────────────────────────────────

function UndoButton({ itemId, itemType, onSuccess }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleUndo = async () => {
    setIsLoading(true);
    try {
      const entityMap = {
        activity: 'LernpaketPhaseAktivitaet',
        master: 'MasterAufgabe',
        klon: 'Aufgabenbausteine',
      };

      const entity = base44.entities[entityMap[itemType]];
      await entity.update(itemId, { sync_status: 'modified' });

      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });

      toast.success('Export-Sperre entfernt');
      onSuccess?.();
    } catch (err) {
      toast.error('Fehler: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleUndo}
      disabled={isLoading}
      className="h-6 w-6 text-destructive hover:bg-destructive/10"
      title="Export-Sperre entfernen"
    >
      <RotateCcw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
    </Button>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Helper: Calculated Status
// ────────────────────────────────────────────────────────────────────────────────

function calculateDerivedContentStatus(children) {
  if (!children || children.length === 0) return 'draft';
  const allApproved = children.every((c) => c.effective_content_status === 'approved');
  return allApproved ? 'approved' : 'draft';
}

function calculateDerivedSyncStatus(children) {
  if (!children || children.length === 0) return 'new';
  const statuses = children.map((c) => c.sync_status);

  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('to_delete')) return 'to_delete';
  if (statuses.includes('modified')) return 'modified';
  if (statuses.some((s) => s === 'synced') && statuses.some((s) => s !== 'synced')) {
    return 'modified';
  }
  if (statuses.every((s) => s === 'synced')) return 'synced';
  return 'new';
}

// ────────────────────────────────────────────────────────────────────────────────
// Single Cockpit Slot (Collapsible)
// ────────────────────────────────────────────────────────────────────────────────

function CockpitSlot({
  slotId,
  slot,
  updateSlot,
  removeSlot,
  selectedEinheitIds,
  selectedIds,
  setSelectedIds,
  einheiten,
  lernpakete,
  themenfelder,
  enrichedActivities,
  aktivitaetenKatalog,
  exportMutation,
}) {
  const { unitId, isCollapsed, selectedApproved } = slot;

  // ──────────────────────────────────────────────────────────────────────────────
  // Filter: Nur Einheiten anzeigen, die nicht in anderen Slots genutzt werden
  // ──────────────────────────────────────────────────────────────────────────────

  const availableEinheiten = einheiten.filter(
    (e) => !selectedEinheitIds.includes(e.id) || e.id === unitId
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────────

  const getApprovedActivitiesForEinheit = useCallback(() => {
    if (!unitId) return [];
    const paketIds = lernpakete.filter((lp) => lp.einheit_id === unitId).map((lp) => lp.id);
    return enrichedActivities.filter(
      (a) => paketIds.includes(a.lernpaket_id) && a.effective_content_status === 'approved'
    );
  }, [unitId, lernpakete, enrichedActivities]);

  const getApprovedActivitiesForThemenfeld = useCallback(
    (themenfeldId) => {
      if (!unitId) return [];
      const lpForTf = lernpakete.filter(
        (lp) => lp.themenfeld_id === themenfeldId && lp.einheit_id === unitId
      );
      const lpIds = lpForTf.map((lp) => lp.id);
      return enrichedActivities.filter(
        (a) => lpIds.includes(a.lernpaket_id) && a.effective_content_status === 'approved'
      );
    },
    [unitId, lernpakete, enrichedActivities]
  );

  const getApprovedActivitiesForLernpaket = useCallback(
    (paketId) => {
      return enrichedActivities.filter(
        (a) => a.lernpaket_id === paketId && a.effective_content_status === 'approved'
      );
    },
    [enrichedActivities]
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // Checkbox Logic: Kaskadierung
  // ──────────────────────────────────────────────────────────────────────────────

  const toggleEinheitCheckbox = useCallback(() => {
    const approved = getApprovedActivitiesForEinheit();
    const approvedIds = approved.map((a) => a.id);
    const allSelected = approvedIds.length > 0 && approvedIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !approvedIds.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...approvedIds])]);
    }
  }, [getApprovedActivitiesForEinheit, selectedIds, setSelectedIds]);

  const toggleThemenfeldCheckbox = useCallback(
    (themenfeldId) => {
      const actForTf = getApprovedActivitiesForThemenfeld(themenfeldId);
      const actIds = actForTf.map((a) => a.id);

      const allSelected = actIds.length > 0 && actIds.every((id) => selectedIds.includes(id));
      if (allSelected) {
        setSelectedIds((prev) => prev.filter((id) => !actIds.includes(id)));
      } else {
        setSelectedIds((prev) => [...new Set([...prev, ...actIds])]);
      }
    },
    [getApprovedActivitiesForThemenfeld, selectedIds, setSelectedIds]
  );

  const toggleLernpaketCheckbox = useCallback(
    (paketId) => {
      const actForPaket = getApprovedActivitiesForLernpaket(paketId);
      const actIds = actForPaket.map((a) => a.id);

      const allSelected = actIds.length > 0 && actIds.every((id) => selectedIds.includes(id));
      if (allSelected) {
        setSelectedIds((prev) => prev.filter((id) => !actIds.includes(id)));
      } else {
        setSelectedIds((prev) => [...new Set([...prev, ...actIds])]);
      }
    },
    [getApprovedActivitiesForLernpaket, selectedIds, setSelectedIds]
  );

  const toggleActivityCheckbox = useCallback(
    (actId) => {
      setSelectedIds((prev) =>
        prev.includes(actId) ? prev.filter((x) => x !== actId) : [...prev, actId]
      );
    },
    [setSelectedIds]
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // Computed Values
  // ──────────────────────────────────────────────────────────────────────────────

  const paketIds = unitId
    ? lernpakete.filter((lp) => lp.einheit_id === unitId).map((lp) => lp.id)
    : [];
  const paketActivities = enrichedActivities.filter((a) => paketIds.includes(a.lernpaket_id));
  const currentEinheit = unitId ? einheiten.find((e) => e.id === unitId) : null;
  const canSelectForExport = paketActivities.some((a) => a.effective_content_status === 'approved');
  const hasSelectedItems = selectedApproved && selectedApproved.length > 0;

  // ──────────────────────────────────────────────────────────────────────────────
  // Handle Einheit Change
  // ──────────────────────────────────────────────────────────────────────────────

  const handleEinheitChange = (newEinheitId) => {
    updateSlot(slotId, { unitId: newEinheitId, isCollapsed: false });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render Hierarchie: Themenfeld > Lernpaket > Aktivitäten
  // ──────────────────────────────────────────────────────────────────────────────

  const renderHierarchy = () => {
    if (!unitId) return null;

    return themenfelder
      .filter((tf) => tf.einheit_id === unitId)
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map((tf) => {
        const tfPakete = lernpakete.filter((lp) => lp.themenfeld_id === tf.id);
        const tfActivities = enrichedActivities.filter(
          (a) =>
            tfPakete.some((lp) => lp.id === a.lernpaket_id) &&
            a.effective_content_status === 'approved'
        );
        const tfSelectedCount = tfActivities.filter((a) => selectedIds.includes(a.id)).length;
        const allTfSelected = tfActivities.length > 0 && tfSelectedCount === tfActivities.length;

        const tfDerivedContentStatus = calculateDerivedContentStatus(tfActivities);
        const tfDerivedSyncStatus = calculateDerivedSyncStatus(tfActivities);

        return (
          <div key={tf.id} className="space-y-2">
            {/* Themenfeld */}
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition">
              <Checkbox
                checked={allTfSelected}
                onCheckedChange={() => {}}
                disabled={tfActivities.length === 0}
                className="h-4 w-4"
              />
              <span className="text-sm font-semibold flex-1 truncate">{tf.titel}</span>
              {tfActivities.length > 0 && (
                <span className="text-xs text-muted-foreground">{tfSelectedCount}/{tfActivities.length}</span>
              )}
              <StatusBadges contentStatus={tfDerivedContentStatus} syncStatus={tfDerivedSyncStatus} />
            </div>

            {/* Lernpakete & Aktivitäten */}
            <div className="pl-6 space-y-2 border-l border-border/50">
              {tfPakete.map((paket) => {
                const paketActivities = enrichedActivities.filter(
                  (a) => a.lernpaket_id === paket.id && a.effective_content_status === 'approved'
                );
                const paketSelectedCount = paketActivities.filter((a) => selectedIds.includes(a.id)).length;
                const allPaketSelected =
                  paketActivities.length > 0 && paketSelectedCount === paketActivities.length;

                const paketDerivedContentStatus = calculateDerivedContentStatus(paketActivities);
                const paketDerivedSyncStatus = calculateDerivedSyncStatus(paketActivities);

                return (
                  <div key={paket.id} className="space-y-1.5">
                    {/* Lernpaket */}
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition">
                      <Checkbox
                        checked={allPaketSelected}
                        onCheckedChange={() => toggleLernpaketCheckbox(paket.id)}
                        disabled={paketActivities.length === 0}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-medium flex-1 truncate">{paket.titel_des_pakets}</span>
                      {paketActivities.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {paketSelectedCount}/{paketActivities.length}
                        </span>
                      )}
                      <StatusBadges
                        contentStatus={paketDerivedContentStatus}
                        syncStatus={paketDerivedSyncStatus}
                      />
                    </div>

                    {/* Aktivitäten (tiefste Ebene) */}
                    <div className="pl-6 space-y-1 border-l border-border/30">
                      {paketActivities.map((act) => {
                        const actName = aktivitaetenKatalog.find((k) => k.id === act.aktivitaet_id)?.name ||
                          'Aktivität';
                        const isSelected = selectedIds.includes(act.id);
                        const isPending = act.sync_status === 'pending';

                        return (
                          <div
                            key={act.id}
                            className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 transition"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleActivityCheckbox(act.id)}
                              disabled={isPending}
                              className="h-4 w-4 shrink-0"
                            />
                            <span className="text-xs font-normal flex-1 truncate text-foreground">
                              {actName}
                            </span>

                            {isPending && <UndoButton itemId={act.id} itemType="activity" />}

                            <StatusBadges
                              contentStatus={act.effective_content_status}
                              syncStatus={act.sync_status}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50 h-fit flex-1">
      {/* Header mit Collapsible Button */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="text-sm font-semibold text-muted-foreground">Slot {slotId}</div>
          {currentEinheit && (
            <h3 className="text-base font-semibold text-foreground mt-1">{currentEinheit.titel_der_einheit}</h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unitId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateSlot(slotId, { isCollapsed: !isCollapsed })}
              className="h-8 w-8"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
          {unitId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeSlot(slotId)}
              className="h-8 w-8 text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content (kann eingeklappt sein) */}
      {!isCollapsed && (
        <>
          {/* Einheit-Select */}
          <Select value={unitId || ''} onValueChange={handleEinheitChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Einheit auswählen..." />
            </SelectTrigger>
            <SelectContent className="text-sm">
              {availableEinheiten.map((e) => {
                const hasChanges = enrichedActivities.some(
                  (a) =>
                    lernpakete.some((lp) => lp.einheit_id === e.id && a.lernpaket_id === lp.id) &&
                    (a.sync_status === 'new' || a.sync_status === 'modified')
                );

                return (
                  <SelectItem key={e.id} value={e.id} className="text-sm">
                    <div className="flex items-center gap-2">
                      <span>{e.titel_der_einheit} ({e.fach})</span>
                      {hasChanges && <Badge className="bg-amber-100 text-amber-800 text-xs">⚠️ Änderungen</Badge>}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {!unitId ? (
            <div className="flex items-center justify-center text-center py-8 text-muted-foreground">
              <p className="text-sm">Wähle eine Einheit aus</p>
            </div>
          ) : (
            <>
              {/* Hierarchie Render */}
              <div className="space-y-3 h-fit">
                {currentEinheit && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition">
                      <Checkbox
                        checked={
                          paketActivities.filter((a) => a.effective_content_status === 'approved').length > 0 &&
                          paketActivities
                            .filter((a) => a.effective_content_status === 'approved')
                            .every((a) => selectedIds.includes(a.id))
                        }
                        onCheckedChange={toggleEinheitCheckbox}
                        className="h-5 w-5"
                      />
                      <span className="text-sm font-semibold flex-1 truncate">
                        {currentEinheit.titel_der_einheit}
                      </span>
                      <StatusBadges
                        contentStatus={currentEinheit.content_status}
                        syncStatus={currentEinheit.sync_status}
                      />
                    </div>
                    <Separator />
                  </div>
                )}

                {renderHierarchy()}
              </div>

              {/* Export Button */}
              {canSelectForExport && (
                <div className="space-y-2 pt-3 border-t border-border/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      {hasSelectedItems ? `✓ ${selectedApproved?.length || 0} markiert` : '→ Auswahl'}
                    </span>
                    <span className="text-muted-foreground">
                      {paketActivities.filter((a) => a.effective_content_status === 'approved').length} verfügbar
                    </span>
                  </div>

                  <Button
                    onClick={() => exportMutation.mutate()}
                    disabled={!hasSelectedItems || exportMutation.isPending}
                    className="w-full h-9 gap-2 text-sm"
                    size="sm"
                  >
                    {exportMutation.isPending ? (
                      <>
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        Lädt…
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Freigeben
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Component: Dynamisches Slot-System
// ────────────────────────────────────────────────────────────────────────────────

export default function ExportCockpitView({ initialEinheitId = null }) {
  const queryClient = useQueryClient();
  const [slots, setSlots] = useState([{ id: 1, unitId: initialEinheitId, isCollapsed: false, selectedApproved: [] }]);
  const [nextSlotId, setNextSlotId] = useState(2);
  const [globalSelectedIds, setGlobalSelectedIds] = useState([]);

  // ──────────────────────────────────────────────────────────────────────────────
  // Data Queries
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

  // ──────────────────────────────────────────────────────────────────────────────
  // Data Processing
  // ──────────────────────────────────────────────────────────────────────────────

  const visibleActivities = activities.filter((a) => a.sync_status !== 'to_delete');
  const enrichedActivities = useMemo(
    () =>
      visibleActivities.map((a) => ({
        ...a,
        effective_content_status: a.content_status,
      })),
    [visibleActivities]
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // Slot Management
  // ──────────────────────────────────────────────────────────────────────────────

  const updateSlot = (slotId, updates) => {
    setSlots((prevSlots) => {
      const newSlots = prevSlots.map((s) => (s.id === slotId ? { ...s, ...updates } : s));

      // Auto-add neuen leeren Slot wenn letzte Slot eine Einheit hat
      const lastSlot = newSlots[newSlots.length - 1];
      if (lastSlot && lastSlot.unitId && !newSlots.find((s) => !s.unitId)) {
        newSlots.push({ id: nextSlotId + 1, unitId: null, isCollapsed: false, selectedApproved: [] });
        setNextSlotId(nextSlotId + 2);
      }

      return newSlots;
    });
  };

  const removeSlot = (slotId) => {
    setSlots((prevSlots) => prevSlots.filter((s) => s.id !== slotId));
  };

  const selectedEinheitIds = slots.map((s) => s.unitId).filter(Boolean);

  // ──────────────────────────────────────────────────────────────────────────────
  // Export Mutation
  // ──────────────────────────────────────────────────────────────────────────────

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (globalSelectedIds.length === 0) throw new Error('Keine Elemente ausgewählt');

      for (const id of globalSelectedIds) {
        await base44.entities.LernpaketPhaseAktivitaet.update(id, { sync_status: 'pending' });
      }
      return globalSelectedIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      setGlobalSelectedIds([]);
      toast.success(`🚀 ${count} Element${count !== 1 ? 'e' : ''} zum Export markiert.`);
    },
    onError: (err) => {
      toast.error('Fehler: ' + err.message);
    },
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Freigabe-Cockpit</h2>
          <p className="text-base text-muted-foreground">
            Wähle Einheiten aus und markiere die Elemente zum Export. Das Grid füllt sich automatisch Reihe für Reihe.
          </p>
        </div>

        {/* Dynamic Slot Grid */}
        {slots.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {slots.map((slot) => (
              <CockpitSlot
                key={slot.id}
                slotId={slot.id}
                slot={slot}
                updateSlot={updateSlot}
                removeSlot={removeSlot}
                selectedEinheitIds={selectedEinheitIds}
                selectedIds={globalSelectedIds}
                setSelectedIds={setGlobalSelectedIds}
                einheiten={einheiten}
                lernpakete={lernpakete}
                themenfelder={themenfelder}
                enrichedActivities={enrichedActivities}
                aktivitaetenKatalog={aktivitaetenKatalog}
                exportMutation={exportMutation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}