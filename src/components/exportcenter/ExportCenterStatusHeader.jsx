/**
 * ExportCenterStatusHeader.jsx
 *
 * Zone A des Export-Center-Arbeitsbereichs. Zeigt:
 *   - Titel + Metadaten der Einheit (Fach, Jahrgang, Themenfelder/Pakete)
 *   - Lifecycle-Status-Badge (groß)
 *   - Button "Export beendet & Freigeben" – öffnet den zwei-stufigen
 *     ExportCompletionDialog, der erfolgreiche/fehlerhafte Items markiert
 *     und die Einheit anschließend wieder auf 'draft' setzt.
 *
 * Der Button wird nur aktiv, wenn die Einheit gerade tatsächlich
 * exportiert wird (export_lifecycle_status === 'export_running' oder
 * 'final_freigegeben'). In allen anderen States wäre der Klick
 * verwirrend, weil noch gar nichts zum Bestätigen da ist.
 */

import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, Clock, Send, Pencil, Layers, Lock, Unlock, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  EXPORT_LIFECYCLE_STATUS,
  EXPORT_LIFECYCLE_LABELS,
} from '@/lib/exportLifecycle';
import ExportCompletionDialog from '@/components/exportcenter/ExportCompletionDialog';

const STATUS_META = {
  [EXPORT_LIFECYCLE_STATUS.DRAFT]: { icon: Pencil, cls: 'bg-slate-100 text-slate-700 border-slate-300' },
  [EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN]: { icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  [EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING]: { icon: Clock, cls: 'bg-orange-100 text-orange-800 border-orange-300' },
  [EXPORT_LIFECYCLE_STATUS.PUBLISHED]: { icon: Send, cls: 'bg-blue-100 text-blue-800 border-blue-300' },
};

export default function ExportCenterStatusHeader({ einheit }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toggling, setToggling] = useState(false);
  const queryClient = useQueryClient();

  // Strukturzahlen (klein, nur für Zusammenfassung).
  const { data: themenfelder = [] } = useQuery({
    queryKey: ['themenfelder', einheit.id],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheit.id }),
    enabled: !!einheit?.id,
  });
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheit.id],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheit.id }),
    enabled: !!einheit?.id,
  });

  const status = einheit.export_lifecycle_status || EXPORT_LIFECYCLE_STATUS.DRAFT;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;

  // "Export beendet" macht nur Sinn, wenn der Spezialist den Export auch
  // tatsächlich gestartet bzw. die Einheit final freigegeben hat.
  const canComplete =
    status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING ||
    status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN;

  // Export-Lock identisch zur MBK-Konsole: nur sichtbar bei
  // final_freigegeben (sperren) oder export_running (Sperre aufheben).
  const isFinal = status === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN;
  const isExportRunning = status === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING;
  const showLockButton = isFinal || isExportRunning;

  const handleToggleExportLock = async (action) => {
    if (!einheit?.id || toggling) return;
    setToggling(true);
    try {
      const res = await base44.functions.invoke('mbkToggleExportLock', { einheitId: einheit.id, action });
      if (res?.data?.ok) {
        toast.success(
          action === 'lock'
            ? 'Einheit für den Export gesperrt. Die Freigabe kann jetzt nicht mehr aufgehoben werden.'
            : 'Export-Sperre aufgehoben. Die Fachschaftsleitung kann die Freigabe jetzt wieder zurücknehmen.'
        );
        queryClient.invalidateQueries({ queryKey: ['einheitensync'] });
        queryClient.invalidateQueries({ queryKey: ['einheitFreigabeStatus', einheit.id] });
        queryClient.invalidateQueries({ queryKey: ['einheit', einheit.id] });
      } else {
        toast.error(res?.data?.error || 'Aktion fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err?.message || 'Unbekannter Fehler.');
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold tracking-tight">
            {einheit.titel_der_einheit}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {einheit.fach} · Jahrgangsstufe {einheit.jahrgangsstufe}
          </p>
          <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {themenfelder.length} Themenfeld{themenfelder.length !== 1 ? 'er' : ''}
            </span>
            <span>·</span>
            <span>
              {lernpakete.length} Lernpaket{lernpakete.length !== 1 ? 'e' : ''}
            </span>
          </div>
        </div>
        <Badge className={cn('text-xs gap-1.5 border px-3 py-1', meta.cls)}>
          <StatusIcon className="w-3.5 h-3.5" />
          {EXPORT_LIFECYCLE_LABELS[status]}
        </Badge>
      </div>

      <div className="pt-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground max-w-md">
          Nach erfolgreicher Übertragung in Moodle bestätigst du hier den
          Abschluss. Die Einheit wird wieder zur Bearbeitung freigegeben.
        </p>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {showLockButton && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant={isExportRunning ? 'default' : 'outline'}
                  disabled={toggling}
                  className={cn(
                    'gap-2',
                    isExportRunning && 'bg-orange-600 hover:bg-orange-700 text-white border-transparent'
                  )}
                  title={
                    isExportRunning
                      ? 'Export-Sperre aufheben — Fachschaftsleitung kann die Freigabe wieder zurücknehmen.'
                      : 'Einheit für den Export sperren — Fachschaftsleitung kann die Freigabe nicht mehr aufheben.'
                  }
                >
                  {toggling ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isExportRunning ? (
                    <Unlock className="w-4 h-4" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  {isExportRunning ? 'Sperre aufheben' : 'Für Export sperren'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    {isExportRunning ? (
                      <>
                        <Unlock className="w-5 h-5 text-emerald-600" />
                        Export-Sperre aufheben?
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5 text-orange-600" />
                        Einheit für den Export sperren?
                      </>
                    )}
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3 text-sm">
                      {isExportRunning ? (
                        <>
                          <p>
                            Mit dieser Aktion gibst du die Einheit wieder frei für die
                            Fachschaftsleitung — sie kann die finale Freigabe dann zurücknehmen
                            und Inhalte erneut bearbeiten.
                          </p>
                          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                            <strong>Wichtig:</strong> Wenn die Einheit anschließend erneut
                            freigegeben wird, musst du den Export <strong>von vorne beginnen</strong> —
                            alle bisher generierten Dateien sind dann nicht mehr garantiert
                            aktuell.
                          </div>
                        </>
                      ) : (
                        <>
                          <p>
                            Mit dieser Aktion sperrst du die Einheit für den laufenden
                            Moodle-Export. Solange die Sperre aktiv ist, kann die
                            Fachschaftsleitung die finale Freigabe <strong>nicht mehr
                            aufheben</strong> — sie sieht stattdessen im Lernpfad-Architekt einen
                            Hinweis, dass die Einheit gerade exportiert wird.
                          </p>
                          <div className="rounded-md border border-blue-300 bg-blue-50 p-3 text-blue-900">
                            <strong>So geht's weiter:</strong> Wenn die Fachschaftsleitung
                            während deines Exports doch noch eine Korrektur wünscht, soll sie
                            dich kontaktieren. Du hebst die Sperre dann hier manuell auf
                            („Sperre aufheben"), die Korrektur wird vorgenommen, und ihr
                            startet den Export anschließend von vorne.
                          </div>
                        </>
                      )}
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => handleToggleExportLock(isExportRunning ? 'unlock' : 'lock')}
                    className={
                      isExportRunning
                        ? 'bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-600'
                        : 'bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-600'
                    }
                  >
                    {isExportRunning ? 'Ja, Sperre aufheben' : 'Ja, Einheit sperren'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            onClick={() => setDialogOpen(true)}
            disabled={!canComplete}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            title={
              canComplete
                ? 'Export-Abschluss bestätigen'
                : 'Erst möglich, sobald die Einheit final freigegeben oder im Export ist.'
            }
          >
            <CheckCircle2 className="w-4 h-4" />
            Export beendet & Freigeben
          </Button>
        </div>
      </div>

      <ExportCompletionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        einheit={einheit}
      />
    </div>
  );
}