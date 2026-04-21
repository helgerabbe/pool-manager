import React from 'react';
import { AlertCircle, Lock, CheckCircle2 } from 'lucide-react';

/**
 * MoodleSyncStatusBadge.jsx
 *
 * Zeigt den Moodle-Synchronisations-Status einer Aktivität/Aufgabe.
 *
 * Status-Typen:
 * - synced: ✓ Moodle: Aktuell (Grün/Blau)
 * - modified: ⚠ Moodle: Veraltet (Orange)
 * - locked: 🔒 Moodle: In Arbeit (Rot)
 * - error: ❌ Moodle: Fehler (Rot)
 * - new: ◎ Nicht exportiert (Grau)
 */
export default function MoodleSyncStatusBadge({
  status = 'new',
  lastSyncedAt = null,
  isDirtySinceExport = false,
  exportLocked = false,
}) {
  // Status-Logik: export_locked hat Priorität
  const effectiveStatus = exportLocked ? 'locked' : status;

  const statusConfig = {
    synced: {
      icon: CheckCircle2,
      label: '✓ Moodle: Aktuell',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-300',
      title: lastSyncedAt ? `Synchronisiert am ${new Date(lastSyncedAt).toLocaleDateString('de-DE')}` : 'Mit Moodle synchronisiert',
    },
    modified: {
      icon: AlertCircle,
      label: '⚠ Moodle: Veraltet',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-700',
      borderColor: 'border-yellow-300',
      title: 'Änderungen nach Export - Re-Export erforderlich',
    },
    locked: {
      icon: Lock,
      label: '🔒 Moodle: In Arbeit',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      title: 'Einheit wird gerade zu Moodle synchronisiert',
    },
    error: {
      icon: AlertCircle,
      label: '❌ Moodle: Fehler',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-300',
      title: 'Synchronisierungsfehler - Admin-Benachrichtigung erforderlich',
    },
    new: {
      icon: AlertCircle,
      label: '◎ Nicht exportiert',
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-700',
      borderColor: 'border-slate-300',
      title: 'Noch kein Export zu Moodle',
    },
  };

  const config = statusConfig[effectiveStatus] || statusConfig.new;
  const Icon = config.icon;

  return (
    <span
      title={config.title}
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      {config.label}
    </span>
  );
}