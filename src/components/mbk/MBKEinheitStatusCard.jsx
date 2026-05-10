/**
 * MBKEinheitStatusCard.jsx
 *
 * Kompakter Status-Header für die in der MBK-Konsole ausgewählte Einheit.
 * Zeigt — analog zum Export-Center — den Lifecycle-Status (Draft / Final
 * freigegeben / Im Export / Veröffentlicht) und den Moodle-Sync-Status
 * (neu / in_sync / out_of_sync). So sieht der Operator auf einen Blick,
 * ob die Einheit überhaupt exportreif ist oder noch im Umbau steckt.
 */
import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, AlertTriangle, CheckCircle2, Sparkles, Rocket, Lock, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import EinheitExportLifecycleBadge from '@/components/einheiten/EinheitExportLifecycleBadge';
import { EXPORT_LIFECYCLE_STATUS, EXPORT_LIFECYCLE_LABELS } from '@/lib/exportLifecycle';
import { useEinheitenMoodleSyncStatus } from '@/hooks/useEinheitenMoodleSyncStatus';

const SYNC_META = {
  new: {
    label: 'Neu (noch nie veröffentlicht)',
    cls: 'bg-blue-100 text-blue-800 border border-blue-200',
    Icon: Sparkles,
  },
  in_sync: {
    label: 'In Sync mit Moodle',
    cls: 'bg-green-100 text-green-800 border border-green-200',
    Icon: CheckCircle2,
  },
  out_of_sync: {
    label: 'Out of Sync (Änderungen seit Veröffentlichung)',
    cls: 'bg-amber-100 text-amber-900 border border-amber-200',
    Icon: AlertTriangle,
  },
};

