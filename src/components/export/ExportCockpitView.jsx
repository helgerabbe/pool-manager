/**
 * ExportCockpitView.jsx
 *
 * Freigabe-Cockpit für Moodle-Export.
 *
 * Export-Anker ist die AKTIVITÄT (LernpaketPhaseAktivitaet):
 * - Selektierbar wenn content_status = 'approved' und sync_status != 'pending'
 * - Einzelne Aufgaben/Master/Klone erscheinen NICHT im Cockpit
 * - Struktur: Einheit → Themenfeld (Label) → Lernpaket (Checkbox) → Aktivität (Checkbox)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, ChevronDown, ChevronRight, Trash2, CheckCircle2, Clock, AlertCircle, ShieldCheck, Info, Pencil, Upload, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Status-Badge für eine Aktivität ─────────────────────────────────────────

function AktivitaetStatusBadge({ activity }) {
  if (activity.sync_status === 'error') {
    return <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs"><AlertCircle className="w-3 h-3 mr-1" />Fehler</Badge>;
  }
  if (activity.sync_status === 'pending') {
    return <Badge className="bg-purple-100 text-purple-800 border border-purple-300 text-xs"><Clock className="w-3 h-3 mr-1" />Übergeben</Badge>;
  }
  if (activity.sync_status === 'synced') {
    return <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs"><CheckCircle2 className="w-3 h-3 mr-1" />Synced</Badge>;
  }
  if (activity.sync_status === 'modified') {
    return <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-xs">⚠️ Verändert</Badge>;
  }
  if (activity.content_status === 'approved') {
    return <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs">🟢 Freigegeben</Badge>;
  }
  return <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs">🔴 Nicht freigegeben</Badge>;
}

// ── Undo-Button für "Übergeben"-Status ──────────────────────────────────────

function UndoButton({ activityId, entityType = 'activity' }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleUndo = async () => {
    setLoading(true);
    if (entityType === 'allgemein') {
      await base44.entities.AllgemeineAufgabe.update(activityId, { sync_status: 'modified' });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
    } else {
      await base44.entities.LernpaketPhaseAktivitaet.update(activityId, { sync_status: 'modified' });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    }
    toast.success('Übergabe zurückgesetzt.');
    setLoading(false);
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleUndo} disabled={loading}
      className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0" title="Übergabe zurücksetzen">
      <RotateCcw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
    </Button>
  );
}

// ── Einzel-Cockpit-Slot ──────────────────────────────────────────────────────

function CockpitSlot({ slotId, slot, updateSlot, removeSlot, selectedEinheitIds, selectedIds, setSelectedIds,
  einheiten, lernpakete, themenfelder, aktivitaeten, aktivitaetenKatalog, allgemeineAufgaben, exportMutation, onNavigateToActivity, onNavigateToTask }) {

  const { unitId, isCollapsed } = slot;
  const availableEinheiten = einheiten.filter(e => !selectedEinheitIds.includes(e.id) || e.id === unitId);

  // Auto-Select: Wenn unitId gesetzt wird, alle approved+nicht-pending+nicht-synced selektieren
  useEffect(() => {
    if (!unitId) return;
    const allItems = [
      ...aktivitaeten.filter(a => {
        const paket = lernpakete.find(lp => lp.id === a.lernpaket_id);
        return paket && (paket.themenfeld_id
          ? themenfelder.find(tf => tf.id === paket.themenfeld_id)?.einheit_id === unitId
          : paket.einheit_id === unitId);
      }),
      ...allgemeineAufgaben.filter(a => a.einheit_id === unitId),
    ];
    const autoSelect = allItems
      .filter(a => a.content_status === 'approved' && a.sync_status !== 'pending' && a.sync_status !== 'synced')
      .map(a => a.id);
    if (autoSelect.length > 0) {
      setSelectedIds(prev => [...new Set([...prev, ...autoSelect])]);
    }
  }, [unitId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle-Logik für Checkboxen
  const toggleActivities = useCallback((activityArray) => {
    const exportable = activityArray.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending' && a.sync_status !== 'synced');
    if (exportable.length === 0) return;
    const ids = exportable.map(a => a.id);
    const allSelected = ids.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...ids])]);
    }
  }, [selectedIds, setSelectedIds]);

  const renderHierarchy = () => {
    if (!unitId) return null;

    const rows = themenfelder
      .filter(tf => tf.einheit_id === unitId)
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map(tf => {
        const tfPakete = lernpakete
          .filter(lp => lp.themenfeld_id === tf.id)
          .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));
        
        // Allgemeine Aufgaben (Ebene 1/2) für dieses Themenfeld
        const tfAufgaben = allgemeineAufgaben.filter(
          a => a.themenfeld_id === tf.id && a.anforderungsebene !== '3 - Projekt' && a.sync_status !== 'to_delete'
        );

        return (
          <div key={tf.id} className="space-y-2">
            {/* Themenfeld – nur Label */}
            <div className="px-2 py-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{tf.titel}</span>
            </div>

            {/* Lernpakete & Allgemeine Aufgaben auf gleicher Ebene */}
            <div className="pl-3 space-y-2 border-l-2 border-muted">
              {tfPakete.map(paket => {
                const paketAktivitaeten = aktivitaeten.filter(a => a.lernpaket_id === paket.id);
                const exportable = paketAktivitaeten.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
                const selectedCount = exportable.filter(a => selectedIds.includes(a.id)).length;
                const allSelected = exportable.length > 0 && selectedCount === exportable.length;

                return (
                  <div key={paket.id} className="space-y-1">
                    {/* Lernpaket-Zeile mit Batch-Checkbox */}
                    <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={() => toggleActivities(paketAktivitaeten)}
                        disabled={exportable.length === 0}
                        className="h-4 w-4"
                      />
                      <span className="text-sm font-semibold flex-1 truncate">{paket.titel_des_pakets}</span>
                      {exportable.length > 0 && (
                        <span className="text-xs text-muted-foreground">{selectedCount}/{exportable.length}</span>
                      )}
                      {exportable.length === 0 && paketAktivitaeten.length > 0 && (
                        <Badge className="text-[10px] bg-red-50 text-red-700 border-red-200">
                          <AlertCircle className="w-3 h-3 mr-1" />Nicht freigegeben
                        </Badge>
                      )}
                    </div>

                    {/* Aktivitäten – die eigentlichen Export-Anker */}
                    <div className="pl-5 space-y-1 border-l border-muted/50">
                      {paketAktivitaeten.length === 0 ? (
                        <p className="text-[11px] text-muted-foreground/50 italic px-2 py-1">Keine Aktivitäten</p>
                      ) : (
                        paketAktivitaeten
                          .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
                          .map(act => {
                            const actName = aktivitaetenKatalog.find(k => k.id === act.aktivitaet_id)?.name || 'Aktivität';
                            const isSelected = selectedIds.includes(act.id);
                            const isPending = act.sync_status === 'pending';
                            const isSynced = act.sync_status === 'synced';
                            const isApproved = act.content_status === 'approved';
                            const isSelectable = isApproved && !isPending && !isSynced;

                            return (
                              <div key={act.id} className={cn(
                                'flex items-center gap-2 p-1.5 rounded transition',
                                isSelectable ? 'hover:bg-muted/20' : 'opacity-60'
                              )}>
                                <Checkbox
                                   checked={isSelected}
                                   onCheckedChange={() => toggleActivities([act])}
                                   disabled={!isSelectable}
                                   className="h-4 w-4 shrink-0"
                                 />
                                 <button
                                    onClick={() => {
                                      onNavigateToActivity?.(act.id, paket.id);
                                    }}
                                    className={cn(
                                      'text-xs flex-1 truncate text-left transition',
                                      isApproved ? 'text-primary hover:underline' : 'text-muted-foreground'
                                    )}
                                  >
                                   {act.phase === 'Input' ? '📚' : act.phase === 'Übung' ? '✏️' : '🎯'} {actName}
                                 </button>
                                {isPending && <UndoButton activityId={act.id} />}
                                <AktivitaetStatusBadge activity={act} />
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Allgemeine Aufgaben (Ebene 1/2) auf gleicher Ebene wie Lernpakete */}
              {tfAufgaben.length > 0 && (
                <div className="space-y-1">
                  {/* Allgemeine Aufgaben - Batch-Checkbox */}
                  {(() => {
                    const exportable = tfAufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
                    const selectedCount = exportable.filter(a => selectedIds.includes(a.id)).length;
                    const allSelected = exportable.length > 0 && selectedCount === exportable.length;
                    return (
                      <>
                        <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition">
                          <Checkbox
                            checked={allSelected}
                            onCheckedChange={() => toggleActivities(tfAufgaben)}
                            disabled={exportable.length === 0}
                            className="h-4 w-4"
                          />
                          <span className="text-sm font-semibold flex-1">Allgemeine Aufgaben (Ebene 1/2)</span>
                          {exportable.length > 0 && <span className="text-xs text-muted-foreground">{selectedCount}/{exportable.length}</span>}
                          {exportable.length === 0 && tfAufgaben.length > 0 && (
                            <Badge className="text-[10px] bg-red-50 text-red-700 border-red-200">
                              <AlertCircle className="w-3 h-3 mr-1" />Nicht freigegeben
                            </Badge>
                          )}
                        </div>
                        
                        {/* Aufgaben-Zeilen */}
                        <div className="pl-5 space-y-1 border-l border-muted/50">
                          {tfAufgaben.map(aufgabe => {
                            const isSelected = selectedIds.includes(aufgabe.id);
                            const isPending = aufgabe.sync_status === 'pending';
                            const isApproved = aufgabe.content_status === 'approved';
                            const isSelectable = isApproved && !isPending;
                            return (
                              <div key={aufgabe.id} className={cn('flex items-center gap-2 p-1.5 rounded transition', isSelectable ? 'hover:bg-muted/20' : 'opacity-60')}>
                                <Checkbox checked={isSelected} onCheckedChange={() => toggleActivities([aufgabe])} disabled={!isSelectable} className="h-4 w-4 shrink-0" />
                                <button
                                  onClick={() => onNavigateToTask?.('ebene12', aufgabe.id)}
                                  className={cn('text-xs flex-1 truncate text-left transition', isApproved ? 'text-primary hover:underline' : 'text-muted-foreground')}
                                >
                                  📝 {aufgabe.titel || 'Aufgabe ohne Titel'}
                                  {aufgabe.anforderungsebene && <span className="ml-1 text-muted-foreground">({aufgabe.anforderungsebene})</span>}
                                </button>
                                {isPending && <UndoButton activityId={aufgabe.id} entityType="allgemein" />}
                                <AktivitaetStatusBadge activity={aufgabe} />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {tfPakete.length === 0 && tfAufgaben.length === 0 && (
                <p className="text-[11px] text-muted-foreground/50 italic px-2 py-1">Keine Inhalte</p>
              )}
            </div>

            <Separator className="my-2" />
          </div>
        );
      });

      // Projektaufgaben (Ebene 3) direkt auf Einheitsebene (kein Themenfeld nötig)
      const projektaufgaben = allgemeineAufgaben.filter(
        a => a.einheit_id === unitId && a.anforderungsebene === '3 - Projekt' && a.sync_status !== 'to_delete'
      );
      if (projektaufgaben.length > 0) {
        const exportable = projektaufgaben.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
        const selectedCount = exportable.filter(a => selectedIds.includes(a.id)).length;
        const allSelected = exportable.length > 0 && selectedCount === exportable.length;
        rows.push(
          <div key="_projektaufgaben" className="space-y-2">
            <div className="px-2 py-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Projekt- & Anwendungsaufgaben (Ebene 3)</span>
            </div>
            <div className="pl-3 space-y-1 border-l-2 border-muted">
              <div className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/30 transition">
                <Checkbox checked={allSelected} onCheckedChange={() => toggleActivities(projektaufgaben)} disabled={exportable.length === 0} className="h-4 w-4" />
                <span className="text-sm font-semibold flex-1">Alle Projektaufgaben</span>
                {exportable.length > 0 && <span className="text-xs text-muted-foreground">{selectedCount}/{exportable.length}</span>}
              </div>
              <div className="pl-5 space-y-1 border-l border-muted/50">
                {projektaufgaben.map(aufgabe => {
                  const isSelected = selectedIds.includes(aufgabe.id);
                  const isPending = aufgabe.sync_status === 'pending';
                  const isApproved = aufgabe.content_status === 'approved';
                  return (
                    <div key={aufgabe.id} className={cn('flex items-center gap-2 p-1.5 rounded transition', isApproved ? 'hover:bg-muted/20' : 'opacity-60')}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleActivities([aufgabe])} disabled={!isApproved || isPending} className="h-4 w-4 shrink-0" />
                      <button
                        onClick={() => onNavigateToTask?.('ebene3', aufgabe.id)}
                        className={cn('text-xs flex-1 truncate text-left transition', isApproved ? 'text-primary hover:underline' : 'text-muted-foreground')}
                      >
                        🎯 {aufgabe.titel || 'Projektaufgabe ohne Titel'}
                        {aufgabe.aufgabentyp_projekt && <span className="ml-1 text-muted-foreground">({aufgabe.aufgabentyp_projekt})</span>}
                      </button>
                      {isPending && <UndoButton activityId={aufgabe.id} entityType="allgemein" />}
                      <AktivitaetStatusBadge activity={aufgabe} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      }
      return rows;
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
              {availableEinheiten.map(e => (
                <SelectItem key={e.id} value={e.id} className="text-sm">
                  {e.titel_der_einheit}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!unitId ? (
            <div className="flex items-center justify-center text-center py-10 text-muted-foreground text-sm">
              Bitte wähle eine Einheit, um die Struktur zu laden.
            </div>
          ) : (
            <>
              <div className="space-y-2 pt-2">
                {renderHierarchy()}
              </div>

              <div className="pt-4 mt-2 border-t">
                <Button
                  onClick={() => exportMutation.mutate()}
                  disabled={selectedIds.length === 0 || exportMutation.isPending}
                  className="w-full font-semibold"
                >
                  {exportMutation.isPending
                    ? 'Wird übergeben...'
                    : `🚀 ${selectedIds.length} Aktivität${selectedIds.length !== 1 ? 'en' : ''} übergeben`}
                </Button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// ── Bestätigungs-Dialog nach Export ─────────────────────────────────────────

function ExportConfirmDialog({ pendingItems, einheitId, onConfirmed, onCancel }) {
  const queryClient = useQueryClient();
  const [checkedIds, setCheckedIds] = useState(new Set(pendingItems.map(i => i.id)));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleId = (id) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    const successfulIds = pendingItems.filter(i => checkedIds.has(i.id)).map(i => i.id);
    const failedIds = pendingItems.filter(i => !checkedIds.has(i.id)).map(i => i.id);
    await base44.functions.invoke('confirmExportCompletion', { einheit_id: einheitId, successfulIds, failedIds });
    setIsSubmitting(false);
    onConfirmed();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-xl border shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="p-5 border-b">
          <h3 className="font-semibold text-base">Export bestätigen</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Welche Elemente wurden erfolgreich nach Moodle übertragen?
            Abgewählte Elemente werden als <strong>Fehler</strong> markiert und können beim nächsten Mal erneut versucht werden.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {pendingItems.map(item => (
            <div key={item.id} className={cn('flex items-center gap-3 p-2.5 rounded-lg border transition', checkedIds.has(item.id) ? 'border-green-200 bg-green-50/40' : 'border-red-200 bg-red-50/40')}>
              <Checkbox checked={checkedIds.has(item.id)} onCheckedChange={() => toggleId(item.id)} className="h-4 w-4 shrink-0" />
              <span className="text-sm flex-1 truncate">{item.label}</span>
              <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', checkedIds.has(item.id) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
                {checkedIds.has(item.id) ? '✓ Erfolgreich' : '✗ Fehler'}
              </span>
            </div>
          ))}
        </div>
        <div className="p-4 border-t flex gap-2 justify-end">
          <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>Abbrechen</Button>
          <Button onClick={handleConfirm} disabled={isSubmitting} className="gap-2">
            {isSubmitting
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Speichern…</>
              : <><CheckCircle2 className="w-4 h-4" />Bestätigen ({checkedIds.size}/{pendingItems.length})</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────

export default function ExportCockpitView({ initialEinheitId = null, onNavigateToActivity: onNavCallback = null, onNavigateToTask = null }) {
  const queryClient = useQueryClient();
  const { permissions } = useRBAC();
  const navigate = useNavigate();
  const [confirmDialog, setConfirmDialog] = useState(null); // { einheitId, items }
  const [slots, setSlots] = useState([{ id: 1, unitId: initialEinheitId, isCollapsed: false }]);
  const [nextSlotId, setNextSlotId] = useState(2);
  const [globalSelectedIds, setGlobalSelectedIds] = useState([]);

  const onNavigateToActivity = (activityId, paketId) => {
    // Zuerst den Callback aufrufen falls vorhanden
    if (onNavCallback) {
      onNavCallback(activityId, paketId);
    } else {
      // Sonst direkt navigieren mit Activity-ID in der URL
      navigate(`/workspace?einheit=${initialEinheitId}&aufgaben=true&activity=${activityId}`);
    }
  };
  
  const { data: einheiten = [] } = useQuery({ queryKey: ['einheiten'], queryFn: () => base44.entities.Einheiten.list() });
  const { data: lernpakete = [] } = useQuery({ queryKey: ['lernpakete'], queryFn: () => base44.entities.Lernpakete.list() });
  const { data: themenfelder = [] } = useQuery({ queryKey: ['themenfelder'], queryFn: () => base44.entities.Themenfeld.list() });
  const { data: aktivitaeten = [] } = useQuery({ queryKey: ['lernpaketPhaseAktivitaeten'], queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list() });
  const { data: aktivitaetenKatalog = [] } = useQuery({ queryKey: ['aktivitaetenKatalog'], queryFn: () => base44.entities.AktivitaetenKatalog.list() });
  const { data: allgemeineAufgaben = [] } = useQuery({ queryKey: ['allgemeineAufgaben'], queryFn: () => base44.entities.AllgemeineAufgabe.list() });

  const updateSlot = (slotId, updates) => {
    setSlots(prev => {
      const newSlots = prev.map(s => s.id === slotId ? { ...s, ...updates } : s);
      const lastSlot = newSlots[newSlots.length - 1];
      if (lastSlot?.unitId && !newSlots.find(s => !s.unitId)) {
        newSlots.push({ id: nextSlotId + 1, unitId: null, isCollapsed: false });
        setNextSlotId(n => n + 2);
      }
      return newSlots;
    });
  };

  const removeSlot = (slotId) => {
    setSlots(prev => {
      const filtered = prev.filter(s => s.id !== slotId);
      return filtered.length === 0 ? [{ id: Date.now(), unitId: null, isCollapsed: false }] : filtered;
    });
  };

  const selectedEinheitIds = slots.map(s => s.unitId).filter(Boolean);

  // Export: setzt sync_status='pending' + öffnet Bestätigungsdialog
  const exportMutation = useMutation({
    mutationFn: async () => {
      const allgemeineIds = new Set(allgemeineAufgaben.map(a => a.id));
      const items = [];
      for (const id of globalSelectedIds) {
        if (allgemeineIds.has(id)) {
          const aufgabe = allgemeineAufgaben.find(a => a.id === id);
          await base44.entities.AllgemeineAufgabe.update(id, { sync_status: 'pending' });
          items.push({ id, label: aufgabe?.titel || 'Aufgabe ohne Titel' });
        } else {
          const akt = aktivitaeten.find(a => a.id === id);
          const katalogName = aktivitaetenKatalog.find(k => k.id === akt?.aktivitaet_id)?.name || 'Aktivität';
          await base44.entities.LernpaketPhaseAktivitaet.update(id, { sync_status: 'pending' });
          items.push({ id, label: `${akt?.phase || ''}: ${katalogName}` });
        }
      }
      return { count: globalSelectedIds.length, items };
    },
    onSuccess: ({ count, items }) => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setGlobalSelectedIds([]);
      toast.success(`${count} Element${count !== 1 ? 'e' : ''} übergeben. Bitte jetzt bestätigen.`);
      const einheitId = slots.find(s => s.unitId)?.unitId;
      if (einheitId) setConfirmDialog({ einheitId, items });
    },
    onError: () => toast.error('Fehler bei der Übergabe.'),
  });

  // Permission check (nach allen Hooks)
  if (!permissions.kannExportBedienen) {
    return (
      <div className="min-h-screen bg-muted/20 p-6 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Kein Zugriff. Nur Moodle-Designer dürfen den Export bedienen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Freigabe-Cockpit</h2>
          <p className="text-muted-foreground mt-2">
            Wähle freigegebene Aktivitäten zur Übergabe an das Moodle-Export-Team.
          </p>
        </div>

        {/* Workflow-Info */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Status-Workflow im Überblick</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {[
              { icon: <Pencil className="w-3.5 h-3.5" />, color: 'text-muted-foreground bg-muted/50 border-border', label: 'Entwurf', desc: 'Wird von der Lehrkraft bearbeitet. Nicht im Export sichtbar.' },
              { icon: <Upload className="w-3.5 h-3.5" />, color: 'text-blue-700 bg-blue-50 border-blue-200', label: 'Freigegeben', desc: 'Fertig und wartet auf den Export.' },
              { icon: <Clock className="w-3.5 h-3.5" />, color: 'text-orange-700 bg-orange-50 border-orange-200', label: 'Wird exportiert 🔒', desc: 'Export-Team hat Daten gezogen. Für Lehrkräfte schreibgeschützt.' },
              { icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'text-green-700 bg-green-50 border-green-200', label: 'In Moodle', desc: 'Export war erfolgreich. Die aktuelle Version ist live.' },
              { icon: <AlertCircle className="w-3.5 h-3.5" />, color: 'text-red-700 bg-red-50 border-red-200', label: 'Export-Fehler', desc: 'Upload fehlgeschlagen. Sperre aufgehoben – bitte reparieren und neu freigeben.' },
              { icon: <RefreshCw className="w-3.5 h-3.5" />, color: 'text-purple-700 bg-purple-50 border-purple-200', label: 'Geändert (Nicht live)', desc: 'Bereits exportiert, aber nachträglich bearbeitet. Neu freigeben für Moodle.' },
            ].map(({ icon, color, label, desc }) => (
              <div key={label} className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${color}`}>
                <div className="mt-0.5 shrink-0">{icon}</div>
                <div>
                  <p className="text-xs font-semibold">{label}</p>
                  <p className="text-xs opacity-75 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          {slots.map(slot => (
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
              allgemeineAufgaben={allgemeineAufgaben}
              exportMutation={exportMutation}
              onNavigateToActivity={onNavigateToActivity}
              onNavigateToTask={onNavigateToTask}
            />
          ))}
        </div>
      </div>

      {/* Bestätigungs-Dialog nach Export */}
      {confirmDialog && (
        <ExportConfirmDialog
          pendingItems={confirmDialog.items}
          einheitId={confirmDialog.einheitId}
          onConfirmed={() => {
            queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
            queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
            setConfirmDialog(null);
            toast.success('Export bestätigt und Status aktualisiert.');
          }}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}