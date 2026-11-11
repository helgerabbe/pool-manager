import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, MessageSquareWarning } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';
import { useElementHinweise } from '@/hooks/useElementHinweise';
import { usePruefungLauf } from '@/hooks/usePruefung';
import PruefbefundKarte from '@/components/pruefung/PruefbefundKarte';

/**
 * Aufklappbarer Kasten unter „Nacharbeit vormerken": die offenen Hinweise der
 * Vollständigkeitsprüfung zu genau diesem Element. Entschieden wird wie im
 * Prüfbereich; ein entschiedener Hinweis verschwindet hier und bleibt dort stehen.
 */
export default function ElementHinweise({ einheitId, zielIds, gesperrt = false }) {
  const [offen, setOffen] = useState(false);
  const hinweise = useElementHinweise(einheitId)(zielIds);
  const { entscheiden } = usePruefungLauf(einheitId);
  const { data: me } = useQuery({ queryKey: ['aktuellerNutzer'], queryFn: () => base44.auth.me() });
  if (hinweise.length === 0) return null;

  return (
    <div className="rounded-lg border border-sky-300 bg-sky-50 px-3 py-2.5 space-y-2">
      <button type="button" onClick={() => setOffen((v) => !v)} className="w-full flex items-center gap-3 text-left">
        <div className="shrink-0 p-1.5 rounded-full bg-sky-200 text-sky-800">
          <MessageSquareWarning className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-sky-900">
            Hinweise zur Überarbeitung ({hinweise.length})
          </p>
          <p className="text-xs text-sky-800/80 mt-0.5">
            Rückmeldungen aus der Vollständigkeitsprüfung, vom Moodle-Team und von Schüler:innen zu genau dieser Stelle.
          </p>
        </div>
        <ChevronRight className={cn('w-4 h-4 shrink-0 text-sky-800 transition-transform', offen && 'rotate-90')} />
      </button>
      {offen && (
        <div className="space-y-2">
          {gesperrt && (
            <p className="text-xs text-sky-900">
              🔒 Das Lernpaket ist freigegeben. Zum Überarbeiten zuerst die Freigabe zurücknehmen.
            </p>
          )}
          {hinweise.map((b) => (
            <PruefbefundKarte key={b.id} befund={b} einheitId={einheitId}
              kannBewusstSetzen={me?.role === 'admin'} onEntscheiden={entscheiden} />
          ))}
        </div>
      )}
    </div>
  );
}