/**
 * PruefungWarnungCard — weiche Sperre im Export-Center.
 *
 * Zeigt offene Befunde der Vollständigkeitsprüfung als Warnung. Der Export
 * bleibt bewusst jederzeit möglich; die Karte macht nur sichtbar, was im Kurs
 * später auffallen würde, und verlinkt in die Taskliste der Einheit.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { usePruefbefunde } from '@/hooks/usePruefung';

export default function PruefungWarnungCard({ einheitId }) {
  const { data: befunde = [], isLoading } = usePruefbefunde(einheitId);
  if (isLoading || befunde.length === 0) return null;

  const offen = befunde.filter((b) => b.entscheidung === 'offen');
  const bewusst = befunde.filter((b) => b.entscheidung === 'bewusst').length;
  const blockierend = offen.filter((b) => b.schwere === 'blockiert').length;

  if (offen.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
        <p className="text-sm text-emerald-900 flex-1">
          Vollständigkeitsprüfung: keine offenen Befunde
          {bewusst > 0 ? ` (${bewusst} bewusst gelassen – reisen mit)` : ''}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-amber-900">
            {offen.length} offene Befunde aus der Vollständigkeitsprüfung
          </h3>
          <p className="text-xs text-amber-800 mt-1">
            {blockierend > 0
              ? `Davon ${blockierend}, bei denen Schüler die Stelle nicht sinnvoll bearbeiten können.`
              : 'Der Export ist möglich – die Stellen fallen im Kurs aber auf.'}
          </p>
          <ul className="mt-2 space-y-0.5 text-xs text-amber-900">
            {offen.slice(0, 3).map((b) => (
              <li key={b.id} className="truncate">• {b.ziel_titel}: {b.befund}</li>
            ))}
            {offen.length > 3 && <li className="text-amber-700">… und {offen.length - 3} weitere</li>}
          </ul>
        </div>
        <Button asChild size="sm" variant="outline" className="shrink-0 bg-white">
          <Link to={`/workspace?einheit=${einheitId}&tab=pruefung`}>
            Zur Taskliste <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  );
}