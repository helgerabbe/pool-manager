/**
 * MbkStapelLeiste — Knopf „Von KI vorsortieren" + Stapel-Filter über der Hinweisliste.
 */
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MBK_STAPEL } from '@/lib/mbkStapel';

export default function MbkStapelLeiste({ einheitId, offene, filter, onFilter, kannStarten }) {
  const qc = useQueryClient();
  const [laeuft, setLaeuft] = useState(false);
  const unsortiert = offene.filter((b) => !b.ki_stapel).length;

  const sortieren = async () => {
    setLaeuft(true);
    const res = await base44.functions.invoke('mbkVorsortierung', { einheit_id: einheitId, nur_neue: unsortiert > 0 })
      .catch((e) => ({ data: { error: e.response?.data?.error || e.message } }));
    setLaeuft(false);
    if (res.data?.error) return toast.error(res.data.error);
    toast.success(`${res.data.sortiert} Hinweise vorsortiert.`);
    qc.invalidateQueries({ queryKey: ['mbkBefunde', einheitId] });
  };

  const chip = (key, label, anzahl, cls) => (
    <button key={key} type="button" onClick={() => onFilter(key)}
      className={cn('px-2.5 py-1 rounded-md border text-xs font-medium', cls, filter === key && 'ring-2 ring-primary')}>
      {label} ({anzahl})
    </button>
  );

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <p className="text-sm flex-1 min-w-[220px]">
          {unsortiert > 0
            ? `${unsortiert} Hinweise sind noch nicht vorsortiert. Die KI liest sie, erklärt sie verständlich und legt sie auf Stapel.`
            : 'Alle Hinweise sind vorsortiert. Arbeite die Stapel nacheinander ab.'}
        </p>
        {kannStarten && (
          <Button size="sm" onClick={sortieren} disabled={laeuft || offene.length === 0}>
            {laeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {laeuft ? 'KI sortiert … (bis zu 1 Min.)' : unsortiert > 0 ? 'Von KI vorsortieren' : 'Neu vorsortieren'}
          </Button>
        )}
      </div>
      <div className="flex gap-2 flex-wrap">
        {chip('alle', 'Alle', offene.length, 'bg-card')}
        {Object.entries(MBK_STAPEL).map(([k, s]) =>
          chip(k, s.label, offene.filter((b) => b.ki_stapel === k).length, s.cls))}
        {unsortiert > 0 && chip('ohne', 'Noch nicht sortiert', unsortiert, 'bg-card')}
      </div>
    </div>
  );
}