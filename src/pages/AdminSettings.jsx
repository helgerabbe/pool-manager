/**
 * ExportCockpitView.jsx
 * * Ebene 5 – Freigabe-Cockpit für Moodle-Export
 * * Fixes:
 * - Fehlende Queries für MasterAufgabe und Aufgabenbausteine (Klone) hinzugefügt
 * - Rekursives Rendering bis zur tiefsten Ebene repariert
 * - Redundante Einheiten-Überschrift entfernt
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
  const allApproved = children.every((c) => (c.content_status || c.effective_content_status) === 'approved');
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
  masterAufgaben,
  aufgabenbausteine,
  exportMutation,
}) {
  const { unitId, isCollapsed } = slot;

  const availableEinheiten = einheiten.filter(
    (e) => !selectedEinheitIds.includes(e.id) || e.id === unitId
  );

  // Helper zum Sammeln aller Aufgaben (Master/Klone) für eine Aktivität
  const getAufgabenForAktivitaet = useCallback((actId) => {
    const masters = masterAufgaben.filter(m => m.aktivitaet_id === actId);
    const klone = aufgabenbausteine.filter(k => masters.some(m => m.id === k.master_id));
    return [...masters, ...klone];
  }, [masterAufgaben, aufgabenbausteine]);

  const toggleItemCheckbox = useCallback((id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, [setSelectedIds]);

  const handleEinheitChange = (newEinheitId) => {
    updateSlot(slotId, { unitId: newEinheitId, isCollapsed: false });
  };

  // ──────────────────────────────────────────────────────────────────────────────
  // Render Hierarchie: Themenfeld > Lernpaket > Aktivitäten > Aufgaben
  // ────────────────────────────────────────────────────────────────────────────────

  const renderHierarchy = () => {
    if (!unitId) return null;

    return themenfelder
      .filter((tf) => tf.einheit_id === unitId)
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map((tf) => {
        const tfPakete = lernpakete.filter((lp) => lp.themenfeld_id === tf.id);
        
        // Sammle alle Aufgaben in diesem Themenfeld für den Vererbungsstatus
        let tfAllAufgaben = [];
        tfPakete.forEach(paket => {
            const paketActivities = enrichedActivities.filter(a => a.lernpaket_id === paket.id);
            paketActivities.forEach(act => {
                tfAllAufgaben = [...tfAllAufgaben, ...getAufgabenForAktivitaet(act.id)];
            });
        });

        const tfDerivedContentStatus = calculateDerivedContentStatus(tfAllAufgaben);
        const tfDerivedSyncStatus = calculateDerivedSyncStatus(tfAllAufgaben);

        return (
          <div key={tf.id} className="space-y-2">
            {/* Themenfeld */}
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition">
              <span className="text-sm font-semibold flex-1 truncate">{tf.titel}</span>
              <StatusBadges contentStatus={tfDerivedContentStatus} syncStatus={tfDerivedSyncStatus} />
            </div>

            {/* Lernpakete */}
            <div className="pl-6 space-y-2 border-l border-border/50">
              {tfPakete.map((paket) => {
                const paketActivities = enrichedActivities.filter((a) => a.lernpaket_id === paket.id);
                
                let paketAllAufgaben = [];
                paketActivities.forEach(act => {
                    paketAllAufgaben = [...paketAllAufgaben, ...getAufgabenForAktivitaet(act.id)];
                });

                const paketDerivedContentStatus = calculateDerivedContentStatus(paketAllAufgaben);
                const paketDerivedSyncStatus = calculateDerivedSyncStatus(paketAllAufgaben);

                return (
                  <div key={paket.id} className="space-y-1.5">
                    {/* Lernpaket */}
                    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/40 transition">
                      <span className="text-sm font-medium flex-1 truncate">{paket.titel_des_pakets}</span>
                      <StatusBadges
                        contentStatus={paketDerivedContentStatus}
                        syncStatus={paketDerivedSyncStatus}
                      />
                    </div>

                    {/* Aktivitäten */}
                    <div className="pl-6 space-y-1.5 border-l border-border/30">
                      {paketActivities.map((act) => {
                        const actName = aktivitaetenKatalog.find((k) => k.id === act.aktivitaet_id)?.name || 'Aktivität';
                        const aufgaben = getAufgabenForAktivitaet(act.id);
                        
                        const actDerivedContentStatus = calculateDerivedContentStatus(aufgaben);
                        const actDerivedSyncStatus = calculateDerivedSyncStatus(aufgaben);

                        return (
                          <div key={act.id} className="space-y-1">
                            {/* Aktivität Header */}
                            <div className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/30 transition">
                              <span className="text-xs font-semibold flex-1 truncate text-foreground">
                                ↳ {actName}
                              </span>
                              <StatusBadges
                                contentStatus={actDerivedContentStatus}
                                syncStatus={actDerivedSyncStatus}
                              />
                            </div>

                            {/* Aufgaben (Klone & Master) */}
                            <div className="pl-6 space-y-1">
                                {aufgaben.map((aufgabe) => {
                                    const isSelected = selectedIds.includes(aufgabe.id);
                                    const isPending = aufgabe.sync_status === 'pending';
                                    const isApproved = aufgabe.content_status === 'approved';
                                    const aufgabeType = aufgabe.master_id ? 'klon' : 'master';
                                    const title = aufgabe.titel || (aufgabeType === 'master' ? 'Master-Aufgabe' : 'Klon-Aufgabe');

                                    return (
                                        <div key={aufgabe.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/20 transition">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleItemCheckbox(aufgabe.id)}
                                                disabled={isPending || !isApproved}
                                                className="h-4 w-4 shrink-0"
                                            />
                                            <span className="text-xs font-normal flex-1 truncate text-muted-foreground">
                                                {title}
                                            </span>
                                            
                                            {isPending && <UndoButton itemId={aufgabe.id} itemType={aufgabeType} />}

                                            <StatusBadges
                                                contentStatus={aufgabe.content_status}
                                                syncStatus={aufgabe.sync_status}
                                            />
                                        </div>
                                    )
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
          </div>
        );
      });
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card/50 h-fit flex-1">
      {/* Header mit Collapsible Button */}
      <div className="flex items-center justify-end gap-2">
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

      {/* Content */}
      {!isCollapsed && (
        <>
          <Select value={unitId || ''} onValueChange={handleEinheitChange}>
            <SelectTrigger className="h-9 text-sm font-semibold">
              <SelectValue placeholder="Einheit auswählen..." />
            </SelectTrigger>
            <SelectContent className="text-sm">
              {availableEinheiten.map((e) => {
                return (
                  <SelectItem key={e.id} value={e.id} className="text-sm">
                    {e.titel_der_einheit} ({e.fach})
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
              <div className="space-y-3 h-fit pt-2">
                {renderHierarchy()}
              </div>

              {/* Export Button */}
              <div className="space-y-2 pt-3 border-t border-border/40">
                <Button
                  onClick={() => exportMutation.mutate()}
                  disabled={selectedIds.length === 0 || exportMutation.isPending}
                  className="w-full h-9 gap-2 text-sm"
                  size="sm"
                >
                  {exportMutation.isPending ? 'Lädt...' : `🚀 ${selectedIds.length} Aufgaben zum Export freigeben`}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────────

export default function ExportCockpitView({ initialEinheitId = null }) {
  const queryClient = useQueryClient();
  const [slots, setSlots] = useState([{ id: 1, unitId: initialEinheitId, isCollapsed: false }]);
  const [nextSlotId, setNextSlotId] = useState(2);
  const [globalSelectedIds, setGlobalSelectedIds] = useState([]);

  // Data Queries
  const { data: einheiten = [] } = useQuery({ queryKey: ['einheiten'], queryFn: () => base44.entities.Einheiten.list() });
  const { data: lernpakete = [] } = useQuery({ queryKey: ['lernpakete'], queryFn: () => base44.entities.Lernpakete.list() });
  const { data: themenfelder = [] } = useQuery({ queryKey: ['themenfelder'], queryFn: () => base44.entities.Themenfeld.list() });
  const { data: activities = [] } = useQuery({ queryKey: ['lernpaketPhaseAktivitaeten'], queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list() });
  const { data: aktivitaetenKatalog = [] } = useQuery({ queryKey: ['aktivitaetenKatalog'], queryFn: () => base44.entities.AktivitaetenKatalog.list() });
  
  // FEHLENDE QUERIES HINZUGEFÜGT
  const { data: masterAufgaben = [] } = useQuery({ queryKey: ['masterAufgaben'], queryFn: () => base44.entities.MasterAufgabe.list() });
  const { data: aufgabenbausteine = [] } = useQuery({ queryKey: ['aufgabenbausteine'], queryFn: () => base44.entities.Aufgabenbausteine.list() });

  const visibleActivities = activities.filter((a) => a.sync_status !== 'to_delete');
  const enrichedActivities = useMemo(() => visibleActivities.map((a) => ({ ...a, effective_content_status: a.content_status })), [visibleActivities]);

  const updateSlot = (slotId, updates) => {
    setSlots((prevSlots) => {
      const newSlots = prevSlots.map((s) => (s.id === slotId ? { ...s, ...updates } : s));
      const lastSlot = newSlots[newSlots.length - 1];
      if (lastSlot && lastSlot.unitId && !newSlots.find((s) => !s.unitId)) {
        newSlots.push({ id: nextSlotId + 1, unitId: null, isCollapsed: false });
        setNextSlotId(nextSlotId + 2);
      }
      return newSlots;
    });
  };

  const removeSlot = (slotId) => setSlots((prev) => prev.filter((s) => s.id !== slotId));
  const selectedEinheitIds = slots.map((s) => s.unitId).filter(Boolean);

  const exportMutation = useMutation({
    mutationFn: async () => {
      if (globalSelectedIds.length === 0) throw new Error('Keine Elemente ausgewählt');
      for (const id of globalSelectedIds) {
        // HINWEIS: Hier checkt das Backend normalerweise, ob es sich um Klon oder Master handelt.
        await base44.entities.Aufgabenbausteine.update(id, { sync_status: 'pending' }).catch(() => 
          base44.entities.MasterAufgabe.update(id, { sync_status: 'pending' })
        );
      }
      return globalSelectedIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      setGlobalSelectedIds([]);
      toast.success(`🚀 ${count} Aufgaben an das Export-Zentrum übergeben.`);
    },
    onError: (err) => toast.error('Fehler: ' + err.message),
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">Freigabe-Cockpit</h2>
          <p className="text-base text-muted-foreground">
            Wähle Einheiten aus und markiere die fertigen Aufgaben zur Übergabe an das Export-Zentrum.
          </p>
        </div>

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
                masterAufgaben={masterAufgaben}
                aufgabenbausteine={aufgabenbausteine}
                exportMutation={exportMutation}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}