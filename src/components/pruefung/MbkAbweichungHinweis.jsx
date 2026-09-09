/**
 * MbkAbweichungHinweis — Kurs-Abweichungen direkt an der Stelle.
 *
 * Lädt die MBK-Befunde zu genau dieser Stelle (Aktivität, Aufgabe, Lernpaket)
 * und zeigt nur die, bei denen der gebaute Kurs vom Pool-Manager abweicht.
 * Damit stehen Korrektur- und Gestaltungshinweise dort, wo gearbeitet wird —
 * nicht nur in der Sammelliste des Prüfbereichs.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import MbkAbweichungBanner from './MbkAbweichungBanner';

export default function MbkAbweichungHinweis({ zielId, className }) {
  const { data: befunde = [] } = useQuery({
    queryKey: ['mbkAbweichung', zielId],
    enabled: !!zielId,
    queryFn: () => base44.entities.Pruefbefund.filter({ ziel_id: zielId, quelle: 'mbk' }),
  });

  const abweichungen = befunde.filter(
    (b) => b.kurs_umgehung && b.kurs_umgehung !== 'keine'
  );
  if (abweichungen.length === 0) return null;

  return (
    <div className={className}>
      <div className="space-y-2">
        {abweichungen.map((b) => (
          <MbkAbweichungBanner key={b.id} befund={b} />
        ))}
      </div>
    </div>
  );
}