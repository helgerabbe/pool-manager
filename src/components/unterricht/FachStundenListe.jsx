import React from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarDays, ChevronRight, PlaySquare, ClipboardList } from 'lucide-react';
import StundeLoeschenButton from '@/components/unterrichtsstunden/StundeLoeschenButton';
import VeroeffentlichenButton from '@/components/bibliothek/VeroeffentlichenButton';

/** Die Unterrichtsstunden EINER Einheit. */
export default function FachStundenListe({ stunden = [], unterrichtseinheit }) {
  if (stunden.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Noch keine Unterrichtsstunden.</p>;
  }

  return (
    <div className="divide-y rounded-lg border bg-card">
      {stunden.map((s) => (
        <div key={s.id} className="flex items-center gap-1 pr-2 hover:bg-muted/20 transition-colors">
          <Link to={s.planer_stand && s.planer_stand.phase !== 'fertig' ? `/unterrichtseinheit/${s.unterrichtseinheit_id}/stundenplaner?stunde=${s.id}` : `/unterrichtsstunde/${s.id}/editor`} className="flex items-center gap-3 px-3 py-2 flex-1 min-w-0">
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
          {s.planer_stand && (
            <Link to={`/unterrichtseinheit/${s.unterrichtseinheit_id}/stundenplaner?stunde=${s.id}`} title="Planung der Stunde öffnen"
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground">
              <ClipboardList className="w-3.5 h-3.5" /> Planung
            </Link>
          )}
          <VeroeffentlichenButton art="stunde" quelle={s} unterrichtseinheit={unterrichtseinheit} />
          <StundeLoeschenButton stunde={s} />
        </div>
      ))}
    </div>
  );
}