import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const META = {
  eingegangen: { label: 'Eingegangen', klasse: 'bg-blue-50 text-blue-800 border-blue-200' },
  geprueft: { label: 'Geprüft', klasse: 'bg-amber-50 text-amber-800 border-amber-200' },
  ausgefuehrt: { label: 'Durchgeführt', klasse: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  abgelehnt: { label: 'Abgelehnt', klasse: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function AuftragStatusBadge({ status, pruefstatus }) {
  const meta = META[status] || META.eingegangen;
  return (
    <div className="flex items-center gap-1.5">
      <Badge variant="outline" className={cn('font-medium', meta.klasse)}>
        {meta.label}
      </Badge>
      {status !== 'ausgefuehrt' && pruefstatus === 'ausfuehrbar' && (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
          vollständig
        </Badge>
      )}
    </div>
  );
}