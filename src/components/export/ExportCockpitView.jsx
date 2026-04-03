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

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RotateCcw, ChevronDown, ChevronRight, Trash2, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Status-Badge für eine Aktivität ─────────────────────────────────────────

function AktivitaetStatusBadge({ activity }) {
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

function UndoButton({ activityId }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const handleUndo = async () => {
    setLoading(true);
    await base44.entities.LernpaketPhaseAktivitaet.update(activityId, { sync_status: 'modified' });
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
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
  einheiten, lernpakete, themenfelder, aktivitaeten, aktivitaetenKatalog, exportMutation }) {

  const { unitId, isCollapsed } = slot;
  const availableEinheiten = einheiten.filter(e => !selectedEinheitIds.includes(e.id) || e.id === unitId);

  // Toggle-Logik für Checkboxen
  const toggleActivities = useCallback((activityArray) => {
    const exportable = activityArray.filter(a => a.content_status === 'approved' && a.sync_status !== 'pending');
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

    return themenfelder
      .filter(tf => tf.einheit_id === unitId)
      .sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0))
      .map(tf => {
        const tfPakete = lernpakete
          .filter(lp => lp.themenfeld_id === tf.id)
          .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

        return (
          <div key={tf.id} className="space-y-2">
            {/* Themenfeld – nur Label */}
            <div className="px-2 py-1">
              <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{tf.titel}</span>
            </div>

            {/* Lernpakete */}
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
                            const isApproved = act.content_status === 'approved';
                            const isSelectable = isApproved && !isPending;

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
                                <span className={cn(
                                  'text-xs flex-1 truncate',
                                  isApproved ? 'text-foreground' : 'text-muted-foreground'
                                )}>
                                  {act.phase === 'Input' ? '📚' : act.phase === 'Übung' ? '✏️' : '🎯'} {actName}
                                </span>
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

              {tfPakete.length === 0 && (
                <p className="text-[11px] text-muted-foreground/50 italic px-2 py-1">Keine Lernpakete</p>
              )}
            </div>

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

// ── Main Component ───────────────────────────────────────────────────────────

export default function ExportCockpitView({ initialEinheitId = null }) {
  const queryClient = useQueryClient();
  const [slots, setSlots] = useState([{ id: 1, unitId: initialEinheitId, isCollapsed: false }]);
  const [nextSlotId, setNextSlotId] = useState(2);
  const [globalSelectedIds, setGlobalSelectedIds] = useState([]);

  const { data: einheiten = [] } = useQuery({ queryKey: ['einheiten'], queryFn: () => base44.entities.Einheiten.list() });
  const { data: lernpakete = [] } = useQuery({ queryKey: ['lernpakete'], queryFn: () => base44.entities.Lernpakete.list() });
  const { data: themenfelder = [] } = useQuery({ queryKey: ['themenfelder'], queryFn: () => base44.entities.Themenfeld.list() });
  const { data: aktivitaeten = [] } = useQuery({ queryKey: ['lernpaketPhaseAktivitaeten'], queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list() });
  const { data: aktivitaetenKatalog = [] } = useQuery({ queryKey: ['aktivitaetenKatalog'], queryFn: () => base44.entities.AktivitaetenKatalog.list() });

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

  // Export: setzt sync_status='pending' auf den ausgewählten Aktivitäten
  const exportMutation = useMutation({
    mutationFn: async () => {
      for (const id of globalSelectedIds) {
        await base44.entities.LernpaketPhaseAktivitaet.update(id, { sync_status: 'pending' });
      }
      return globalSelectedIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      setGlobalSelectedIds([]);
      toast.success(`${count} Aktivität${count !== 1 ? 'en' : ''} an das Export-Zentrum übergeben.`);
    },
    onError: () => toast.error('Fehler bei der Übergabe.'),
  });

  return (
    <div className="min-h-screen bg-muted/20 p-6">
      <div className="max-w-screen-2xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Freigabe-Cockpit</h2>
          <p className="text-muted-foreground mt-2">
            Wähle freigegebene Aktivitäten zur Übergabe an das Moodle-Export-Team. Eine Aktivität ist exportierbar, wenn sie vollständig freigegeben ist.
          </p>
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
              exportMutation={exportMutation}
            />
          ))}
        </div>
      </div>
    </div>
  );
}