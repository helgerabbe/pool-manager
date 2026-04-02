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

import React, { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useExportLock } from '@/hooks/useExportLock';
import { ExportLockBanner } from './ExportLockBanner';
import { ExportConfirmationButton } from '@/components/admin/ExportConfirmationButton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Clock, AlertCircle, Zap } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

export default function MoodleExportView({ einheitId, userRole, isAdmin }) {
  const queryClient = useQueryClient();
  const { isLocked, pendingCount, pendingElements } = useExportLock(einheitId);

  // ──────────────────────────────────────────────────────────────────────────────
  // Daten laden
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

  // Zeitpunkt des letzten Exports ermitteln
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
          Nur Administratoren können den Export-Abschluss bestätigen.
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

      {/* Admin-Bestätigungs-Sektion */}
      {isAdmin ? (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="w-5 h-5" />
              Admin-Bereich: Export-Abschluss
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-green-800">
              Sie können hier den Moodle-Export abschließen. Dies setzt alle 'pending'-Elemente auf 'synced' 
              und bestätigt, dass der Export erfolgreich abgeschlossen wurde.
            </p>

            {!isLocked ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800 font-semibold">
                  ℹ️ Kein laufender Export
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Es gibt keine Elemente im Status 'pending'. Der Button wird aktiv, 
                  sobald neue Elemente zum Export anstehen.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-green-800">
                  {pendingCount} Element{pendingCount !== 1 ? 'e' : ''} bereit zur Bestätigung
                </p>
                <ExportConfirmationButton 
                  einheitId={einheitId}
                  userRole={userRole}
                  className="w-full bg-green-600 hover:bg-green-700"
                />
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-slate-200 bg-slate-50">
          <CardHeader>
            <CardTitle className="text-slate-700">🔒 Admin-Bereich (eingeschränkt)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Nur Administratoren können den Moodle-Export-Abschluss bestätigen. 
              Bitte kontaktieren Sie einen Admin, um den Export freizugeben.
            </p>
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