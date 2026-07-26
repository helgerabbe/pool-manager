/**
 * components/workspace/lernpaketWizard/WizardBestandsAnalyse.jsx
 *
 * Super-Wizard Etappe 1: Bestandsanalyse + Struktur-Modus-Wahl.
 *
 * Zeigt vor der Generierung, was bereits im Lernpaket liegt (Aktivitäten
 * pro Phase, mit/ohne Inhalt), und lässt die Lehrkraft wählen, ob die KI
 * die vorhandenen Aktivitäten berücksichtigen (nur ergänzen) oder die
 * Struktur unabhängig neu denken soll. Der Wizard arbeitet grundsätzlich
 * NICHT-destruktiv: Bestehendes wird niemals gelöscht oder überschrieben.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { ShieldCheck, Puzzle, Lightbulb, CheckCircle2, CircleDashed } from 'lucide-react';

const PHASE_ORDER = ['Input', 'Übung', 'Abschluss'];
const PHASE_LABEL = { Input: 'Erarbeitung', 'Übung': 'Übung', Abschluss: 'Abschluss' };

export default function WizardBestandsAnalyse({
  aktivitaeten = [],       // bestehende LernpaketPhaseAktivitaet-Records (ohne Tombstones)
  katalog = [],            // AktivitaetenKatalog für Namensauflösung
  strukturModus,           // 'ergaenzen' | 'neu'
  onModusChange,
  disabled = false,
}) {
  if (aktivitaeten.length === 0) return null;

  const katalogById = new Map(katalog.map((k) => [k.id, k.name]));
  const befuellt = aktivitaeten.filter((a) => a.is_complete === true).length;

  const modi = [
    {
      key: 'ergaenzen',
      icon: Puzzle,
      titel: 'Vorhandene Aktivitäten berücksichtigen',
      text: 'Die KI kennt deinen Bestand und schlägt nur sinnvolle Ergänzungen vor.',
    },
    {
      key: 'neu',
      icon: Lightbulb,
      titel: 'Struktur neu denken',
      text: 'Die KI plant unabhängig vom Bestand. Deine Aktivitäten bleiben erhalten — der Vorschlag wird daneben angelegt.',
    },
  ];

  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 space-y-2.5 text-xs">
      {/* Bestandsübersicht */}
      <div className="space-y-1.5">
        <p className="font-semibold text-foreground">
          Bereits im Lernpaket: {aktivitaeten.length} Aktivität{aktivitaeten.length !== 1 ? 'en' : ''}
          <span className="font-normal text-muted-foreground"> ({befuellt} mit Inhalt befüllt)</span>
        </p>
        <div className="space-y-1">
          {PHASE_ORDER.map((phase) => {
            const items = aktivitaeten.filter((a) => a.phase === phase);
            if (items.length === 0) return null;
            return (
              <div key={phase} className="flex items-start gap-2 flex-wrap">
                <span className="uppercase tracking-wide text-[10px] font-medium text-muted-foreground mt-0.5 shrink-0 w-20">
                  {PHASE_LABEL[phase]}:
                </span>
                <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                  {items.map((a) => (
                    <span
                      key={a.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-border bg-background text-[11px]"
                      title={a.is_complete ? 'Inhalt vorhanden — wird nicht überschrieben' : 'Noch ohne Inhalt'}
                    >
                      {a.is_complete
                        ? <CheckCircle2 className="w-3 h-3 text-green-600" />
                        : <CircleDashed className="w-3 h-3 text-amber-500" />}
                      {katalogById.get(a.aktivitaet_id) || 'Unbekannt'}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Struktur-Modus-Wahl */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {modi.map((m) => {
          const Icon = m.icon;
          const active = strukturModus === m.key;
          return (
            <button
              key={m.key}
              type="button"
              disabled={disabled}
              onClick={() => onModusChange(m.key)}
              className={cn(
                'text-left rounded-md border p-2.5 transition-all disabled:opacity-50',
                active
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border bg-background hover:border-primary/40'
              )}
            >
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                <Icon className={cn('w-3.5 h-3.5', active ? 'text-primary' : 'text-muted-foreground')} />
                {m.titel}
              </span>
              <span className="block mt-0.5 text-muted-foreground leading-snug">{m.text}</span>
            </button>
          );
        })}
      </div>

      {/* Nicht-destruktiv-Garantie */}
      <p className="flex items-start gap-1.5 text-muted-foreground leading-snug">
        <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
        <span>
          Der KI-Assistent löscht und überschreibt <strong>niemals</strong> etwas: Befüllte Aufgaben bleiben
          unangetastet, neue Aktivitäten kommen nur hinzu. Nicht mehr Benötigtes löschst du selbst.
        </span>
      </p>
    </div>
  );
}