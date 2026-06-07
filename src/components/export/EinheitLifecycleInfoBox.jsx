/**
 * EinheitLifecycleInfoBox.jsx
 *
 * Infobox unter der Dashboard-/Freigabe-Zeile im Freigabe-Cockpit.
 *
 * Beschreibt in Klartext, in welchem Lebenszyklus-Zustand sich die GANZE
 * Einheit befindet — inklusive Zeitstempel des letzten Übergangs:
 *   - draft (nie freigegeben)   → „Noch nie nach Moodle exportiert."
 *   - final_freigegeben         → „Final freigegeben – wartet auf den Export."
 *   - export_running            → „Wird gerade nach Moodle exportiert."
 *   - published                 → „In Moodle veröffentlicht – wieder zur
 *                                  Bearbeitung freigegeben."
 *
 * Reines Anzeige-Element. Keine Mutationen, keine Logik außer Formatierung.
 */

import React from 'react';
import { Info, Lock, Truck, CheckCircle2, FileClock } from 'lucide-react';
import { EXPORT_LIFECYCLE_STATUS } from '@/lib/exportLifecycle';

function formatTimestamp(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return null;
  }
}

export default function EinheitLifecycleInfoBox({ data }) {
  if (!data) return null;

  const { status, changed_at, changed_by } = data;
  const changedTs = formatTimestamp(changed_at);

  const config = {
    [EXPORT_LIFECYCLE_STATUS.DRAFT]: {
      Icon: FileClock,
      cls: 'border-slate-200 bg-slate-50 text-slate-700',
      iconCls: 'text-slate-400',
      title: 'Noch nicht nach Moodle exportiert',
      body: 'Diese Einheit ist in Bearbeitung und wurde noch nicht final freigegeben. Sobald alle vier Dashboards geprüft sind, kannst du sie final freigeben und an das Export-Team übergeben.',
      showTs: false,
    },
    [EXPORT_LIFECYCLE_STATUS.FINAL_FREIGEGEBEN]: {
      Icon: Lock,
      cls: 'border-emerald-300 bg-emerald-50 text-emerald-800',
      iconCls: 'text-emerald-600',
      title: 'Final freigegeben – wartet auf den Export',
      body: 'Die Inhalte sind gesperrt. Das Export-Team sieht die Einheit jetzt im Export-Center und kann den Export nach Moodle starten.',
      showTs: true,
    },
    [EXPORT_LIFECYCLE_STATUS.EXPORT_RUNNING]: {
      Icon: Truck,
      cls: 'border-orange-300 bg-orange-50 text-orange-800',
      iconCls: 'text-orange-600',
      title: 'Wird gerade nach Moodle exportiert',
      body: 'Das Export-Team hat den Export gestartet. Die Inhalte bleiben gesperrt, bis der Export abgeschlossen ist.',
      showTs: true,
    },
    [EXPORT_LIFECYCLE_STATUS.PUBLISHED]: {
      Icon: CheckCircle2,
      cls: 'border-blue-300 bg-blue-50 text-blue-800',
      iconCls: 'text-blue-600',
      title: 'In Moodle veröffentlicht – wieder zur Bearbeitung freigegeben',
      body: 'Der Export ist abgeschlossen und alle Inhalte sind mit Moodle synchron. Die Einheit ist wieder zur Bearbeitung freigegeben – spätere Änderungen werden als „geändert" markiert.',
      showTs: true,
    },
  };

  const c = config[status] || config[EXPORT_LIFECYCLE_STATUS.DRAFT];
  const { Icon } = c;

  return (
    <div className={`rounded-lg border p-3 flex items-start gap-3 ${c.cls}`}>
      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${c.iconCls}`} />
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold">{c.title}</span>
          {c.showTs && changedTs && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium opacity-80">
              <Info className="w-3 h-3" />
              {changedTs}
              {changed_by ? ` · ${changed_by}` : ''}
            </span>
          )}
        </div>
        <p className="text-xs leading-relaxed opacity-90">{c.body}</p>
      </div>
    </div>
  );
}