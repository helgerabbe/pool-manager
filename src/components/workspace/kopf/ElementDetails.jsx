import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zeile, zeit } from '@/components/workspace/panels/LernpaketKopfDetails';

/**
 * Aufklappbare Zusatzinformationen im Kopf eines Elements oder einer Aufgabe:
 * eigene Angaben (`children`), dann wer es angelegt und zuletzt geändert hat
 * und seit wann das Lernpaket freigegeben ist.
 */
export default function ElementDetails({ record, resourceType, paket = null, children = null }) {
  // Die letzte Änderung mit Person steht im Änderungsprotokoll.
  const { data: letzte } = useQuery({
    queryKey: ['letzteAenderung', resourceType, record.id, record.updated_date],
    queryFn: async () => {
      const seite = await base44.entities.AuditLog.filter(
        { resource_type: resourceType, resource_id: record.id, action: 'UPDATE', status: 'success' },
        { sort: '-created_date', limit: 1 },
      );
      return (Array.isArray(seite) ? seite : seite.items)[0] || null;
    },
  });
  const freigegeben = paket?.content_status === 'approved' && !!paket?.released_at;

  return (
    <div className="mt-3 rounded-lg border border-border bg-card p-3 space-y-2">
      {children}
      <Zeile label="Angelegt">
        {[record.created_by, zeit(record.created_date)].filter(Boolean).join(' · ') || 'nicht erfasst'}
      </Zeile>
      <Zeile label="Zuletzt geändert">
        {letzte
          ? `${letzte.user_email} · ${zeit(letzte.created_date)}`
          : `${zeit(record.updated_date) || 'nicht erfasst'} (wer es war, wird erst ab jetzt festgehalten)`}
      </Zeile>
      {paket?.id && (
        <Zeile label="Lernpaket freigegeben seit">
          {freigegeben ? zeit(paket.released_at) : 'noch nicht freigegeben'}
        </Zeile>
      )}
    </div>
  );
}