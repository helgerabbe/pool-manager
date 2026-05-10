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
import { Loader2, AlertTriangle, CheckCircle2, Sparkles, Rocket } from 'lucide-react';
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

  const { data: einheit, isLoading } = useQuery({
    queryKey: ['mbk-einheit-status', einheitId],
    queryFn: async () => {
      const list = await base44.entities.Einheiten.filter({ id: einheitId });
      return list?.[0] || null;
    },
    enabled: !!einheitId,
    staleTime: 15_000,
  });

  const handleMarkPublished = async () => {
    if (!einheitId || marking) return;
    setMarking(true);
    try {
      const res = await base44.functions.invoke('mbkMarkEinheitPublished', { einheitId });
      if (res?.data?.ok) {
        toast.success('Einheit ist jetzt als in Moodle aktiv markiert.');
        // Sync- und Lifecycle-Anzeigen sowie Einheitenlisten neu laden.
        queryClient.invalidateQueries({ queryKey: ['mbk-einheit-status', einheitId] });
        queryClient.invalidateQueries({ queryKey: ['mbk-einheiten-list'] });
        queryClient.invalidateQueries({ queryKey: ['einheitensync'] });
      } else {
        toast.error(res?.data?.error || 'Markieren fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err?.message || 'Unbekannter Fehler.');
    } finally {
      setMarking(false);
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
              <AlertDialogTitle>Einheit als veröffentlicht markieren?</AlertDialogTitle>
              <AlertDialogDescription>
                Bestätige nur, wenn die Einheit als SCORM-Paket erfolgreich in
                Moodle hochgeladen und dort live ist. Danach gilt sie als „in Sync"
                — spätere Änderungen an Aufgaben/Lernpaketen werden ab jetzt als
                „modified" markiert.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction onClick={handleMarkPublished}>
                Ja, jetzt markieren
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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