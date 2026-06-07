import React from 'react';
import { AlertCircle, AlertTriangle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const kategorieColors = {
  'Fachwissen': 'bg-blue-100 text-blue-700',
  'Fähigkeit/Fertigkeit': 'bg-amber-100 text-amber-700',
};

export const bausteinColors = {
  'Pre-Test': 'bg-yellow-100 text-yellow-700',
  'Input': 'bg-blue-100 text-blue-700',
  'Ebene-1-Übung': 'bg-green-100 text-green-700',
  'Ebene-2-Aufgabe': 'bg-cyan-100 text-cyan-700',
  'Ebene-3-Projekt': 'bg-purple-100 text-purple-700',
  'Exit-Check': 'bg-orange-100 text-orange-700',
  'Prüfung Typ A': 'bg-red-100 text-red-700',
  'Prüfung Typ B': 'bg-red-100 text-red-700',
  'Prüfung Typ C': 'bg-red-100 text-red-700',
};

export function AmpelBanner({ status, message }) {
  if (!status || status === 'green') return null;
  const cfg = status === 'yellow'
    ? { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', Icon: AlertCircle }
    : { bg: 'bg-red-50 border-red-200', text: 'text-red-600', Icon: AlertTriangle };
  const { bg, text, Icon } = cfg;
  return (
    <div className={`flex items-start gap-2 p-3 rounded-lg border text-sm mb-4 ${bg} ${text}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
}

export function StatusBadge({ status }) {
  if (!status) return null;
  const cfg = {
    green: 'bg-green-100 text-green-700',
    yellow: 'bg-amber-100 text-amber-700',
    red: 'bg-red-100 text-red-600',
    // 'new' = noch nie Aktivitäten zugeordnet → neutral grau, nicht rot.
    new: 'bg-slate-100 text-slate-600',
    // 'released' = Lernpaket freigegeben → kräftiges Dunkelgrün, weiße Schrift.
    released: 'bg-green-700 text-white',
  };
  const label = {
    green: 'Vollständig',
    yellow: 'In Bearbeitung',
    red: 'Unvollständig',
    new: 'Neu',
    released: 'Freigegeben',
  };
  // Erklärende Tooltips je Status. „Neu" = noch nie nach Moodle exportiert.
  // Die übrigen Texte sind als Platzhalter für spätere Status-Badges schon
  // hinterlegt, damit überall derselbe Tooltip erscheint.
  const tooltip = {
    green: 'Dieses Lernpaket ist vollständig und bereit zum Export.',
    yellow: 'Dieses Lernpaket befindet sich noch in Bearbeitung.',
    red: 'Diesem Lernpaket fehlen noch Inhalte – es ist unvollständig.',
    new: 'Dieses Lernpaket wurde noch nie nach Moodle exportiert.',
    released: 'Dieses Lernpaket ist freigegeben und alle Inhalte sind gesperrt.',
  };
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg[status] || ''}`}>
            {label[status]}
          </span>
        </TooltipTrigger>
        {tooltip[status] && (
          <TooltipContent side="bottom">{tooltip[status]}</TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

export function StepEmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  status = 'red',
}) {
  const ringColor = status === 'red' ? 'bg-red-50 ring-2 ring-red-100' : 'bg-muted';
  const iconColor = status === 'red' ? 'text-red-300' : 'text-muted-foreground/50';
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${ringColor}`}>
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <div>
        <p className="font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">{description}</p>
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="gap-2">
          <Plus className="w-4 h-4" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}