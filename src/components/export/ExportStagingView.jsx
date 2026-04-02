/**
 * ExportStagingView.jsx
 *
 * Staging-Area für Moodle-Export mit Cherry-Picking.
 * - Filtert Tasks mit sync_status: approved, modified, to_delete, error
 * - Tabelle mit Checkbox-Auswahl, Status-Badge, Aufgabentitel, Breadcrumb-Ort
 * - Action Bar mit "Einplanen" und "Fast-Track" Buttons
 * - Empty State wenn keine Abweichungen
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, Zap, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';
import { TASK_STATUS_CONFIG } from '@/lib/stateMachine';

const EXPORT_STATUSES = ['approved', 'modified', 'to_delete', 'error'];

function getStatusBadge(syncStatus) {
  const config = TASK_STATUS_CONFIG[syncStatus];
  if (!config) return null;

  const variantMap = {
    approved: 'default',
    modified: 'secondary',
    to_delete: 'destructive',
    error: 'destructive',
  };

  return (
    <Badge variant={variantMap[syncStatus] || 'outline'} className={config.color}>
      {config.label}
    </Badge>
  );
}

function getBreadcrumb(task, lernpakete, themenfelder) {
  // Versuche, den Ort der Aufgabe zu ermitteln
  if (task.lernpaket_id) {
    const pkg = lernpakete.find(p => p.id === task.lernpaket_id);
    if (pkg && pkg.themenfeld_id) {
      const thema = themenfelder.find(t => t.id === pkg.themenfeld_id);
      return thema ? `${thema.titel} > ${pkg.titel_des_pakets}` : pkg.titel_des_pakets;
    }
    return pkg?.titel_des_pakets || '—';
  }
  return '—';
}

export default function ExportStagingView({ einheitId }) {
  const queryClient = useQueryClient();
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [showFastTrackDialog, setShowFastTrackDialog] = useState(false);

  // Lade Tasks, Lernpakete, Themenfelder
  const { data: aufgabenbausteine = [] } = useQuery({
    queryKey: ['aufgabenbausteine', einheitId],
    queryFn: () => base44.entities.Aufgabenbausteine.filter({ lernpaket_id: { $exists: true } }),
  });

  const { data: lernpaketPhaseAktivitaeten = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten', einheitId],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
  });

  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben', einheitId],
    queryFn: () => base44.entities.MasterAufgabe.list(),
  });

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
  });

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheitId],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheitId }),
  });

  // Kombiniere alle exportierbaren Tasks
  const allTasks = useMemo(() => {
    const tasks = [
      ...aufgabenbausteine.map(t => ({ ...t, type: 'aufgabenbaustein', title: t.aufgabentext_inhalt?.substring(0, 50) || 'Aufgabe' })),
      ...lernpaketPhaseAktivitaeten.map(a => ({ ...a, type: 'aktivitaet', title: a.field_values?.instruction || a.aktivitaet_id })),
      ...masterAufgaben.map(m => ({ ...m, type: 'master_aufgabe', title: m.titel || `Master ${m.id.substring(0, 8)}` })),
    ];
    return tasks;
  }, [aufgabenbausteine, lernpaketPhaseAktivitaeten, masterAufgaben]);

  // Filtere: Nur Tasks mit export-relevanten Status
  const filteredTasks = useMemo(() => {
    return allTasks.filter(t => EXPORT_STATUSES.includes(t.sync_status));
  }, [allTasks]);

  // Bulk-Mutation: "Einplanen"
  const scheduleExportMutation = useMutation({
    mutationFn: async (taskIds) => {
      const updates = taskIds.map(id => ({
        entity: allTasks.find(t => t.id === id)?.type || 'aufgabenbaustein',
        id,
        data: { sync_status: 'pending_export' },
      }));

      for (const update of updates) {
        if (update.entity === 'aufgabenbaustein') {
          await base44.entities.Aufgabenbausteine.update(update.id, update.data);
        } else if (update.entity === 'aktivitaet') {
          await base44.entities.LernpaketPhaseAktivitaet.update(update.id, update.data);
        } else if (update.entity === 'master_aufgabe') {
          await base44.entities.MasterAufgabe.update(update.id, update.data);
        }
      }
      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      setSelectedTaskIds([]);
      toast.success(`${count} Aufgabe(n) für Nacht-Export eingeplant.`);
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Einplanen.'),
  });

  // Bulk-Mutation: "Fast-Track" (sofort synchronisieren)
  const fastTrackMutation = useMutation({
    mutationFn: async (taskIds) => {
      const updates = taskIds.map(id => ({
        entity: allTasks.find(t => t.id === id)?.type || 'aufgabenbaustein',
        id,
        data: { sync_status: 'exported', last_synced_at: new Date().toISOString() },
      }));

      for (const update of updates) {
        if (update.entity === 'aufgabenbaustein') {
          await base44.entities.Aufgabenbausteine.update(update.id, update.data);
        } else if (update.entity === 'aktivitaet') {
          await base44.entities.LernpaketPhaseAktivitaet.update(update.id, update.data);
        } else if (update.entity === 'master_aufgabe') {
          await base44.entities.MasterAufgabe.update(update.id, update.data);
        }
      }
      return updates.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      setSelectedTaskIds([]);
      setShowFastTrackDialog(false);
      toast.success(`${count} Aufgabe(n) sofort synchronisiert.`);
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Fast-Track.'),
  });

  // Toggle einzelne Auswahl
  const toggleTaskId = (id) => {
    setSelectedTaskIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // "Alle auswählen" Toggle
  const toggleAllTaskIds = () => {
    if (selectedTaskIds.length === filteredTasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(filteredTasks.map(t => t.id));
    }
  };

  // Empty State
  if (filteredTasks.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Alle Inhalte synchronisiert"
        description="Alle Inhalte sind aktuell mit Moodle synchronisiert. Es stehen keine Exporte an."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-border bg-card">
        <div className="text-sm text-muted-foreground">
          <strong>{selectedTaskIds.length}</strong> von <strong>{filteredTasks.length}</strong> Aufgabe(n) ausgewählt
        </div>
        <div className="flex gap-2 ml-auto">
          <Button
            variant="outline"
            onClick={() => scheduleExportMutation.mutate(selectedTaskIds)}
            disabled={selectedTaskIds.length === 0 || scheduleExportMutation.isPending}
            className="gap-2"
          >
            {scheduleExportMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Für Nacht-Export einplanen
          </Button>
          <Button
            onClick={() => setShowFastTrackDialog(true)}
            disabled={selectedTaskIds.length === 0}
            className="gap-2"
          >
            <Zap className="w-4 h-4" />
            Fast-Track: Sofort synchronisieren
          </Button>
        </div>
      </div>

      {/* Tabelle */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedTaskIds.length === filteredTasks.length && filteredTasks.length > 0}
                  indeterminate={selectedTaskIds.length > 0 && selectedTaskIds.length < filteredTasks.length}
                  onCheckedChange={toggleAllTaskIds}
                />
              </TableHead>
              <TableHead className="w-32">Status</TableHead>
              <TableHead>Aufgabe</TableHead>
              <TableHead className="w-48">Ort</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.map(task => (
              <TableRow key={task.id} className={task.sync_status === 'error' ? 'bg-red-50' : ''}>
                <TableCell>
                  <Checkbox
                    checked={selectedTaskIds.includes(task.id)}
                    onCheckedChange={() => toggleTaskId(task.id)}
                  />
                </TableCell>
                <TableCell>
                  {task.sync_status === 'error' ? (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-600" />
                      {getStatusBadge(task.sync_status)}
                    </div>
                  ) : (
                    getStatusBadge(task.sync_status)
                  )}
                </TableCell>
                <TableCell className="text-sm font-medium truncate max-w-xs" title={task.title}>
                  {task.title}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {getBreadcrumb(task, lernpakete, themenfelder)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Fast-Track Dialog */}
      <AlertDialog open={showFastTrackDialog} onOpenChange={setShowFastTrackDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              Fast-Track Synchronisierung
            </AlertDialogTitle>
            <AlertDialogDescription>
              Dies synchronisiert <strong>{selectedTaskIds.length}</strong> Aufgabe(n) sofort mit Moodle und markiert sie als "exportiert".
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Verwende Fast-Track nur für dringende Änderungen. Der Nacht-Export ist normalerweise ausreichend und weniger fehleranfällig.
            </span>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fastTrackMutation.mutate(selectedTaskIds)}
              disabled={fastTrackMutation.isPending}
              className="gap-2 bg-orange-600 hover:bg-orange-700"
            >
              {fastTrackMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Jetzt synchronisieren
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}