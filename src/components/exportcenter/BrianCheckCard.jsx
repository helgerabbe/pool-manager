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
  // Zwei Stufen (2026-09-10): Dialogname und Anweisung für Lernende halten den
  // Dialog auf; interne Anweisung und Abbruchbedingung ergänzt der Bau notfalls
  // selbst und stehen deshalb nur als Hinweis dabei.
  const unvollstaendig = brianAufgaben
    .map((a) => {
      const fehlend = fehlendeBrianFelder(a);
      return {
        aufgabe: a,
        blockierend: fehlend.filter((f) => f.blockiert === true),
        hinweise: fehlend.filter((f) => f.blockiert !== true),
      };
    })
    .filter((x) => x.blockierend.length + x.hinweise.length > 0);
  const blockierendeAufgaben = unvollstaendig.filter((x) => x.blockierend.length > 0);
  const allesOk = blockierendeAufgaben.length === 0;

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
                {blockierendeAufgaben.length} Aufgabe
                {blockierendeAufgaben.length !== 1 ? 'n' : ''} offen
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Für Brian.study gibt es keine Schnittstelle — das MBK-Team legt jeden
            Dialog händisch anhand der vier Übergabefelder an. Ohne Dialogname und
            Anweisung für Lernende geht es nicht; interne Anweisung und
            Abbruchbedingung ergänzt das Team notfalls selbst.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {brianAufgaben.length} Aufgabe{brianAufgaben.length !== 1 ? 'n' : ''} mit
            Brian-Dialog geprüft.
          </p>
        </div>
      </div>

      {unvollstaendig.length > 0 && (
        <ul className="space-y-1.5">
          {unvollstaendig.map(({ aufgabe, blockierend, hinweise }) => (
            <li
              key={aufgabe.id}
              className={
                blockierend.length > 0
                  ? 'rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2'
                  : 'rounded-lg border border-border bg-muted/40 px-3 py-2'
              }
            >
              <Link
                to={`/einheiten/${einheitId}?tab=${aufgabe.anforderungsebene === '3 - Projekt' ? 'ebene3' : 'ebene2'}`}
                className="text-xs font-semibold hover:underline"
              >
                {aufgabe.titel || 'Ohne Titel'}
              </Link>
              <span className="text-[11px] text-muted-foreground ml-2">
                {aufgabe.anforderungsebene || 'Ebene unbekannt'}
              </span>
              {blockierend.length > 0 && (
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Fehlt: {blockierend.map((f) => f.label).join(', ')}
                </p>
              )}
              {hinweise.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Ergänzt das Moodle-Team notfalls selbst: {hinweise.map((f) => f.label).join(', ')}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}