import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, AlertTriangle, GripVertical, ArrowRight, ArrowUp, ArrowDown, X, Menu, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import DeleteActivityConfirmDialog from '@/components/workspace/DeleteActivityConfirmDialog';

export default function PhaseActivitiesSidebar({
  paket,
  phase,
  phaseLabel,
  kannBearbeiten,
  userEmail,
  inEditMode = false,
  onSelectActivity,
  onGoToTaskWorkshop = null,
  lernziele = [],
  sidebarOpen,
  setSidebarOpen,
}) {
  const queryClient = useQueryClient();
  const [newActivityId, setNewActivityId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }

  const { data: aktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten', paket.id, phase],
    queryFn: () =>
      base44.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: paket.id,
        phase,
        // Tombstones ausblenden — sonst bleibt die Aktivität nach dem
        // Cascade-Delete sichtbar, obwohl sie serverseitig bereits zur
        // Löschung markiert ist.
        sync_status: { $ne: 'to_delete' },
      }),
  });

  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const createAktivitaet = useMutation({
    mutationFn: (aktivitaetId) =>
      base44.entities.LernpaketPhaseAktivitaet.create({
        lernpaket_id: paket.id,
        phase,
        aktivitaet_id: aktivitaetId,
        field_values: {},
        is_complete: false,
        reihenfolge: aktivitaeten.length,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['lernpaketPhaseAktivitaeten'],
      });
      setNewActivityId('');
      toast.success('Aktivität hinzugefügt.');
    },
    onError: () => toast.error('Fehler beim Hinzufügen.'),
  });

  // Reihenfolge ändern: tauscht die Positionen der beiden betroffenen
  // Aktivitäten und nummeriert danach ALLE Aktivitäten dieser Phase neu
  // durch (reihenfolge = 0,1,2,…). So werden auch Legacy-Aktivitäten
  // ohne gesetztes reihenfolge-Feld korrekt geordnet und der Tausch
  // bleibt stabil, auch wenn beide denselben Wert (z.B. 0) hatten.
  const moveAktivitaet = useMutation({
    mutationFn: async ({ current, neighbor, direction }) => {
      // Alle Aktivitäten dieser Phase laden, sortieren
      const all = await base44.entities.LernpaketPhaseAktivitaet.filter({
        lernpaket_id: paket.id,
        phase,
        sync_status: { $ne: 'to_delete' },
      });
      const sorted = [...all].sort((a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0));
      const idx = sorted.findIndex(a => a.id === current.id);
      if (idx === -1) return;

      // Positionen tauschen
      if (direction === 'up' && idx > 0) {
        [sorted[idx - 1], sorted[idx]] = [sorted[idx], sorted[idx - 1]];
      } else if (direction === 'down' && idx < sorted.length - 1) {
        [sorted[idx], sorted[idx + 1]] = [sorted[idx + 1], sorted[idx]];
      }

      // Alle Aktivitäten neu durchnummerieren (reihenfolge = 0,1,2,…)
      const updates = sorted.map((a, i) =>
        base44.entities.LernpaketPhaseAktivitaet.update(a.id, { reihenfolge: i })
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    },
    onError: () => toast.error('Reihenfolge konnte nicht geändert werden.'),
  });

  const deleteAktivitaet = useMutation({
    mutationFn: async (id) => {
      const res = await base44.functions.invoke('deleteActivityWithTombstoneAndCascade', {
        activity_id: id,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      return res?.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      const stats = data?.stats;
      if (stats && (stats.master_deleted || stats.klone_deleted || stats.orphans_logged)) {
        toast.success(
          `Aktivität gelöscht (${stats.master_deleted} Master, ${stats.klone_deleted} Klone, ${stats.orphans_logged} Dateien protokolliert).`
        );
      } else {
        toast.success('Aktivität gelöscht.');
      }
      setDeleteTarget(null);
    },
    onError: (err) => {
      toast.error(err?.message || 'Fehler beim Löschen.');
    },
  });

  // Nur aktive Aktivitäten für die aktuelle Phase aus dem Katalog
  const phaseAktivitaeten = aktivitaetenKatalog.filter(a =>
   a.phase === phase && a.is_active === true
  );

  // Bearbeitungsschutz: Nur wenn Bearbeitungsmodus aktiv ist
  const canEdit = inEditMode && kannBearbeiten;

  return (
    <>
      {/* Burger-Menü Button (lg-breaker) */}
      <div className="lg:hidden shrink-0 px-3 py-3 border-r border-border bg-card/50 h-full flex flex-col items-center justify-start pt-4">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title={sidebarOpen ? 'Menü schließen' : 'Menü öffnen'}
        >
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar Overlay für Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static z-50 w-80 lg:w-full border-r lg:border-none border-border bg-card lg:bg-transparent shrink-0 overflow-hidden h-full lg:h-auto transition-transform lg:transition-none",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="h-full overflow-y-auto min-h-0">
          {/* Mobile Header */}
          <div className="lg:hidden px-3 py-2 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold">{phaseLabel}</p>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-3 lg:p-0 space-y-3">
            {aktivitaeten.length === 0 ? (
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
                <p className="text-sm text-muted-foreground italic">
                  Keine Aktivitäten zugeordnet
                </p>
                {canEdit && (
                  <div className="space-y-2">
                    <Label className="text-xs">Aktivität hinzufügen</Label>
                    <select
                      value={newActivityId}
                      onChange={(e) => {
                        if (e.target.value) {
                          createAktivitaet.mutate(e.target.value);
                        }
                      }}
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-input bg-white"
                    >
                      <option value="">-- Aktivität wählen --</option>
                      {phaseAktivitaeten.map((akt) => (
                        <option key={akt.id} value={akt.id}>
                          {akt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="ml-4 border-l-2 border-primary/30 pl-3 space-y-2">
                {(() => {
                  const sorted = [...aktivitaeten].sort(
                    (a, b) => (a.reihenfolge || 0) - (b.reihenfolge || 0)
                  );
                  return sorted.map((activity, idx) => {
                    const katalog = aktivitaetenKatalog.find(a => a.id === activity.aktivitaet_id);
                    const isFirst = idx === 0;
                    const isLast = idx === sorted.length - 1;
                    const isMoving = moveAktivitaet.isPending;
                    return (
                      <div
                        key={activity.id}
                        className="p-3 rounded-lg bg-white border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />
                              <p className="font-semibold text-sm">{katalog?.name || '…'}</p>
                              {activity.content_status === 'approved' ? (
                                <span title="Aktivität ist freigegeben und gesperrt" className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-300">
                                  <Lock className="w-3 h-3" />
                                  Freigegeben
                                </span>
                              ) : !activity.is_complete && (
                                <span title="Inhalt unvollständig" className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                  <AlertTriangle className="w-3 h-3" />
                                  Unvollständig
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            {canEdit && (
                              <>
                                {/* Reihenfolge: Auf/Ab. Nummeriert alle Aktivitäten
                                    dieser Phase nach dem Tausch neu durch. */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Nach oben verschieben"
                                  disabled={isFirst || isMoving}
                                  onClick={() => moveAktivitaet.mutate({ current: activity, direction: 'up' })}
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  title="Nach unten verschieben"
                                  disabled={isLast || isMoving}
                                  onClick={() => moveAktivitaet.mutate({ current: activity, direction: 'down' })}
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </Button>
                                {onGoToTaskWorkshop && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/5"
                                    onClick={() => onGoToTaskWorkshop(activity.id)}
                                    title="Zu Aufgaben-Werkstatt wechseln"
                                  >
                                    <ArrowRight className="w-3.5 h-3.5" />
                                    Aufgaben
                                  </Button>
                                )}
                                {activity.content_status !== 'approved' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    title="Aktivität löschen"
                                    onClick={() =>
                                      setDeleteTarget({
                                        id: activity.id,
                                        name: katalog?.name || 'Aktivität',
                                      })
                                    }
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}

                {canEdit && (
                  <div className="space-y-2">
                    <Label className="text-xs">Weitere Aktivität hinzufügen</Label>
                    <select
                      value={newActivityId}
                      onChange={(e) => {
                        if (e.target.value) {
                          createAktivitaet.mutate(e.target.value);
                        }
                      }}
                      className="w-full px-2 py-1.5 text-sm rounded-lg border border-input bg-white"
                    >
                      <option value="">-- Aktivität wählen --</option>
                      {phaseAktivitaeten.map((akt) => (
                        <option key={akt.id} value={akt.id}>
                          {akt.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      <DeleteActivityConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={() => deleteTarget && deleteAktivitaet.mutate(deleteTarget.id)}
        isDeleting={deleteAktivitaet.isPending}
        activityName={deleteTarget?.name}
      />
    </>
  );
}