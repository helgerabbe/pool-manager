/**
 * MoodleExportView.jsx
 * 
 * Schritt 6 – Moodle-Export & Admin-Freigabe
 * 
 * Technische Endstation des Workflows:
 * - Zeigt Export-Zusammenfassung (was ist 'pending' / bereit?)
 * - Status-Log (wann wurde was exportiert?)
 * - Admin-Button zur Bestätigung des Export-Abschlusses
 * 
 * Die useExportLock-Logik ist hier NICHT aktiv für Admins (Interaktion erlaubt).
 */

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { useExportLock } from '@/hooks/useExportLock';
import { ExportLockBanner } from './ExportLockBanner';
import { ExportConfirmationButton } from '@/components/admin/ExportConfirmationButton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Clock, AlertCircle, Zap, Send } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function MoodleExportView({ einheitId, userRole, isAdmin }) {
  const queryClient = useQueryClient();
  const { permissions } = useRBAC();
  const { isLocked, pendingCount, pendingElements } = useExportLock(einheitId);
  const [confirmedIds, setConfirmedIds] = useState(new Set());

  // ──────────────────────────────────────────────────────────────────────────────
  // Daten laden (alle Hooks ZUERST)
  // ──────────────────────────────────────────────────────────────────────────────

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    refetchInterval: 3000,
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
    refetchInterval: 3000,
  });

  const { data: masters = [] } = useQuery({
    queryKey: ['masterAufgaben'],
    queryFn: () => base44.entities.MasterAufgabe.list(),
    refetchInterval: 3000,
  });

  const { data: klone = [] } = useQuery({
    queryKey: ['aufgabenbausteine'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    refetchInterval: 3000,
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Berechne Status-Kategorien
  // ──────────────────────────────────────────────────────────────────────────────

  const paketIds = lernpakete.filter(lp => lp.einheit_id === einheitId).map(lp => lp.id);
  const einheitActivities = activities.filter(a => paketIds.includes(a.lernpaket_id));

  const stats = useMemo(() => {
    const allElements = [
      ...lernpakete.filter(lp => lp.einheit_id === einheitId),
      ...einheitActivities,
      ...masters,
      ...klone,
    ].filter(e => e.sync_status !== 'to_delete');

    return {
      total: allElements.length,
      pending: allElements.filter(e => e.sync_status === 'pending').length,
      synced: allElements.filter(e => e.sync_status === 'synced').length,
      new: allElements.filter(e => e.sync_status === 'new').length,
      modified: allElements.filter(e => e.sync_status === 'modified').length,
      toDelete: [
        ...lernpakete.filter(lp => lp.einheit_id === einheitId && lp.sync_status === 'to_delete'),
        ...einheitActivities.filter(a => a.sync_status === 'to_delete'),
        ...masters.filter(m => m.sync_status === 'to_delete'),
        ...klone.filter(k => k.sync_status === 'to_delete'),
      ].length,
    };
  }, [lernpakete, einheitActivities, masters, klone, einheitId]);

  // Pending-Elemente für flache Liste (Aktivitäten + allgemeine Aufgaben)
  const { data: allgemeineAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben'],
    queryFn: () => base44.entities.AllgemeineAufgabe.list(),
    refetchInterval: 5000,
  });

  const pendingAufgaben = useMemo(() => {
    const paketMap = Object.fromEntries(lernpakete.map(lp => [lp.id, lp]));
    const actItems = activities
      .filter(a => a.sync_status === 'pending' && paketMap[a.lernpaket_id]?.einheit_id === einheitId)
      .map(a => ({ ...a, _label: `${a.phase}: Aktivität`, _type: 'aktivitaet' }));
    const aufgabeItems = allgemeineAufgaben
      .filter(a => a.sync_status === 'pending' && a.einheit_id === einheitId)
      .map(a => ({ ...a, _label: a.titel || 'Aufgabe ohne Titel', _type: 'aufgabe' }));
    return [...actItems, ...aufgabeItems];
  }, [activities, allgemeineAufgaben, lernpakete, einheitId]);

  // Initialise confirmedIds when pendingAufgaben change
  React.useEffect(() => {
    setConfirmedIds(new Set(pendingAufgaben.map(a => a.id)));
  }, [pendingAufgaben.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const successfulIds = pendingAufgaben.filter(a => confirmedIds.has(a.id)).map(a => a.id);
      const failedIds = pendingAufgaben.filter(a => !confirmedIds.has(a.id)).map(a => a.id);
      await base44.functions.invoke('confirmExportCompletion', { einheit_id: einheitId, successfulIds, failedIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      toast.success('Export bestätigt! Status aktualisiert.');
    },
    onError: () => toast.error('Fehler beim Bestätigen'),
  });

  // Zeitpunkt des letzten Exports ermitteln (Hook IMMER aufrufen)
  const lastSyncTimestamp = useMemo(() => {
    const syncedElements = [
      ...lernpakete,
      ...activities,
      ...masters,
      ...klone,
    ]
      .filter(e => e.sync_status === 'synced' && e.last_synced_at)
      .map(e => new Date(e.last_synced_at).getTime())
      .sort((a, b) => b - a);

    return syncedElements.length > 0 ? syncedElements[0] : null;
  }, [lernpakete, activities, masters, klone]);

  // Permission check (nach allen Hooks)
  if (!permissions.kannExportLesen) {
    return (
      <div className="space-y-6 p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800">Kein Zugriff. Diese Seite ist nicht für Betrachter verfügbar.</p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-3xl font-bold">🚀 Moodle-Export</h2>
        <p className="text-muted-foreground">
          Technische Freigabe und Administration des Moodle-Exports. 
          Nur Administratoren und das Moodle-Export-Team können den Export-Abschluss bestätigen.
        </p>
      </div>

      {/* Export Lock Banner (bei laufendem Export) */}
      {isLocked && <ExportLockBanner pendingCount={pendingCount} />}

      {/* Export-Status Übersicht */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">Gesamt Elemente</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">🔒 Pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
            <p className="text-xs text-muted-foreground mt-1">✅ Synced</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.modified}</div>
            <p className="text-xs text-muted-foreground mt-1">⚠️ Modified</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.toDelete}</div>
            <p className="text-xs text-muted-foreground mt-1">🗑️ Zu löschen</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Export-Status Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Pending Elements */}
          <div>
            <p className="text-sm font-semibold text-blue-700 mb-2">
              🔒 In der Warteschlange ({stats.pending})
            </p>
            {pendingElements.length > 0 ? (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {pendingElements.slice(0, 5).map((elem, idx) => (
                  <div key={elem.id} className="text-xs bg-blue-50 p-2 rounded border border-blue-200">
                    • {elem.titel_des_pakets || elem.phase || `Element ${idx + 1}`}
                  </div>
                ))}
                {pendingElements.length > 5 && (
                  <p className="text-xs text-muted-foreground italic">
                    +{pendingElements.length - 5} weitere…
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Keine Elemente pending</p>
            )}
          </div>

          <Separator />

          {/* Synced Elements */}
          <div>
            <p className="text-sm font-semibold text-green-700 mb-2">
              ✅ Bereits exportiert ({stats.synced})
            </p>
            {stats.synced > 0 && lastSyncTimestamp ? (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-xs text-green-800">
                  Letzter Export: <strong>
                    {format(new Date(lastSyncTimestamp), 'dd. MMMM yyyy, HH:mm:ss', { locale: de })}
                  </strong>
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Noch kein Element exportiert</p>
            )}
          </div>

          <Separator />

          {/* To Delete */}
          {stats.toDelete > 0 && (
            <div>
              <p className="text-sm font-semibold text-red-700 mb-2">
                🗑️ Zur Löschung vorgesehen ({stats.toDelete})
              </p>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <p className="text-xs text-red-800">
                  ⚠️ {stats.toDelete} Element{stats.toDelete !== 1 ? 'e' : ''} werden beim nächsten Export aus Moodle gelöscht.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending-Aufgaben Liste mit Bestätigung */}
      {permissions.kannExportBedienen && (
        <Card className="border-2 border-orange-200 bg-orange-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Send className="w-5 h-5" />
              Export bestätigen ({pendingAufgaben.length} ausstehend)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {pendingAufgaben.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine ausstehenden Elemente.</p>
            ) : (
              <>
                <p className="text-sm text-orange-800">
                  Hake alle Elemente ab, die erfolgreich nach Moodle hochgeladen wurden. Nicht abgehakte werden als <strong>Fehler</strong> markiert.
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {pendingAufgaben.map(item => (
                    <div key={item.id} className={`flex items-center gap-3 p-2.5 rounded-lg border transition ${
                      confirmedIds.has(item.id) ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}>
                      <Checkbox
                        checked={confirmedIds.has(item.id)}
                        onCheckedChange={(v) => setConfirmedIds(prev => {
                          const next = new Set(prev);
                          v ? next.add(item.id) : next.delete(item.id);
                          return next;
                        })}
                      />
                      <span className="text-sm flex-1 truncate">{item._label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        confirmedIds.has(item.id) ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {confirmedIds.has(item.id) ? '✓ Erfolgreich' : '✗ Fehler'}
                      </span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending}
                  className="w-full py-2 px-4 rounded-md bg-green-600 hover:bg-green-700 text-white font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {confirmMutation.isPending
                    ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Wird gespeichert…</>
                    : <><CheckCircle2 className="w-4 h-4" />Export bestätigen ({confirmedIds.size}/{pendingAufgaben.length})</>}
                </button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info Footer */}
      <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800">
        <p className="font-semibold mb-1">ℹ️ Workflow-Info</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>Status 'pending': Element wartet auf Export-Bestätigung</li>
          <li>Status 'synced': Element wurde erfolgreich nach Moodle übertragen</li>
          <li>Status 'modified': Element wurde nach dem letzten Export geändert</li>
          <li>Admin-Button setzt nur 'pending' → 'synced', speichert nicht neu in Moodle</li>
        </ul>
      </div>
    </div>
  );
}