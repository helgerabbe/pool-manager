/**
 * NacharbeitToggle
 * ────────────────
 * Vereinfachter Freigabe-Workflow (2026-08-11): Aktivitäten werden nicht mehr
 * einzeln freigegeben — sie sind vollständig oder nicht. Stattdessen kann die
 * Lehrkraft hier selbst markieren, dass sie an dieser Aktivität später noch
 * einmal nachschärfen möchte („Nacharbeit"), optional mit kurzer Notiz.
 *
 * Rein informativ: blockiert weder die Bearbeitung noch die Freigabe des
 * Lernpakets.
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PencilRuler, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function NacharbeitToggle({ activity, disabled = false }) {
  const queryClient = useQueryClient();
  const aktiv = activity?.braucht_nacharbeit === true;
  const [notizOffen, setNotizOffen] = useState(false);
  const [notiz, setNotiz] = useState(activity?.nacharbeit_notiz || '');

  const save = useMutation({
    mutationFn: (updates) => base44.entities.LernpaketPhaseAktivitaet.update(activity.id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    },
    onError: () => toast.error('Konnte nicht gespeichert werden.'),
  });

  if (!activity?.id) return null;

  const toggle = () => {
    const next = !aktiv;
    save.mutate({ braucht_nacharbeit: next, ...(next ? {} : { nacharbeit_notiz: '' }) });
    setNotizOffen(next);
    if (!next) setNotiz('');
  };

  return (
    <div className={cn(
      'rounded-lg border px-3 py-2.5 space-y-2',
      aktiv ? 'border-amber-300 bg-amber-50' : 'border-border bg-muted/20'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'shrink-0 p-1.5 rounded-full',
          aktiv ? 'bg-amber-200 text-amber-800' : 'bg-muted text-muted-foreground'
        )}>
          <PencilRuler className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-semibold', aktiv ? 'text-amber-900' : 'text-foreground')}>
            {aktiv ? 'Für Nacharbeit markiert' : 'Nacharbeit vormerken'}
          </p>
          <p className={cn('text-xs mt-0.5', aktiv ? 'text-amber-800/80' : 'text-muted-foreground')}>
            {aktiv
              ? 'Diese Aktivität erscheint mit einer Nacharbeit-Markierung — Freigabe bleibt möglich.'
              : 'Merke dir selbst, dass du hier später noch einmal nachschärfen möchtest.'}
          </p>
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={disabled || save.isPending}
          className={cn(
            'shrink-0 h-6 w-11 rounded-full flex items-center p-0.5 transition-colors disabled:opacity-50',
            aktiv ? 'bg-amber-500 justify-end' : 'bg-slate-300 justify-start'
          )}
          title={aktiv ? 'Markierung entfernen' : 'Für Nacharbeit vormerken'}
        >
          {save.isPending
            ? <Loader2 className="h-5 w-5 animate-spin text-white" />
            : <div className="h-5 w-5 rounded-full bg-white shadow-md" />}
        </button>
      </div>

      {aktiv && (
        notizOffen ? (
          <div className="space-y-1.5">
            <textarea
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              rows={2}
              placeholder="Was soll noch nachgearbeitet werden?"
              className="w-full px-3 py-2 rounded-lg border border-amber-300 bg-white text-sm"
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                className="h-7 gap-1.5 text-xs"
                disabled={save.isPending}
                onClick={() => {
                  save.mutate({ nacharbeit_notiz: notiz });
                  setNotizOffen(false);
                }}
              >
                <Check className="w-3.5 h-3.5" /> Notiz speichern
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setNotizOffen(true)}
            disabled={disabled}
            className="w-full text-left text-xs text-amber-900 bg-white/70 border border-amber-200 rounded-md px-2.5 py-1.5 hover:bg-white"
          >
            {activity.nacharbeit_notiz || 'Notiz hinzufügen…'}
          </button>
        )
      )}
    </div>
  );
}