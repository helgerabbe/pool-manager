/**
 * ExportCockpitView.jsx
 * 
 * Ebene 5 – Freigabe-Cockpit für Moodle-Export
 * 
 * Fixes:
 * - Scrollbalken-Problem behoben: Keine inneren overflow-y-auto, nur globaler Scroll
 * - 2-Badge-System: Jede Zeile zeigt [Pädagogischer Status] + [Technischer Status]
 * - Checkbox-Kaskadierung funktioniert (Parent wählt/entfernt alle Children)
 * - Undo-Button für pending Items (sync_status: 'pending')
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Lock, RotateCcw } from 'lucide-react';
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
// Calculated Status: Ableitung basierend auf Kindern
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
// Single Cockpit Slot
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
}) {
  // ──────────────────────────────────────────────────────────────────────────────
  // Helpers: Get Approved Activities
  // ──────────────────────────────────────────────────────────────────────────────

  const getApprovedActivitiesForEinheit = useCallback(() => {
    const paketIds = lernpakete.filter((lp) => lp.einheit_id === selectedEinheitId).map((lp) => lp.id);
    return enrichedActivities.filter(
      (a) => paketIds.includes(a.lernpaket_id) && a.effective_content_status === 'approved'
    );
  }, [selectedEinheitId, lernpakete, enrichedActivities]);

  const getApprovedActivitiesForThemenfeld = useCallback(
    (themenfeldId) => {
      const lpForTf = lernpakete.filter(
        (lp) => lp.themenfeld_id === themenfeldId && lp.einheit_id === selectedEinheitId
      );
      const lpIds = lpForTf.map((lp) => lp.id);
      return enrichedActivities.filter(
        (a) => lpIds.includes(a.lernpaket_id) && a.effective_content_status === 'approved'
      );
    },
    [selectedEinheitId, lernpakete, enrichedActivities]
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

  const paketIds = lernpakete.filter((lp) => lp.einheit_id === selectedEinheitId).map((lp) => lp.id);
  const paketActivities = enrichedActivities.filter((a) => paketIds.includes(a.lernpaket_id));
  const currentEinheit = einheiten.find((e) => e.id === selectedEinheitId);
  const canSelectForExport = paketActivities.some((a) => a.effective_content_status === 'approved');
  const hasSelectedItems = selectedIds.length > 0;

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50 h-fit flex-1">
      {/* Slot Header */}
      <div className="text-sm font-semibold text-muted-foreground">Slot {slotId}</div>

      {/* Einheit-Select */}
      <Select value={selectedEinheitId || ''} onValueChange={setSelectedEinheitId}>
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder="Einheit auswählen..." />
        </SelectTrigger>
        <SelectContent className="text-sm">
          {einheiten.map((e) => (
            <SelectItem key={e.id} value={e.id} className="text-sm">
              {e.titel_der_einheit} ({e.fach})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!selectedEinheitId ? (
        <div className="flex items-center justify-center text-center py-8 text-muted-foreground">
          <p className="text-sm">Wähle eine Einheit aus</p>
        </div>
      ) : (
        <>
          {/* Content: Scrollfrei! h-fit statt overflow-y-auto */}
          <div className="space-y-3 h-fit">
            {/* Einheit als Root */}
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
                  <span className="text-sm font-semibold flex-1 truncate">{currentEinheit.titel_der_einheit}</span>
                  <StatusBadges
                    contentStatus={currentEinheit.content_status}
                    syncStatus={currentEinheit.sync_status}
                  />
                </div>
                <Separator />
              </div>
            )}

            {/* Themenfelder & Lernpakete */}
            {themenfelder
              .filter((tf) => tf.einheit_id === selectedEinheitId)
              .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
              .map((tf) => {
                const tfPakete = lernpakete.filter((lp) => lp.themenfeld_id === tf.id);
                const tfActivities = enrichedActivities.filter(
                  (a) => tfPakete.some((lp) => lp.id === a.lernpaket_id) &&
                    a.effective_content_status === 'approved'
                );
                const tfSelectedCount = tfActivities.filter((a) => selectedIds.includes(a.id)).length;
                const allTfSelected = tfActivities.length > 0 && tfSelectedCount === tfActivities.length;

                // Ableitung: Derived Status für Themenfeld
                const tfDerivedContentStatus = calculateDerivedContentStatus(tfActivities);
                const tfDerivedSyncStatus = calculateDerivedSyncStatus(tfActivities);

                return (
                  <div key={tf.id} className="space-y-2">
                    {/* Themenfeld Header */}
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition">
                      <Checkbox
                        checked={allTfSelected}
                        onCheckedChange={() => toggleThemenfeldCheckbox(tf.id)}
                        disabled={tfActivities.length === 0}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-semibold flex-1 truncate">{tf.titel}</span>
                      {tfActivities.length > 0 && (
                        <span className="text-xs text-muted-foreground">{tfSelectedCount}/{tfActivities.length}</span>
                      )}
                      <StatusBadges contentStatus={tfDerivedContentStatus} syncStatus={tfDerivedSyncStatus} />
                    </div>

                    {/* Lernpakete */}
                    <div className="pl-6 space-y-2 border-l border-border/50">
                      {tfPakete.map((paket) => {
                        const paketActivities = enrichedActivities.filter(
                          (a) => a.lernpaket_id === paket.id && a.effective_content_status === 'approved'
                        );
                        const paketSelectedCount = paketActivities.filter((a) => selectedIds.includes(a.id)).length;
                        const allPaketSelected = paketActivities.length > 0 && paketSelectedCount === paketActivities.length;

                        // Ableitung: Derived Status für Lernpaket
                        const paketDerivedContentStatus = calculateDerivedContentStatus(paketActivities);
                        const paketDerivedSyncStatus = calculateDerivedSyncStatus(paketActivities);

                        return (
                          <div key={paket.id} className="space-y-1.5">
                            {/* Lernpaket Header */}
                            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition">
                              <Checkbox
                                checked={allPaketSelected}
                                onCheckedChange={() => toggleLernpaketCheckbox(paket.id)}
                                disabled={paketActivities.length === 0}
                                className="h-4 w-4"
                              />
                              <span className="text-sm font-medium flex-1 truncate">
                                {paket.titel_des_pakets}
                              </span>
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

                            {/* Aktivitäten */}
                            <div className="pl-6 space-y-1 border-l border-border/30">
                              {paketActivities.map((act) => {
                                const actName = aktivitaetenKatalog.find((k) => k.id === act.aktivitaet_id)?.name ||
                                  'Aktivität';
                                const isSelected = selectedIds.includes(act.id);
                                const isPending = act.sync_status === 'pending';

                                return (
                                  <div key={act.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 transition">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => toggleActivityCheckbox(act.id)}
                                      disabled={isPending}
                                      className="h-4 w-4 shrink-0"
                                    />
                                    <span className="text-xs font-normal flex-1 truncate text-foreground">
                                      {actName}
                                    </span>

                                    {/* Undo Button für Pending Items */}
                                    {isPending && (
                                      <UndoButton itemId={act.id} itemType="activity" />
                                    )}

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
              })}
          </div>

          {/* Export Button */}
          {canSelectForExport && (
            <div className="space-y-2 pt-3 border-t border-border/40">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">
                  {hasSelectedItems ? `✓ ${selectedIds.length} markiert` : '→ Auswahl'}
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
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────────

export default function ExportCockpitView({ initialEinheitId = null, userRole = 'user' }) {
  const queryClient = useQueryClient();
  const [slot1SelectedIds, setSlot1SelectedIds] = useState([]);
  const [slot1EinheitId, setSlot1EinheitId] = useState(initialEinheitId);
  const [slot2SelectedIds, setSlot2SelectedIds] = useState([]);
  const [slot2EinheitId, setSlot2EinheitId] = useState(null);

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

  const { data: klone = [] } = useQuery({
    queryKey: ['aufgabenbausteine', 'klone'],
    queryFn: () => base44.entities.Aufgabenbausteine.filter({ is_master: false }),
  });

  const { data: masters = [] } = useQuery({
    queryKey: ['masterAufgaben'],
    queryFn: () => base44.entities.MasterAufgabe.list(),
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Data Filtering & Enriching
  // ──────────────────────────────────────────────────────────────────────────────

  const visibleActivities = activities.filter((a) => a.sync_status !== 'to_delete');
  const visibleKlone = klone.filter((k) => k.sync_status !== 'to_delete');
  const visibleMasters = masters.filter((m) => m.sync_status !== 'to_delete');

  const enrichedActivities = useMemo(
    () =>
      visibleActivities.map((a) => ({
        ...a,
        effective_content_status: a.content_status,
      })),
    [visibleActivities]
  );

  // ──────────────────────────────────────────────────────────────────────────────
  // Export Mutations
  // ──────────────────────────────────────────────────────────────────────────────

  const exportMutation1 = useMutation({
    mutationFn: async () => {
      if (slot1SelectedIds.length === 0) throw new Error('Keine Elemente ausgewählt');

      for (const id of slot1SelectedIds) {
        await base44.entities.LernpaketPhaseAktivitaet.update(id, { sync_status: 'pending' });
      }
      return slot1SelectedIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      setSlot1SelectedIds([]);
      toast.success(`🚀 ${count} Element${count !== 1 ? 'e' : ''} zum Export markiert.`);
    },
    onError: (err) => {
      toast.error('Fehler: ' + err.message);
    },
  });

  const exportMutation2 = useMutation({
    mutationFn: async () => {
      if (slot2SelectedIds.length === 0) throw new Error('Keine Elemente ausgewählt');

      for (const id of slot2SelectedIds) {
        await base44.entities.LernpaketPhaseAktivitaet.update(id, { sync_status: 'pending' });
      }
      return slot2SelectedIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      setSlot2SelectedIds([]);
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
            Wähle bis zu zwei Einheiten aus und vergleiche diese nebeneinander. Markiere die Elemente, die zum Export freigegeben werden sollen.
          </p>
        </div>

        {/* Dual-Slot Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
          />
        </div>
      </div>
    </div>
  );
}