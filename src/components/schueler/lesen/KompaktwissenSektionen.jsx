import { Compass, BookOpen, Brain, ListOrdered, Quote, Star, AlertTriangle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import KompaktwissenText from './KompaktwissenText';
import { parseKompaktwissen } from '@/lib/kompaktwissenSektionen';

const ICONS = {
  compass: Compass, book: BookOpen, brain: Brain, steps: ListOrdered,
  quote: Quote, star: Star, warn: AlertTriangle, dot: Circle,
};

/**
 * Farbig gestaltete Darstellung des Kompaktwissens: jeder Abschnitt wird als
 * eigene Karte mit Farbe und Icon gezeigt. Merksätze („Merke dir“, „Tipp“)
 * erscheinen als deutlich hervorgehobener Merkkasten.
 */
export default function KompaktwissenSektionen({ text = '', className = '' }) {
  const sektionen = parseKompaktwissen(text);
  if (sektionen.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {sektionen.map((s, i) => {
        const Icon = ICONS[s.thema.icon] || Circle;
        const merke = !!s.thema.merke;
        return (
          <section
            key={i}
            className={cn(
              'rounded-xl border px-4 py-3.5',
              s.thema.karte,
              merke && 'border-2 shadow-sm ring-2 ring-amber-100',
            )}
          >
            {s.titel && (
              <h3 className={cn('flex items-center gap-2 font-bold mb-2', s.thema.titel, merke ? 'text-base' : 'text-sm')}>
                <span className={cn('flex items-center justify-center w-7 h-7 rounded-lg shrink-0', s.thema.chip)}>
                  <Icon className={merke ? 'w-4 h-4 fill-current' : 'w-4 h-4'} />
                </span>
                {s.titel}
              </h3>
            )}
            {s.body && (
              <KompaktwissenText
                text={s.body}
                className={cn(merke && 'font-medium', s.thema.punkt)}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}