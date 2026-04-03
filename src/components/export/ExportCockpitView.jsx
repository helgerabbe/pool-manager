/**
 * ExportCockpitView.jsx
 * * Ebene 5 – Freigabe-Cockpit für Moodle-Export
 * * FULL FEATURE SET:
 * - Dynamische Slots & Collapsible
 * - Volle 5-Ebenen-Hierarchie (Einheit -> Aufgabe)
 * - 2-Signal-System (Pädagogisch & Technisch) mit exakter Vererbung
 * - Kaskadierende Checkboxen (Parent wählt alle gültigen Children)
 * - Zähler pro Ebene (X/Y markiert)
 * - Status-Indikatoren im Dropdown-Menü
 * - Undo-Funktion für gesperrte Elemente
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
// 2-Badge System
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

  const cData = contentBadges[contentStatus];
  const sData = syncBadges[syncStatus];

  return (
    <div className="flex gap-1.5 flex-wrap">
      {cData && <Badge className={cn('border text-xs font-semibold', cData.color)}>{cData.icon} {cData.label}</Badge>}
      {sData && <Badge className={cn('border text-xs font-semibold', sData.color)}>{sData.icon} {sData.label}</Badge>}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Undo-Button
// ────────────────────────────────────────────────────────────────────────────────

function UndoButton({ itemId, itemType }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState(false);

  const handleUndo = async () => {
    setIsLoading(true);
    try {
      const entityName = itemType === 'master' ? 'MasterAufgabe' : 'Aufgabenbausteine';
      await base44.entities[entityName].update(itemId, { sync_status: 'modified' });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      toast.success('Export-Sperre entfernt');
    } catch (err) {
      toast.error('Fehler beim Entsperren');
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
      className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0"
      title="Export-Sperre entfernen"
    >
      <RotateCcw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin')} />
    </Button>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Helper: Status Berechnungen
// ────────────────────────────────────────────────────────────────────────────────

function calcContentStatus(aufgaben) {
  if (!aufgaben || aufgaben.length === 0) return 'draft';
  return aufgaben.every(a => a.content_status === 'approved') ? 'approved' : 'draft';
}

function calcSyncStatus(aufgaben) {
  if (!aufgaben || aufgaben.length === 0) return 'new';
  const statuses = aufgaben.map(a => a.sync_status);
  if (statuses.includes('pending')) return 'pending';
  if (statuses.includes('to_delete')) return 'to_delete';
  if (statuses.includes('modified')) return 'modified';
  if (statuses.some(s => s === 'synced') && statuses.some(s => s !== 'synced')) return 'modified';
  if (statuses.every(s => s === 'synced')) return 'synced';
  return 'new';
}

// ────────────────────────────────────────────────────────────────────────────────
// Single Cockpit Slot
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
  aktivitaeten,
  aktivitaetenKatalog,
  masterAufgaben,
  aufgabenbausteine,
  allgemeineAufgaben,
  projektaufgaben,
  exportMutation,
}) {
  const { unitId, isCollapsed } = slot;

  // 1. Daten filtern für die Dropdown-Anzeige (inklusive Status-Check)
  const availableEinheiten = einheiten.filter(e => !selectedEinheitIds.includes(e.id) || e.id === unitId);

  // Helper: Alle Aufgaben einer bestimmten Einheit finden (für den Dropdown-Indikator)
  const checkEinheitStatus = useCallback((eId) => {
    const tfs = themenfelder.filter(tf => tf.einheit_id === eId);
    const paks = lernpakete.filter(lp => tfs.some(tf => tf.id === lp.themenfeld_id));
    const acts = aktivitaeten.filter(a => paks.some(p => p.id === a.lernpaket_id));
    const masters = masterAufgaben.filter(m => acts.some(a => a.id === m.aktivitaet_id));
    const klone = aufgabenbausteine.filter(k => masters.some(m => m.id === k.master_id));
    const all = [...masters, ...klone];
    
    const hasNew = all.some(a => a.sync_status === 'new');
    const hasMod = all.some(a => a.sync_status === 'modified');
    return { hasNew, hasMod };
  }, [themenfelder, lernpakete, aktivitaeten, masterAufgaben, aufgabenbausteine]);

  // 2. Hierarchie Helper für den aktiven Slot
  const getAufgabenForAktivitaet = useCallback((actId) => {
    const masters = masterAufgaben.filter(m => m.aktivitaet_id === actId);
    const klone = aufgabenbausteine.filter(k => masters.some(m => m.id === k.master_id));
    return [...masters, ...klone];
  }, [masterAufgaben, aufgabenbausteine]);

  // Kaskadierende Checkbox-Logik
  const toggleBulkCheckbox = (aufgabenArray) => {
    // Finde alle Aufgaben, die überhaupt auswählbar sind (approved & nicht pending)
    const exportableTasks = aufgabenArray.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
    if (exportableTasks.length === 0) return;

    const exportableIds = exportableTasks.map(a => a.id);
    const allSelected = exportableIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      // Deselect all
      setSelectedIds(prev => prev.filter(id => !exportableIds.includes(id)));
    } else {
      // Select all (merge ohne Duplikate)
      setSelectedIds(prev => [...new Set([...prev, ...exportableIds])]);
    }
  };

  const renderHierarchy = () => {
    if (!unitId) return null;

    return themenfelder
      .filter((tf) => tf.einheit_id === unitId)
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map((tf) => {
        const tfPakete = lernpakete.filter((lp) => lp.themenfeld_id === tf.id);
        
        let tfAllAufgaben = [];
        tfPakete.forEach(paket => {
            const paketActivities = aktivitaeten.filter(a => a.lernpaket_id === paket.id);
            paketActivities.forEach(act => {
                tfAllAufgaben = [...tfAllAufgaben, ...getAufgabenForAktivitaet(act.id)];
            });
        });

        // Ebene 2: Allgemeine Aufgaben für dieses Themenfeld (Basis + Transfer)
        const ebene2Aufgaben = allgemeineAufgaben.filter(
          (a) => a.themenfeld_id === tf.id && a.anforderungsebene !== '3 - Projekt'
        );

        const tfAllAufgabenCombined = [...tfAllAufgaben, ...ebene2Aufgaben];
        // Nur freigegebene (content_status === 'approved') und noch nicht im Export (sync_status !== 'pending')
        const tfExportable = tfAllAufgabenCombined.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
        const tfSelectedCount = tfExportable.filter(a => selectedIds.includes(a.id)).length;
        const isTfFullySelected = tfExportable.length > 0 && tfSelectedCount === tfExportable.length;

        return (
          <div key={tf.id} className="space-y-2">
            {/* Themenfeld Ebene – nur als Label, keine Checkbox */}
            <div className="px-2 py-1.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{tf.titel}</span>
            </div>

            {/* Lernpakete Ebene */}
            <div className="pl-4 space-y-2 border-l-2 border-muted">
              {tfPakete.map((paket) => {
                const paketActivities = aktivitaeten.filter((a) => a.lernpaket_id === paket.id);
                let paketAllAufgaben = [];
                paketActivities.forEach(act => {
                    paketAllAufgaben = [...paketAllAufgaben, ...getAufgabenForAktivitaet(act.id)];
                });

                const pakExportable = paketAllAufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
                const pakSelectedCount = pakExportable.filter(a => selectedIds.includes(a.id)).length;
                const isPakFullySelected = pakExportable.length > 0 && pakSelectedCount === pakExportable.length;

                return (
                  <div key={paket.id} className="space-y-1.5">
                    <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition">
                      <Checkbox
                        checked={isPakFullySelected}
                        onCheckedChange={() => toggleBulkCheckbox(paketAllAufgaben)}
                        disabled={pakExportable.length === 0}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-semibold flex-1 truncate text-foreground/90">{paket.titel_des_pakets}</span>
                      {pakExportable.length > 0 && (
                          <span className="text-xs text-muted-foreground mr-2">{pakSelectedCount}/{pakExportable.length}</span>
                      )}
                      <StatusBadges contentStatus={calcContentStatus(paketAllAufgaben)} syncStatus={calcSyncStatus(paketAllAufgaben)} />
                    </div>

                    {/* Aktivitäten Ebene */}
                    <div className="pl-6 space-y-1.5 border-l border-muted/50">
                      {paketActivities.map((act) => {
                        const actName = aktivitaetenKatalog.find((k) => k.id === act.aktivitaet_id)?.name || 'Aktivität';
                        const aufgaben = getAufgabenForAktivitaet(act.id);
                        
                        const actExportable = aufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
                        const actSelectedCount = actExportable.filter(a => selectedIds.includes(a.id)).length;
                        const isActFullySelected = actExportable.length > 0 && actSelectedCount === actExportable.length;

                        return (
                          <div key={act.id} className="space-y-1">
                            <div className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/20 transition">
                              <Checkbox
                                checked={isActFullySelected}
                                onCheckedChange={() => toggleBulkCheckbox(aufgaben)}
                                disabled={actExportable.length === 0}
                                className="h-4 w-4"
                              />
                              <span className="text-xs font-medium flex-1 truncate text-foreground/80">↳ {actName}</span>
                              {actExportable.length > 0 && (
                                  <span className="text-[10px] text-muted-foreground mr-2">{actSelectedCount}/{actExportable.length}</span>
                              )}
                              <StatusBadges contentStatus={calcContentStatus(aufgaben)} syncStatus={calcSyncStatus(aufgaben)} />
                            </div>

                            {/* Aufgaben Ebene (Leaf) – Master/Klon */}
                            <div className="pl-6 space-y-1">
                                {aufgaben.map((aufgabe) => {
                                    const isSelected = selectedIds.includes(aufgabe.id);
                                    const isPending = aufgabe.sync_status === 'pending';
                                    const isApproved = aufgabe.content_status === 'approved';
                                    const type = aufgabe.master_id ? 'klon' : 'master';
                                    const title = aufgabe.titel || (type === 'master' ? 'Master-Aufgabe' : 'Klon-Aufgabe');

                                    return (
                                        <div key={aufgabe.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/10 transition">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleBulkCheckbox([aufgabe])}
                                                disabled={isPending || !isApproved}
                                                className="h-4 w-4 shrink-0"
                                            />
                                            <span className="text-xs font-normal flex-1 truncate text-muted-foreground">
                                                {title}
                                            </span>
                                            {isPending && <UndoButton itemId={aufgabe.id} itemType={type} />}
                                            <StatusBadges contentStatus={aufgabe.content_status} syncStatus={aufgabe.sync_status} />
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
            {/* Ebene 2: Allgemeine Aufgaben direkt im Themenfeld */}
            {ebene2Aufgaben.length > 0 && (
              <div className="pl-6 space-y-1 border-l-2 border-muted mt-1">
                <p className="text-xs font-semibold text-muted-foreground px-1 mb-1">Allgemeine Aufgaben (Ebene 1/2)</p>
                {ebene2Aufgaben.map((aufgabe) => {
                  const isSelected = selectedIds.includes(aufgabe.id);
                  const isPending = aufgabe.sync_status === 'pending';
                  const isApproved = aufgabe.content_status === 'approved';
                  const title = aufgabe.titel || 'Aufgabe ohne Titel';
                  return (
                    <div key={aufgabe.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/10 transition">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleBulkCheckbox([aufgabe])}
                        disabled={isPending || !isApproved}
                        className="h-4 w-4 shrink-0"
                      />
                      <span className="text-xs font-normal flex-1 truncate text-muted-foreground">
                        📝 {title}
                      </span>
                      {isPending && <UndoButton itemId={aufgabe.id} itemType="allgemein" />}
                      <StatusBadges contentStatus={aufgabe.content_status} syncStatus={aufgabe.sync_status} />
                    </div>
                  );
                })}
              </div>
            )}

            <Separator className="my-2" />
          </div>
        );
      });
  };

  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card shadow-sm h-fit flex-1">
      <div className="flex items-center justify-end gap-1 mb-2">
        {unitId && (
          <Button variant="ghost" size="icon" onClick={() => updateSlot(slotId, { isCollapsed: !isCollapsed })} className="h-7 w-7">
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={() => removeSlot(slotId)} className="h-7 w-7 text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {!isCollapsed && (
        <>
          <Select value={unitId || ''} onValueChange={(val) => updateSlot(slotId, { unitId: val, isCollapsed: false })}>
            <SelectTrigger className="h-10 text-sm font-semibold bg-background">
              <SelectValue placeholder="Einheit auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {availableEinheiten.map((e) => {
                const { hasNew, hasMod } = checkEinheitStatus(e.id);
                const indicator = hasNew ? ' (🆕 Updates)' : hasMod ? ' (⚠️ Änderungen)' : '';
                return (
                  <SelectItem key={e.id} value={e.id} className="text-sm">
                    {e.titel_der_einheit} {indicator}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {!unitId ? (
            <div className="flex items-center justify-center text-center py-10 text-muted-foreground text-sm">
              Bitte wähle eine Einheit, um die Struktur zu laden.
            </div>
          ) : (
            <>
              <div className="space-y-2 pt-4">
                {renderHierarchy()}
              </div>

              {/* Export Trigger */}
              <div className="pt-4 mt-4 border-t">
                <Button
                  onClick={() => exportMutation.mutate()}
                  disabled={selectedIds.length === 0 || exportMutation.isPending}
                  className="w-full font-semibold"
                >
                  {exportMutation.isPending ? 'Wird übergeben...' : `🚀 ${selectedIds.length} Aufgaben an Export-Zentrum übergeben`}
                </Button>
              </div>
              {/* Ebene 3: Projekt-Aufgaben direkt auf Einheitsebene */}
              {projektaufgaben.filter(p => p.einheit_id === unitId).length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="space-y-2">
                    <h4 className="text-sm font-bold px-2">Projekt-Aufgaben (Ebene 3)</h4>
                    {projektaufgaben.filter(p => p.einheit_id === unitId).map((aufgabe) => {
                      const isSelected = selectedIds.includes(aufgabe.id);
                      const isPending = aufgabe.sync_status === 'pending';
                      const isApproved = aufgabe.content_status === 'approved';
                      const title = aufgabe.titel || 'Projekt ohne Titel';

                      return (
                        <div key={aufgabe.id} className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/10 transition pl-6">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleBulkCheckbox([aufgabe])}
                            disabled={isPending || !isApproved}
                            className="h-4 w-4 shrink-0"
                          />
                          <span className="text-xs font-normal flex-1 truncate text-muted-foreground">
                            🎯 {title} (Ebene 3)
                          </span>
                          {isPending && <UndoButton itemId={aufgabe.id} itemType="projekt" />}
                          <StatusBadges contentStatus={aufgabe.content_status} syncStatus={aufgabe.sync_status} />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
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

  // Data
  const { data: einheiten = [] } = useQuery({ queryKey: ['einheiten'], queryFn: () => base44.entities.Einheiten.list() });
  const { data: lernpakete = [] } = useQuery({ queryKey: ['lernpakete'], queryFn: () => base44.entities.Lernpakete.list() });
  const { data: themenfelder = [] } = useQuery({ queryKey: ['themenfelder'], queryFn: () => base44.entities.Themenfeld.list() });
  const { data: aktivitaeten = [] } = useQuery({ queryKey: ['lernpaketPhaseAktivitaeten'], queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list() });
  const { data: aktivitaetenKatalog = [] } = useQuery({ queryKey: ['aktivitaetenKatalog'], queryFn: () => base44.entities.AktivitaetenKatalog.list() });
  const { data: masterAufgaben = [] } = useQuery({ queryKey: ['masterAufgaben'], queryFn: () => base44.entities.MasterAufgabe.list() });
  const { data: aufgabenbausteine = [] } = useQuery({ queryKey: ['aufgabenbausteine'], queryFn: () => base44.entities.Aufgabenbausteine.list() });
  const { data: allgemeineAufgaben = [] } = useQuery({ queryKey: ['allgemeineAufgaben'], queryFn: () => base44.entities.AllgemeineAufgabe.list() });
  const { data: projektaufgaben = [] } = useQuery({ queryKey: ['projektaufgaben'], queryFn: () => base44.entities.AllgemeineAufgabe.filter({ anforderungsebene: '3 - Projekt' }) });

  const updateSlot = (slotId, updates) => {
    setSlots((prev) => {
      const newSlots = prev.map((s) => (s.id === slotId ? { ...s, ...updates } : s));
      const lastSlot = newSlots[newSlots.length - 1];
      if (lastSlot && lastSlot.unitId && !newSlots.find((s) => !s.unitId)) {
        newSlots.push({ id: nextSlotId + 1, unitId: null, isCollapsed: false });
        setNextSlotId(nextSlotId + 2);
      }
      return newSlots;
    });
  };

  const removeSlot = (slotId) => {
    setSlots((prev) => {
      const filtered = prev.filter((s) => s.id !== slotId);
      return filtered.length === 0 ? [{ id: Date.now(), unitId: null, isCollapsed: false }] : filtered;
    });
  };

  const selectedEinheitIds = slots.map((s) => s.unitId).filter(Boolean);

  const exportMutation = useMutation({
    mutationFn: async () => {
      for (const id of globalSelectedIds) {
        try {
          // Versuche als Aufgabenbaustein
          const isAufgabenbaustein = aufgabenbausteine.some(a => a.id === id);
          const isMasterAufgabe = masterAufgaben.some(m => m.id === id);
          const isAllgemeineAufgabe = allgemeineAufgaben.some(a => a.id === id);

          if (isAufgabenbaustein) {
            await base44.entities.Aufgabenbausteine.update(id, { sync_status: 'pending' });
          } else if (isMasterAufgabe) {
            await base44.entities.MasterAufgabe.update(id, { sync_status: 'pending' });
          } else if (isAllgemeineAufgabe) {
            await base44.entities.AllgemeineAufgabe.update(id, { sync_status: 'pending' });
          }
        } catch (err) {
          console.error(`Fehler beim Aktualisieren von ${id}`, err);
        }
      }
      return globalSelectedIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setGlobalSelectedIds([]);
      toast.success(`${count} Aufgaben an das Export-Zentrum übergeben.`);
    },
    onError: () => toast.error('Fehler bei der Übergabe.'),
  });

  return (
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Freigabe-Cockpit</h2>
          <p className="text-muted-foreground mt-2">
            Vergleiche Einheiten und markiere fertige Aufgaben zur Übergabe an das Moodle-Export-Team.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
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
              aktivitaeten={aktivitaeten.filter(a => a.sync_status !== 'to_delete')}
              aktivitaetenKatalog={aktivitaetenKatalog}
              masterAufgaben={masterAufgaben.filter(m => m.sync_status !== 'to_delete')}
              aufgabenbausteine={aufgabenbausteine.filter(a => a.sync_status !== 'to_delete')}
              allgemeineAufgaben={allgemeineAufgaben.filter(a => a.sync_status !== 'to_delete')}
              projektaufgaben={projektaufgaben.filter(p => p.sync_status !== 'to_delete')}
              exportMutation={exportMutation}
            />
          ))}
        </div>
      </div>
    </div>
  );
}