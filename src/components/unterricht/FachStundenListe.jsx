import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarDays, ChevronRight, PlaySquare } from 'lucide-react';
import StundeLoeschenButton from '@/components/unterrichtsstunden/StundeLoeschenButton';

/** Die Unterrichtsstunden EINER Einheit. */
export default function FachStundenListe({ stunden = [] }) {
  if (stunden.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Noch keine Unterrichtsstunden.</p>;
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {stunden.map((s) => (
        <div key={s.id} className="flex items-center gap-1 pr-2 hover:bg-muted/20 transition-colors">
          <Link to={`/unterrichtsstunde/${s.id}`} className="flex items-center gap-3 px-3 py-2 flex-1 min-w-0">
            <PlaySquare className="w-4 h-4 text-accent shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{s.arbeitstitel}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                {s.datum && (
                  <>
                    <CalendarDays className="w-3 h-3" />
                    {format(new Date(s.datum), 'dd. MMM yyyy', { locale: de })} ·
                  </>
                )}
                {s.status === 'bereit' ? 'bereit für den Unterricht' : 'in Planung'}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
          <StundeLoeschenButton stunde={s} />
        </div>
      ))}
    </div>
  );
}