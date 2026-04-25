/**
 * MonitorPanel.jsx
 *
 * Eigenständiges Monitor-Panel für den Lernpfad-Architekt (Tab 7).
 * Zeigt Light-Preview (Titel, Typ-Badge, Aufgabentext) der aktuell selektierten
 * Aufgabe und bietet einen Button für die ausführliche Schülermodus-Vorschau.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, MousePointerClick } from 'lucide-react';
import { getAufgabenTyp } from '@/lib/aufgabenTypen';

export default function MonitorPanel({ aufgabe, onPreviewClick }) {
  if (!aufgabe) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 p-4 text-center">
        <MousePointerClick className="w-5 h-5 mx-auto text-muted-foreground/60 mb-1.5" />
        <p className="text-xs text-muted-foreground">
          Klicke auf eine Aufgabe (links oder rechts), um Details zu sehen.
        </p>
      </div>
    );
  }

  const typMeta = getAufgabenTyp(aufgabe.aufgaben_typ);
  const Icon = typMeta.icon;

  return (
    <div className={`rounded-xl border-2 ${typMeta.color.border}/30 ${typMeta.color.bg}/40 p-3 space-y-2`}>
      <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-lg ${typMeta.color.iconBg} flex items-center justify-center shrink-0`}>
          <Icon className={`w-3.5 h-3.5 ${typMeta.color.iconText}`} />
        </div>
        <div className="min-w-0 flex-1">
          <span className={`inline-block text-[10px] font-semibold uppercase ${typMeta.color.text} tracking-wide`}>
            {typMeta.label}
          </span>
          <p className="text-xs font-semibold text-foreground truncate">
            {aufgabe.titel || 'Ohne Titel'}
          </p>
        </div>
      </div>

      {aufgabe.aufgabenstellung && (
        <p className="text-[11px] text-foreground/70 leading-relaxed line-clamp-3 whitespace-pre-wrap">
          {aufgabe.aufgabenstellung}
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap pt-1">
        {aufgabe.anforderungsebene && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 border border-border/40 text-foreground/70">
            {aufgabe.anforderungsebene}
          </span>
        )}
        {aufgabe.aufgaben_typ === 'buendel' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 border border-border/40 text-foreground/70">
            {(aufgabe.verlinkte_lernpaket_ids || []).length} Pakete
          </span>
        )}
        {aufgabe.aufgaben_typ === 'projekt_anker' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/60 border border-border/40 text-foreground/70">
            {(aufgabe.verlinkte_projekt_ids || []).length} Projekte
          </span>
        )}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onPreviewClick?.(aufgabe)}
        className="w-full gap-1.5 h-7 text-xs mt-1"
      >
        <Eye className="w-3 h-3" /> Vorschau (Schülermodus)
      </Button>
    </div>
  );
}