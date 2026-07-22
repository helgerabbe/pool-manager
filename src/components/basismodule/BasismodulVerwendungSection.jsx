import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Link2, Loader2, BookOpen, ArrowRight } from 'lucide-react';
import { getBasismodulVerwendung } from '@/lib/basismodulVerknuepfung';
import HelpBadge from '@/components/ui/HelpBadge';

/**
 * Tab 1 der Basismodul-Ansicht: Zeigt, in welchen Einheiten die Lernziele
 * dieses Basismoduls bereits als Basis-Vorwissen verlinkt sind.
 * Solange Verknüpfungen bestehen, kann das Basismodul nicht gelöscht werden.
 */
export default function BasismodulVerwendungSection({ einheitId }) {
  const { data: verwendungen = [], isLoading } = useQuery({
    queryKey: ['basismodul-verwendung', einheitId],
    queryFn: () => getBasismodulVerwendung(einheitId),
    enabled: !!einheitId,
  });

  return (
    <div>
      <h2 className="text-lg font-semibold flex items-center gap-1.5">
        <Link2 className="w-4 h-4 text-violet-600" />
        Verwendung in Einheiten
        <HelpBadge text="Zeigt, in welchen Einheiten Lernziele dieses Basismoduls als Basis-Vorwissen mit Aufgaben verknüpft sind. Solange solche Verknüpfungen bestehen, kann weder das Basismodul noch das verlinkte Lernziel gelöscht werden." />
      </h2>
      <p className="text-sm text-muted-foreground mt-0.5 mb-3">
        Hier sind die Lernziele dieses Basismoduls als Vorwissen verlinkt.
      </p>

      <div className="p-5 rounded-xl border bg-card space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verwendungen werden geprüft …
          </div>
        ) : verwendungen.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
            Dieses Basismodul ist noch in keiner Einheit verlinkt.
          </p>
        ) : (
          verwendungen.map((v) => (
            <div key={v.einheitId || v.einheitTitel} className="rounded-lg border bg-background overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border-b border-violet-200">
                <BookOpen className="w-3.5 h-3.5 text-violet-600 shrink-0" />
                {v.einheitId ? (
                  <Link
                    to={`/einheiten/${v.einheitId}?tab=einheit`}
                    className="text-sm font-semibold text-violet-900 hover:underline flex items-center gap-1 min-w-0"
                  >
                    <span className="truncate">{v.einheitTitel}</span>
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-violet-900 truncate">{v.einheitTitel}</span>
                )}
                <span className="ml-auto text-xs text-violet-700 shrink-0">
                  {v.aufgaben.length} Aufgabe{v.aufgaben.length !== 1 ? 'n' : ''}
                </span>
              </div>
              <div className="p-2.5 space-y-2">
                {v.aufgaben.map((a) => (
                  <div key={a.id} className="text-xs">
                    <p className="font-medium text-foreground">{a.titel}</p>
                    {a.lernziele.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {a.lernziele.map((text, idx) => (
                          <li key={idx} className="flex items-start gap-1.5 text-muted-foreground">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-violet-400 shrink-0" />
                            <span className="leading-snug">{text}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}