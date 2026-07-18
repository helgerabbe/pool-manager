/**
 * ThemenfeldUebersichtPanel.jsx
 *
 * Inhaltsbereich-Übersicht für ein in der Sidebar gewähltes Themenfeld
 * (Tab „Allgemeine Aufgaben"). Zeigt:
 *   - Titel des Themenfelds + Anzahl vorhandener Aufgaben
 *   - Die drei Erstell-Aktionen (Neue Aufgabe / KI-Ideenbox / Mit KI entwerfen)
 *   - Eine klickbare Liste der bereits angelegten Aufgaben
 *
 * Lehrkräfte denken in Themenfeldern — dieser Anker macht den Einstieg
 * intuitiver als der frühere globale „Neue Aufgabe"-Button in der Sidebar.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Plus,
  Lightbulb,
  Wand2,
  Folder,
  Lock,
  PenLine,
  FileText,
} from 'lucide-react';
import { getAufgabenTyp } from '@/lib/aufgabenTypen';

function AufgabeKarte({ aufgabe, onSelect }) {
  const hatTitel = !!aufgabe.titel?.trim();
  const isApproved = aufgabe.content_status === 'approved';
  const istSequenz = aufgabe.aufgaben_modus === 'sequenz';
  const typMeta = getAufgabenTyp(aufgabe.aufgaben_typ);
  const TypIcon = typMeta.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(aufgabe)}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-colors text-left"
    >
      {isApproved ? (
        <Lock className="w-4 h-4 text-green-600 shrink-0" />
      ) : (
        <PenLine className="w-4 h-4 text-amber-500 shrink-0" />
      )}
      <span className={cn('text-sm flex-1 truncate', !hatTitel && 'italic text-muted-foreground')}>
        {hatTitel ? aufgabe.titel : 'Kein Titel'}
      </span>
      <span
        className={cn(
          'inline-flex items-center gap-1 h-5 px-2 rounded-full border text-[10px] font-semibold shrink-0',
          typMeta.color.bg,
          typMeta.color.text,
          typMeta.color.border
        )}
      >
        <TypIcon className="w-3 h-3" />
        {typMeta.label}
      </span>
      {istSequenz && (
        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 shrink-0">
          Sequenz
        </span>
      )}
      <span
        className={cn(
          'text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0',
          isApproved
            ? 'bg-green-100 text-green-700 border-green-300'
            : 'bg-amber-100 text-amber-700 border-amber-300'
        )}
      >
        {isApproved ? 'Freigegeben' : 'Entwurf'}
      </span>
    </button>
  );
}

export default function ThemenfeldUebersichtPanel({
  themenfeld,
  aufgaben = [],
  kannBearbeiten = false,
  isEbene3 = false,
  onSelectAufgabe,
  onNeueAufgabe,
  onOpenIdeenbox,
  onOpenWizard,
}) {
  const istOhneThemenfeld = themenfeld?.id === '_none';

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto p-6 space-y-5">
        {/* Kopf: Themenfeld-Titel + Anzahl */}
        <div className="pb-4 border-b border-border">
          <div className="flex items-center gap-2 text-muted-foreground text-xs font-semibold uppercase tracking-wide mb-1">
            <Folder className="w-3.5 h-3.5" />
            Themenfeld
          </div>
          <h2 className="text-xl font-bold leading-snug">{themenfeld?.titel}</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {aufgaben.length === 0
              ? 'Noch keine Aufgaben in diesem Themenfeld.'
              : `${aufgaben.length} ${aufgaben.length === 1 ? 'Aufgabe' : 'Aufgaben'} in diesem Themenfeld.`}
          </p>
        </div>

        {/* Erstell-Aktionen */}
        {kannBearbeiten && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={() => onNeueAufgabe?.(istOhneThemenfeld ? null : themenfeld?.id)} className="gap-2">
              <Plus className="w-4 h-4" />
              Neue Aufgabe{istOhneThemenfeld ? '' : ' zu diesem Themenfeld'}
            </Button>
            {!isEbene3 && (
              <>
                <Button
                  variant="outline"
                  onClick={onOpenIdeenbox}
                  className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-slate-950"
                >
                  <Lightbulb className="w-4 h-4" />
                  KI-Ideenbox öffnen
                </Button>
                <Button
                  variant="outline"
                  onClick={onOpenWizard}
                  className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 hover:text-slate-950"
                >
                  <Wand2 className="w-4 h-4" />
                  Mit KI entwerfen
                </Button>
              </>
            )}
          </div>
        )}

        {/* Aufgaben-Liste */}
        {aufgaben.length === 0 ? (
          <div className="text-center py-10 rounded-xl border border-dashed border-border bg-muted/20">
            <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {kannBearbeiten
                ? 'Leg hier die erste Aufgabe für dieses Themenfeld an.'
                : 'Für dieses Themenfeld wurden noch keine Aufgaben angelegt.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Vorhandene Aufgaben
            </p>
            {aufgaben.map((a) => (
              <AufgabeKarte key={a.id} aufgabe={a} onSelect={onSelectAufgabe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}