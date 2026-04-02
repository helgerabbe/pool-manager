/**
 * ExportStagingArea.jsx
 *
 * Staging Area (Cherry-Pick) für den manuell gesteuerten Moodle-Export.
 * Zeigt alle Elemente mit Status != 'synced' als Diff-Tabelle.
 * Unterstützt Einzel-/Gesamtauswahl und zwei Export-Aktionen.
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CheckCircle2, Loader2, CalendarClock, Zap, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Hilfsfunktionen ───────────────────────────────────────────────────────────

function statusLabel(status) {
  switch (status) {
    case 'new':       return { label: 'Neu',      color: 'bg-blue-100 text-blue-700 border-blue-200' };
    case 'modified':  return { label: 'Geändert', color: 'bg-amber-100 text-amber-700 border-amber-200' };
    case 'to_delete': return { label: 'Gelöscht', color: 'bg-red-100 text-red-700 border-red-200' };
    default:          return { label: status,     color: 'bg-muted text-muted-foreground border-border' };
  }
}

function StatusDot({ status }) {
  if (status === 'new')       return <span title="Neu" className="text-blue-500">🔵</span>;
  if (status === 'modified')  return <span title="Geändert" className="text-amber-500">🟡</span>;
  if (status === 'to_delete') return <span title="Zu löschen" className="text-red-500">🔴</span>;
  return null;
}

function TypeBadge({ type }) {
  const map = {
    aktivitaet_new:      { label: 'Neue Aktivität',       color: 'bg-blue-50 text-blue-700 border-blue-200' },
    aktivitaet_modified: { label: 'Geänd. Aktivität',     color: 'bg-amber-50 text-amber-700 border-amber-200' },
    aktivitaet_deleted:  { label: 'Gelöschte Aktivität',  color: 'bg-red-50 text-red-700 border-red-200' },
    master_new:          { label: 'Neue Masteraufgabe',   color: 'bg-blue-50 text-blue-700 border-blue-200' },
    master_modified:     { label: 'Geänd. Master',        color: 'bg-amber-50 text-amber-700 border-amber-200' },
    klon_new:            { label: 'Neuer Klon',           color: 'bg-blue-50 text-blue-700 border-blue-200' },
    klon_modified:       { label: 'Geänderter Klon',      color: 'bg-amber-50 text-amber-700 border-amber-200' },
  };
  const cfg = map[type] || { label: type, color: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', cfg.color)}>
      {cfg.label}
    </span>
  );
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────

export default function ExportStagingArea({ einheitId, lernpakete = [], aktivitaetenKatalog = [] }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  // Aktivitäten der Einheit
  const paketIds = lernpakete.filter(lp => lp.einheit_id === einheitId).map(lp => lp.id);

  const { data: alleAktivitaeten = [], isLoading: loadingAkt } = useQuery({
    queryKey: ['lpaAktivitaeten_export', einheitId],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
    enabled: !!einheitId,
  });

  const { data: alleMaster = [], isLoading: loadingMaster } = useQuery({
    queryKey: ['masterAufgaben_export', einheitId],
    queryFn: () => base44.entities.MasterAufgabe.list(),
    enabled: !!einheitId,
  });

  const { data: alleKlone = [], isLoading: loadingKlone } = useQuery({
    queryKey: ['klone_export', einheitId],
    queryFn: () => base44.entities.Aufgabenbausteine.filter({ is_master: false }),
    enabled: !!einheitId,
  });

  const isLoading = loadingAkt || loadingMaster || loadingKlone;

  // Lernpaket-Map für Anzeigenamen
  const paketMap = useMemo(() =>
    Object.fromEntries(lernpakete.map(lp => [lp.id, lp.titel_des_pakets])),
    [lernpakete]
  );
  const katMap = useMemo(() =>
    Object.fromEntries(aktivitaetenKatalog.map(a => [a.id, a.name])),
    [aktivitaetenKatalog]
  );

  // ── Diff-Items bauen ───────────────────────────────────────────────────────

  const diffItems = useMemo(() => {
    const items = [];

    // Aktivitäten
    alleAktivitaeten
      .filter(a => paketIds.includes(a.lernpaket_id))
      .filter(a => ['new', 'modified', 'to_delete'].includes(a.sync_status))
      .forEach(a => {
        const statusSuffix = a.sync_status === 'new' ? 'new' : a.sync_status === 'to_delete' ? 'deleted' : 'modified';
        items.push({
          id: `akt_${a.id}`,
          entityId: a.id,
          entityType: 'LernpaketPhaseAktivitaet',
          type: `aktivitaet_${statusSuffix}`,
          status: a.sync_status,
          name: katMap[a.aktivitaet_id] || 'Unbekannte Aktivität',
          path: paketMap[a.lernpaket_id] || 'Unbekanntes Paket',
          updatedAt: a.updated_date,
        });
      });

    // MasterAufgaben
    alleMaster
      .filter(m => paketIds.includes(m.lernpaket_id))
      .filter(m => ['new', 'modified', 'to_delete'].includes(m.sync_status || 'new'))
      .forEach(m => {
        const s = m.sync_status || 'new';
        items.push({
          id: `master_${m.id}`,
          entityId: m.id,
          entityType: 'MasterAufgabe',
          type: `master_${s === 'to_delete' ? 'modified' : s}`,
          status: s,
          name: m.titel || 'Masteraufgabe',
          path: paketMap[m.lernpaket_id] || 'Unbekanntes Paket',
          updatedAt: m.updated_date,
        });
      });

    // Klone
    alleKlone
      .filter(k => paketIds.includes(k.lernpaket_id))
      .filter(k => ['new', 'modified', 'to_delete'].includes(k.sync_status || 'new'))
      .forEach(k => {
        const s = k.sync_status || 'new';
        items.push({
          id: `klon_${k.id}`,
          entityId: k.id,
          entityType: 'Aufgabenbausteine',
          type: `klon_${s === 'to_delete' ? 'modified' : s}`,
          status: s,
          name: `Klon ${k.klon_index || '?'}`,
          path: paketMap[k.lernpaket_id] || 'Unbekanntes Paket',
          updatedAt: k.updated_date,
        });
      });

    return items.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }, [alleAktivitaeten, alleMaster, alleKlone, paketIds, paketMap, katMap]);

  // ── Selektion ─────────────────────────────────────────────────────────────

  const allSelected = diffItems.length > 0 && selected.size === diffItems.length;
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(diffItems.map(i => i.id)));
  };

  const toggleOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Mutationen ────────────────────────────────────────────────────────────

  const scheduleExportMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = diffItems.filter(i => selected.has(i.id));
      for (const item of selectedItems) {
        await base44.entities[item.entityType].update(item.entityId, { sync_status: 'pending_export' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lpaAktivitaeten_export'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben_export'] });
      queryClient.invalidateQueries({ queryKey: ['klone_export'] });
      setSelected(new Set());
      toast.success(`${selected.size} Element(e) für nächtlichen Export eingeplant.`);
    },
  });

  const fastTrackMutation = useMutation({
    mutationFn: async () => {
      const selectedItems = diffItems.filter(i => selected.has(i.id));
      // Direkt als 'exported' markieren (simuliert MCP-Call)
      for (const item of selectedItems) {
        await base44.entities[item.entityType].update(item.entityId, {
          sync_status: 'exported',
          last_synced_at: new Date().toISOString(),
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lpaAktivitaeten_export'] });
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben_export'] });
      queryClient.invalidateQueries({ queryKey: ['klone_export'] });
      setShowConfirm(false);
      setSelected(new Set());
      toast.success(`Fast-Track: ${selected.size} Element(e) sofort exportiert.`);
    },
  });

  const isBusy = scheduleExportMutation.isPending || fastTrackMutation.isPending;

  // ── Loading ────────────────────────────────────────────────────────────────

  if (!einheitId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <p className="text-muted-foreground text-sm">Bitte wähle oben eine Einheit aus.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ── Empty State ────────────────────────────────────────────────────────────

  if (diffItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <p className="text-lg font-semibold text-green-700">Alles synchron!</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Alle Inhalte sind aktuell mit Moodle synchronisiert. Es stehen keine Exporte an.
          </p>
        </div>
      </div>
    );
  }

  // ── Hauptansicht ───────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* Zusammenfassung */}
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <span>
          <strong className="text-foreground">{diffItems.length}</strong> ausstehende Änderungen bereit für den Export
        </span>
      </div>

      {/* Tabelle */}
      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Alle auswählen"
                />
              </TableHead>
              <TableHead className="w-44">Typ</TableHead>
              <TableHead>Element</TableHead>
              <TableHead className="w-28 text-center">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {diffItems.map(item => {
              const { label, color } = statusLabel(item.status);
              return (
                <TableRow
                  key={item.id}
                  onClick={() => toggleOne(item.id)}
                  className={cn(
                    'cursor-pointer transition-colors',
                    selected.has(item.id) ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-muted/40'
                  )}
                >
                  <TableCell onClick={e => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleOne(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <TypeBadge type={item.type} />
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-sm text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.path}</p>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <StatusDot status={item.status} />
                      <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', color)}>
                        {label}
                      </span>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Aktionsleiste */}
      <div className={cn(
        'sticky bottom-0 rounded-xl border px-4 py-3 flex items-center justify-between gap-3 transition-all',
        someSelected
          ? 'bg-card border-primary/30 shadow-lg shadow-primary/5'
          : 'bg-muted/60 border-border opacity-60 pointer-events-none'
      )}>
        <p className="text-sm text-muted-foreground">
          {someSelected
            ? <><strong className="text-foreground">{selected.size}</strong> Element(e) ausgewählt</>
            : 'Keine Elemente ausgewählt'}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => scheduleExportMutation.mutate()}
            disabled={!someSelected || isBusy}
            className="gap-2"
          >
            {scheduleExportMutation.isPending
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CalendarClock className="w-3.5 h-3.5" />}
            Für nächtlichen Export einplanen
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowConfirm(true)}
            disabled={!someSelected || isBusy}
            className="gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            Fast-Track: Sofort aktualisieren
          </Button>
        </div>
      </div>

      {/* Bestätigungs-Dialog Fast-Track */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-destructive" />
              Fast-Track Export bestätigen
            </AlertDialogTitle>
            <AlertDialogDescription>
              Du bist dabei, <strong>{selected.size} Element(e)</strong> sofort an Moodle zu übertragen.
              Dieser Vorgang kann nicht rückgängig gemacht werden.
              <br /><br />
              Bist du sicher?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => fastTrackMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
            >
              {fastTrackMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Jetzt exportieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}