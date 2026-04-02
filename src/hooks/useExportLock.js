/**
 * useExportLock.js
 * 
 * Custom Hook für die Export-Sperr-Logik.
 * Überwacht sync_status='pending' für Lernpakete, Aktivitäten, Masters und Klone.
 * Wenn mindestens ein Element 'pending' ist, wird die Einheit gesperrt (Read-Only).
 */

import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export function useExportLock(einheitId) {
  // Alle Lernpakete der Einheit
  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete', einheitId, 'export-lock'],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheitId }),
    refetchInterval: 3000, // Aktualisiere alle 3 Sekunden während Export lädt
  });

  // Alle Aktivitäten (filtern dann auf diese Einheit)
  const { data: activities = [] } = useQuery({
    queryKey: ['lernpaketPhaseAktivitaeten', 'export-lock'],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list(),
    refetchInterval: 3000,
  });

  // Alle Masters
  const { data: masters = [] } = useQuery({
    queryKey: ['masterAufgaben', 'export-lock'],
    queryFn: () => base44.entities.MasterAufgabe.list(),
    refetchInterval: 3000,
  });

  // Alle Klone
  const { data: klone = [] } = useQuery({
    queryKey: ['aufgabenbausteine', 'export-lock'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
    refetchInterval: 3000,
  });

  // ──────────────────────────────────────────────────────────────────────────────
  // Berechne, welche Elemente zu dieser Einheit gehören
  // ──────────────────────────────────────────────────────────────────────────────

  const paketIds = lernpakete.filter(lp => lp.einheit_id === einheitId).map(lp => lp.id);
  const einheitActivities = activities.filter(a => paketIds.includes(a.lernpaket_id));

  // ──────────────────────────────────────────────────────────────────────────────
  // Bestimme Lock-Status: Gibt es mindestens ein 'pending' Element?
  // ──────────────────────────────────────────────────────────────────────────────

  const pendingLernpakete = lernpakete.filter(
    lp => lp.einheit_id === einheitId && lp.sync_status === 'pending'
  );

  const pendingActivities = einheitActivities.filter(a => a.sync_status === 'pending');

  const pendingMasters = masters.filter(m => m.sync_status === 'pending');

  const pendingKlone = klone.filter(k => k.sync_status === 'pending');

  const isLocked =
    pendingLernpakete.length > 0 ||
    pendingActivities.length > 0 ||
    pendingMasters.length > 0 ||
    pendingKlone.length > 0;

  const pendingCount =
    pendingLernpakete.length +
    pendingActivities.length +
    pendingMasters.length +
    pendingKlone.length;

  return {
    isLocked,
    pendingCount,
    pendingElements: [
      ...pendingLernpakete,
      ...pendingActivities,
      ...pendingMasters,
      ...pendingKlone,
    ],
  };
}