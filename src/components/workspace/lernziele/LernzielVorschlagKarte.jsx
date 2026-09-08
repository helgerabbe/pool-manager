import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { GraduationCap } from 'lucide-react';

/**
 * Ein KI-Vorschlag für ein fehlendes Lernziel – auswählbar und vor dem
 * Übernehmen in beiden Formulierungen anpassbar.
 */
export default function LernzielVorschlagKarte({ vorschlag, onChange }) {
  const v = vorschlag;
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${v.gewaehlt ? 'border-primary/40 bg-primary/5' : 'border-border bg-card opacity-70'}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={!!v.gewaehlt}
          onCheckedChange={(c) => onChange({ gewaehlt: !!c })}
          className="mt-1"
        />
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-[10px]">{v.kategorie || 'Kategorie offen'}</Badge>
            {v.begruendung && <span className="text-xs text-muted-foreground">{v.begruendung}</span>}
          </div>
          <Textarea
            value={v.formulierung_fachsprache}
            onChange={(e) => onChange({ formulierung_fachsprache: e.target.value })}
            rows={2}
            className="text-sm font-medium"
          />
          <div className="flex items-start gap-2">
            <GraduationCap className="w-4 h-4 text-sky-600 shrink-0 mt-2" />
            <Textarea
              value={v.schueler_uebersetzung || ''}
              onChange={(e) => onChange({ schueler_uebersetzung: e.target.value })}
              rows={2}
              placeholder="Schülergerechte Formulierung"
              className="text-sm italic"
            />
          </div>
          {v.fundstellen?.length > 0 && (
            <p className="text-[11px] text-muted-foreground">
              Fundstellen: {v.fundstellen.join(' · ')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}