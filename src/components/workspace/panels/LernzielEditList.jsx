/**
 * LernzielEditList.jsx
 *
 * Inline-Editor für die Lernziele eines Lernpakets im Tab-3-Bearbeitungs-
 * dialog. Pflegt offizielle Formulierung + Schüler-Übersetzung.
 *
 * Controlled-Komponente: Der Parent hält den Bearbeitungs-State (`drafts`)
 * und persistiert beim globalen "Speichern"-Button im Dialog-Footer.
 * Damit gibt es nur noch EINEN Save-Button im Dialog.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';
import { kategorieColors } from './SharedUI';

function LernzielRow({ lernziel, draft, onChange }) {
  const formulierung = draft?.formulierung_fachsprache ?? lernziel.formulierung_fachsprache ?? '';
  const uebersetzung = draft?.schueler_uebersetzung ?? lernziel.schueler_uebersetzung ?? '';

  return (
    <div className="p-3 rounded-lg border bg-card space-y-2.5">
      <div className="flex items-start gap-2">
        <Target className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            {lernziel.kategorie && (
              <Badge className={`text-[10px] ${kategorieColors[lernziel.kategorie] || ''}`}>
                {lernziel.kategorie}
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Offizielle Formulierung (Fachsprache)</Label>
            <input
              type="text"
              value={formulierung}
              onChange={(e) => onChange(lernziel.id, { ...draft, formulierung_fachsprache: e.target.value })}
              placeholder="Ich kann..."
              className="w-full px-3 py-2 rounded-lg border border-input text-sm"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold">Schüler-Übersetzung</Label>
            <input
              type="text"
              value={uebersetzung}
              onChange={(e) => onChange(lernziel.id, { ...draft, schueler_uebersetzung: e.target.value })}
              placeholder="Schülergerechte Formulierung..."
              className="w-full px-3 py-2 rounded-lg border border-input text-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LernzielEditList({ lernziele, drafts, onChangeDraft }) {
  if (!lernziele || lernziele.length === 0) {
    return (
      <div className="p-3 rounded-lg border border-dashed text-center text-sm text-muted-foreground">
        Diesem Paket sind noch keine Lernziele zugeordnet.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lernziele.map((lz) => (
        <LernzielRow
          key={lz.id}
          lernziel={lz}
          draft={drafts?.[lz.id]}
          onChange={onChangeDraft}
        />
      ))}
    </div>
  );
}