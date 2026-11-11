import React from 'react';
import { format } from 'date-fns';
import LernpaketLebenszyklusBadge from './LernpaketLebenszyklusBadge';
import LernpaketLernzieleButton from './LernpaketLernzieleButton';

// Zeitstempel ohne Zeitzone sind UTC.
export const zeit = (wert) => {
  if (!wert) return null;
  const d = new Date(/Z|[+-]\d\d:\d\d$/.test(wert) ? wert : `${wert}Z`);
  return isNaN(d) ? null : `${format(d, 'dd.MM.yyyy, HH:mm')} Uhr`;
};

export function Zeile({ label, children }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="w-56 shrink-0 text-muted-foreground">{label}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}

/** Aufklappbare Zusatzinformationen im Kopf des Lernpakets: Lernziele und Moodle-Stand. */
export default function LernpaketKopfDetails({ paket, einheit, lernziele }) {
  return (
    <div className="mt-3 rounded-lg border border-border bg-card p-3 space-y-2">
      <div className="flex items-center gap-2 flex-wrap pb-1">
        <LernpaketLernzieleButton lernziele={lernziele} />
        <LernpaketLebenszyklusBadge syncStatus={paket.sync_status} />
      </div>
      <Zeile label="Lernpaket freigegeben seit">
        {paket.content_status === 'approved' && paket.released_at ? zeit(paket.released_at) : 'noch nicht freigegeben'}
      </Zeile>
      <Zeile label="Zuletzt nach Moodle übertragen">
        {zeit(paket.last_synced_at) || 'für dieses Lernpaket nicht erfasst'}
      </Zeile>
      <Zeile label="Einheit zuletzt in den Export gegeben">
        {zeit(einheit?.last_exported_at) || 'nicht erfasst'}
      </Zeile>
      <Zeile label="Zuletzt geändert oder geöffnet">
        {zeit(paket.updated_date) || 'nicht erfasst'}
      </Zeile>
    </div>
  );
}