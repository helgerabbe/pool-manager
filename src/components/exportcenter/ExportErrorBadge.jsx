/**
 * ExportErrorBadge.jsx
 *
 * Phase G: Kleines rotes Badge "Export fehlgeschlagen".
 *
 * Wird überall dort angezeigt, wo Lehrkräfte Items sehen, die das
 * Export-Center im Abschluss-Dialog als „nicht in Moodle angekommen"
 * markiert hat. Sobald die Lehrkraft das Item bearbeitet, setzen
 * updateActivitySecure / updateLernpaketSecure / syncLernpfadMembership
 * das Flag automatisch wieder auf false zurück → Badge verschwindet.
 *
 * Render-Vertrag: rendert nichts, wenn `show` falsy ist – Aufrufer
 * können das Badge ohne weitere Conditionals einbinden.
 */

import React from 'react';
import { AlertOctagon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function ExportErrorBadge({ show, size = 'sm', className = '' }) {
  if (!show) return null;
  const sizeCls = size === 'xs' ? 'text-[9px] px-1.5 py-0.5 gap-1' : 'text-[10px] px-2 py-0.5 gap-1';
  const iconCls = size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  return (
    <Badge
      className={cn(
        'bg-red-100 text-red-800 border border-red-300 hover:bg-red-100 whitespace-nowrap shrink-0',
        sizeCls,
        className
      )}
      title="Beim letzten Moodle-Export ist dieses Element nicht angekommen. Bearbeite es, um den Hinweis zu entfernen."
    >
      <AlertOctagon className={iconCls} />
      Export fehlgeschlagen
    </Badge>
  );
}