export default function MBKEinheitStatusCard({ einheitId }) {
  const queryClient = useQueryClient();
  const [marking, setMarking] = React.useState(false);
  const [toggling, setToggling] = React.useState(false);

  const { data: einheit, isLoading } = useQuery({
    queryKey: ['mbk-einheit-status', einheitId],
    queryFn: async () => {
      const list = await base44.entities.Einheiten.filter({ id: einheitId });
      return list?.[0] || null;
    },
    enabled: !!einheitId,
    staleTime: 15_000,
  });

  const invalidateLifecycle = () => {
    // Sync-, Lifecycle-, Cockpit- und Listen-Anzeigen neu laden, damit der
    // Lock-Status auch im Lernpfad-Architekt sofort sichtbar ist.
    queryClient.invalidateQueries({ queryKey: ['mbk-einheit-status', einheitId] });
    queryClient.invalidateQueries({ queryKey: ['mbk-einheiten-list'] });
    queryClient.invalidateQueries({ queryKey: ['einheitensync'] });
    queryClient.invalidateQueries({ queryKey: ['einheitFreigabeStatus', einheitId] });
  };

  const handleMarkPublished = async () => {
    if (!einheitId || marking) return;
    setMarking(true);
    try {
      const res = await base44.functions.invoke('mbkMarkEinheitPublished', { einheitId });
      if (res?.data?.ok) {
        toast.success('Einheit ist jetzt als in Moodle aktiv markiert.');
        invalidateLifecycle();
      } else {
        toast.error(res?.data?.error || 'Markieren fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err?.message || 'Unbekannter Fehler.');
    } finally {
      setMarking(false);
    }
  };

  // Export-Lock toggeln (final_freigegeben ↔ export_running). Verhindert,
  // dass die Fachschaftsleitung mitten im Export die Freigabe zurücknimmt.
  const handleToggleExportLock = async (action) => {
    if (!einheitId || toggling) return;
    setToggling(true);
    try {
      const res = await base44.functions.invoke('mbkToggleExportLock', { einheitId, action });
      if (res?.data?.ok) {
        toast.success(
          action === 'lock'
            ? 'Einheit für den Export gesperrt. Die Freigabe kann jetzt nicht mehr aufgehoben werden.'
            : 'Export-Sperre aufgehoben. Die Fachschaftsleitung kann die Freigabe jetzt wieder zurücknehmen.'
        );
        invalidateLifecycle();
      } else {
        toast.error(res?.data?.error || 'Aktion fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err?.message || 'Unbekannter Fehler.');
    } finally {
      setToggling(false);
    }
  };

  const einheitenForSync = React.useMemo(
    () => (einheit ? [einheit] : []),
    [einheit]
  );
  const syncMap = useEinheitenMoodleSyncStatus(einheitenForSync);
  const syncStatus = einheit ? syncMap.get(einheit.id) : null;
  const syncMeta = syncStatus ? SYNC_META[syncStatus] : null;

  if (!einheitId) return null;

  if (isLoading || !einheit) {
    return (
      <div className="rounded-lg border bg-card p-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Lade Status der Einheit…
      </div>
    );
  }

  const lifecycle = einheit.export_lifecycle_status || EXPORT_LIFECYCLE_STATUS.DRAFT;
  const isDraft = lifecycle === EXPORT_LIFECYCLE_STATUS.DRAFT;
  const isFinal = lifecycle === EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN;
  const isExportRunning = lifecycle === EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING;
  const isPublished = lifecycle === EXPORT_LIFECYCLE_STATUS.PUBLISHED;
  const lifecycleLabel = EXPORT_LIFECYCLE_LABELS[lifecycle] || lifecycle;

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Status der Einheit:
          </span>

          {/* Lifecycle-Badge — bei Draft zeigen wir bewusst eine eigene neutrale Pille. */}
          {isDraft ? (
            <Badge className="bg-slate-100 text-slate-700 border border-slate-200 gap-1">
              {lifecycleLabel}
            </Badge>
          ) : (
            <EinheitExportLifecycleBadge status={lifecycle} />
          )}

          {/* Sync-Status */}
          {syncMeta && (
            <Badge className={`${syncMeta.cls} gap-1`}>
              <syncMeta.Icon className="w-3 h-3" />
              {syncMeta.label}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        {/* Export-Lock — verhindert, dass die Fachschaftsleitung die Freigabe
            zurücknimmt, während das Moodle-Team gerade exportiert. Nur
            sichtbar bei final_freigegeben oder export_running. */}
        {(isFinal || isExportRunning) && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant={isExportRunning ? 'default' : 'outline'}
                disabled={toggling}
                className={`gap-1.5 ${isExportRunning ? 'bg-orange-600 hover:bg-orange-700 text-white border-transparent' : ''}`}
                title={
                  isExportRunning
                    ? 'Export-Sperre aufheben — Fachschaftsleitung kann die Freigabe wieder zurücknehmen.'
                    : 'Einheit für den Export sperren — Fachschaftsleitung kann die Freigabe nicht mehr aufheben.'
                }
              >
                {toggling ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : isExportRunning ? (
                  <Unlock className="w-3.5 h-3.5" />
                ) : (
                  <Lock className="w-3.5 h-3.5" />
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

        {/* "In Moodle aktiv markieren" — bestätigt manuell, dass die Einheit
            erfolgreich in Moodle hochgeladen wurde. Setzt Lifecycle auf
            'published' und damit den Sync-Status auf 'in_sync'. */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="sm"
              variant={isPublished ? 'outline' : 'default'}
              disabled={marking}
              className="gap-1.5 shrink-0"
              title={
                isPublished
                  ? 'Einheit ist bereits als in Moodle aktiv markiert.'
                  : 'Einheit wurde erfolgreich in Moodle hochgeladen → als veröffentlicht markieren.'
              }
            >
              {marking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Rocket className="w-3.5 h-3.5" />
              )}
              {isPublished ? 'Erneut markieren' : 'In Moodle aktiv markieren'}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Achtung: Einheit endgültig als „in Moodle aktiv" markieren?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>
                    Bestätige <strong>nur dann</strong>, wenn die Einheit als
                    SCORM-Paket <strong>tatsächlich vollständig in Moodle
                    hochgeladen</strong> und dort live verfügbar ist.
                  </p>
                  <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900 space-y-2">
                    <p className="font-semibold">Was passiert beim Klick:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>
                        Die Einheit gilt ab sofort systemweit als
                        <strong> „in Moodle aktiv"</strong> und wird überall so
                        angezeigt.
                      </li>
                      <li>
                        Sie wird <strong>wieder zur Bearbeitung freigegeben</strong> —
                        spätere Änderungen werden ab jetzt als
                        <em> „modified"</em> markiert und müssen erneut
                        exportiert werden.
                      </li>
                      <li>
                        <strong>Diese Aktion lässt sich aktuell nicht
                        rückgängig machen.</strong> Wenn du irrtümlich klickst,
                        muss ein Admin den Lifecycle manuell zurücksetzen.
                      </li>
                    </ul>
                  </div>
                  <p className="text-muted-foreground">
                    Im Zweifel: <strong>Abbrechen</strong> und nochmal prüfen,
                    ob das ZIP wirklich in Moodle steht.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleMarkPublished}
                className="bg-amber-600 hover:bg-amber-700 focus-visible:ring-amber-600"
              >
                Ja, ich habe in Moodle geprüft – jetzt markieren
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        </div>
      </div>

      {isDraft && (
        <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>
            Diese Einheit ist <strong>noch in Bearbeitung</strong> und nicht
            final freigegeben. Du kannst Generatoren testen, aber für einen
            echten Moodle-Export sollte sie zuerst im Export-Center final
            freigegeben werden.
          </span>
        </div>
      )}
    </div>
  );
}