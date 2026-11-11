import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Zeile, zeit } from '@/components/workspace/panels/LernpaketKopfDetails';

const spaeteste = (aufgaben, feld) =>
  aufgaben.reduce((a, b) => (!a || (b[feld] || '') > (a[feld] || '') ? b : a), null);

/**
 * Aufklappbare Zusatzinformationen im Kopf von „Einstieg" und „Gesamtaufgabe".
 * Der Platz hat keinen eigenen Datensatz – die Angaben stammen aus seinen Aufgaben.
 */
export default function ThemenfeldPlatzDetails({ aufgaben, freigegeben }) {
  const zuletzt = spaeteste(aufgaben, 'updated_date');
  // Wer es war, steht im Änderungsprotokoll.
  const { data: eintrag } = useQuery({
    queryKey: ['letzteAenderung', 'AllgemeineAufgabe', zuletzt?.id, zuletzt?.updated_date],
    queryFn: async () => {
      const seite = await base44.entities.AuditLog.filter(
        { resource_type: 'AllgemeineAufgabe', resource_id: zuletzt.id, action: 'UPDATE', status: 'success' },
        { sort: '-created_date', limit: 1 },
      );
      return (Array.isArray(seite) ? seite : seite.items)[0] || null;
    },
    enabled: !!zuletzt,
  });

  return (
    <div className="mt-3 rounded-lg border border-border bg-card p-3 space-y-2">
      <Zeile label="Aufgaben">
        {aufgaben.length === 0 ? 'noch keine' : `${aufgaben.length}, davon ${aufgaben.filter((a) => a.pflicht !== false).length} Pflicht`}
      </Zeile>
      <Zeile label="Zuletzt geändert">
        {!zuletzt ? 'noch nichts'
          : `${eintrag ? `${eintrag.user_email} · ${zeit(eintrag.created_date)}` : zeit(zuletzt.updated_date)}${zuletzt.titel ? ` („${zuletzt.titel}")` : ''}`}
      </Zeile>
      <Zeile label="Freigegeben seit">
        {freigegeben ? zeit(spaeteste(aufgaben, 'released_at')?.released_at) || 'nicht erfasst' : 'noch nicht freigegeben'}
      </Zeile>
    </div>
  );
}