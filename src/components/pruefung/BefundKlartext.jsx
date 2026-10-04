/**
 * BefundKlartext — Datum, Stapel und verständliche KI-Fassung eines MBK-Hinweises.
 * Der Originaltext des Moodle-Teams bleibt darunter aufklappbar erhalten.
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Sparkles } from 'lucide-react';
import { MBK_STAPEL, formatDatum } from '@/lib/mbkStapel';

export function BefundDatum({ befund }) {
  const datum = befund.mbk_gemeldet_am || befund.created_date;
  if (!datum) return null;
  return (
    <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
      <CalendarDays className="w-3.5 h-3.5" /> gemeldet am {formatDatum(datum)}
    </span>
  );
}

export default function BefundKlartext({ befund }) {
  const stapel = MBK_STAPEL[befund.ki_stapel];
  if (!befund.ki_klartext) return null;
  return (
    <div className="rounded-md border border-primary/20 bg-primary/5 p-2.5 space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Sparkles className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-semibold text-primary">Kurz gesagt</span>
        {stapel && <Badge variant="outline" className={stapel.cls}>{stapel.label}</Badge>}
      </div>
      <p className="text-sm font-medium">{befund.ki_klartext}</p>
      {befund.ki_naechster_schritt && (
        <p className="text-xs text-muted-foreground">Nächster Schritt: {befund.ki_naechster_schritt}</p>
      )}
    </div>
  );
}