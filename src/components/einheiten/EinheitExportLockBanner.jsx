/**
 * EinheitExportLockBanner.jsx
 *
 * Phase C – globaler Read-Only-Banner für die Workspace-Tabs 3 bis 6
 * (Aktivitäten, Aufgaben, Allgemeine Aufgaben, Projektaufgaben).
 *
 * Verantwortung:
 *   - Eine einheitliche, statusabhängige Lese-Hinweis-Zeile rendern.
 *   - Im Status `draft` nichts anzeigen (keine Sperre).
 *   - In allen anderen Lifecycle-Stati den passenden Hinweis zeigen, damit
 *     Lehrkräfte sofort verstehen, warum die Inhalte nicht editierbar sind.
 *
 * Die Komponente nimmt nur den Status entgegen – sie kennt weder die
 * Einheit noch den User. Sperr- und Lese-Logik wird in Workspace.jsx
 * (Single Source of Truth) gehandhabt.
 */

import React from 'react';
import { Lock, Truck, CheckCircle2 } from 'lucide-react';
import { EXPORT_LIFECYCLE_STATUS } from '@/lib/exportLifecycle';

const META = {
  [EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN]: {
    icon: Lock,
    cls: 'bg-orange-50 border-orange-200 text-orange-800',
    iconCls: 'text-orange-600',
    title: '🔒 Einheit final freigegeben',
    body: 'Inhalte sind jetzt gesperrt. Aufhebung in Tab „Dashboards" möglich, solange das Export-Team noch nicht gestartet hat.',
  },
  [EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING]: {
    icon: Truck,
    cls: 'bg-orange-50 border-orange-200 text-orange-800',
    iconCls: 'text-orange-600',
    title: '🚚 Im Export',
    body: 'Das Export-Team überträgt die Einheit gerade ins LMS. Eine Aufhebung ist hier nicht mehr möglich – nur noch im Export-Center.',
  },
  [EXPORT_LIFECYCLE_STATUS.PUBLISHED]: {
    icon: CheckCircle2,
    cls: 'bg-blue-50 border-blue-200 text-blue-800',
    iconCls: 'text-blue-600',
    title: '✅ In Moodle/Brian veröffentlicht',
    body: 'Die Einheit ist live. Inhalte können wieder bearbeitet werden – Änderungen werden als „modifiziert" markiert (Versionierung).',
  },
};

export default function EinheitExportLockBanner({ status }) {
  const meta = META[status];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <div className={`shrink-0 px-4 py-2.5 border-b text-xs flex items-start gap-2 ${meta.cls}`}>
      <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${meta.iconCls}`} />
      <div className="leading-relaxed">
        <strong>{meta.title}</strong>
        <span className="ml-1.5">{meta.body}</span>
      </div>
    </div>
  );
}