/**
 * BrianCheckCard.jsx
 *
 * Export-Center, Info-Tab: Prüft für die ausgewählte Einheit, ob ALLE
 * Aufgaben mit Brian-Dialog ihre vier Übergabefelder erzeugt haben.
 *
 * Warum das hart geprüft wird: Für Brian.study gibt es keine API. Das
 * MBK-Team legt jeden Dialog händisch anhand dieser vier Felder an — sie
 * werden im Export-Payload (`brian_dialog`) mitgeliefert. Fehlt ein Feld,
 * kann der Dialog dort nicht gebaut werden.
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Bot, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { istBrianAufgabe, fehlendeBrianFelder } from '@/lib/brianFelder';

export default function BrianCheckCard({ einheitId }) {
  const { data: aufgaben = [], isLoading } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () => base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId }),
    enabled: !!einheitId,
  });

  if (!einheitId || isLoading) return null;

  const brianAufgaben = aufgaben.filter(
    (a) => a && a.sync_status !== 'to_delete' && istBrianAufgabe(a)
  );
  const unvollstaendig = brianAufgaben
    .map((a) => ({ aufgabe: a, fehlend: fehlendeBrianFelder(a) }))
    .filter((x) => x.fehlend.length > 0);
  const allesOk = unvollstaendig.length === 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold">KI-Tutor Brian: Übergabefelder</h3>
            {allesOk ? (
              <Badge className="bg-emerald-100 text-emerald-800 border border-emerald-300 gap-1 text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                Vollständig
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-900 border border-amber-300 gap-1 text-[11px]">
                <AlertTriangle className="w-3 h-3" />
                {unvollstaendig.length} Aufgabe{unvollstaendig.length !== 1 ? 'n' : ''} offen
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Für Brian.study gibt es keine Schnittstelle — das MBK-Team legt jeden
            Dialog händisch anhand der vier Übergabefelder an. Sie gehen mit dem
            Export mit; fehlt eines, kann der Dialog nicht gebaut werden.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {brianAufgaben.length} Aufgabe{brianAufgaben.length !== 1 ? 'n' : ''} mit
            Brian-Dialog geprüft.
          </p>
        </div>
      </div>

      {!allesOk && (
        <ul className="space-y-1.5">
          {unvollstaendig.map(({ aufgabe, fehlend }) => (
            <li
              key={aufgabe.id}
              className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2"
            >
              <Link
                to={`/einheiten/${einheitId}`}
                className="text-xs font-semibold text-amber-900 hover:underline"
              >
                {aufgabe.titel || 'Ohne Titel'}
              </Link>
              <span className="text-[11px] text-amber-800/80 ml-2">
                {aufgabe.anforderungsebene || 'Ebene unbekannt'}
              </span>
              <p className="text-[11px] text-amber-800 mt-0.5">
                Fehlt: {fehlend.map((f) => f.label).join(', ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}