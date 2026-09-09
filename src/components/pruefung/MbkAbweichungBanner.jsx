/**
 * MbkAbweichungBanner — „So weicht der Kurs hier ab".
 *
 * Ein Satz dazu, was das Moodle-Team an dieser Stelle im gebauten Kurs anders
 * gemacht hat (Feld `kurs_umgehung` der MBK-Rückmeldung). Wird sowohl in der
 * Taskliste als auch direkt an der Aktivität gezeigt — die Fachgruppe soll
 * nicht raten müssen, warum der Kurs anders aussieht als ihre Fassung.
 */
import React from 'react';
import { GitCompareArrows } from 'lucide-react';
import { getUmgehung } from '@/lib/pruefungKategorien';
import { cn } from '@/lib/utils';

export default function MbkAbweichungBanner({ befund, className }) {
  const info = getUmgehung(befund?.kurs_umgehung);
  if (!info) return null;

  return (
    <div className={cn('rounded-lg border px-3 py-2 text-xs space-y-1', info.cls, className)}>
      <p className="font-semibold flex items-center gap-1.5">
        <GitCompareArrows className="w-3.5 h-3.5" />
        So weicht der Kurs hier ab: {info.label}
      </p>
      <p className="opacity-90">{info.erklaerung}</p>
      {befund?.befund && <p className="opacity-80">{befund.befund}</p>}
    </div>
  );
}