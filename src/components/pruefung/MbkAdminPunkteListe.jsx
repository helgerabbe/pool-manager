/**
 * MbkAdminPunkteListe — externe Punkte einer MBK-Rückmeldung.
 *
 * Diese Punkte betreffen Arbeiten AUSSERHALB des Pool-Managers (Moodle-Abgaben
 * anlegen, KI-Prompts einspielen). Sie stehen bewusst nicht in der
 * Lehrkraft-Taskliste, sondern hier — abhaken darf sie nur die Administration.
 *
 * Wird an zwei Stellen genutzt: im MBK-Reiter einer Einheit und als
 * Sammelübersicht in den Admin-Einstellungen.
 */
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, RotateCcw, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';

const ART_LABEL = {
  moodle: 'Moodle',
  ki_prompt: 'KI-Prompt',
  sonstiges: 'Sonstiges',
};

export default function MbkAdminPunkteListe({ punkte = [], kannErledigen = false, onErledigen, mitEinheit = false }) {
  if (punkte.length === 0) return null;

  return (
    <div className="space-y-2">
      {punkte.map((p) => {
        const erledigt = p.status === 'erledigt';
        return (
          <div
            key={p.id}
            className={cn(
              'rounded-lg border p-3 space-y-1',
              erledigt ? 'bg-muted/40 border-border' : 'bg-card border-border'
            )}
          >
            <div className="flex items-start gap-2 flex-wrap">
              <Badge variant="outline" className="bg-slate-50">
                <Wrench className="w-3 h-3 mr-1" /> {ART_LABEL[p.art] || 'Sonstiges'}
              </Badge>
              {p.anzahl ? (
                <Badge variant="outline" className="bg-slate-50">{p.anzahl}×</Badge>
              ) : null}
              <span className="text-sm font-semibold flex-1 min-w-0">{p.titel}</span>
              {erledigt && (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                  Erledigt
                </Badge>
              )}
            </div>

            {mitEinheit && p.einheit_titel && (
              <p className="text-xs text-muted-foreground">Einheit: {p.einheit_titel}</p>
            )}
            {p.beschreibung && <p className="text-sm text-foreground">{p.beschreibung}</p>}

            {kannErledigen && (
              <div className="pt-1">
                {erledigt ? (
                  <Button size="sm" variant="ghost" onClick={() => onErledigen?.(p.id, 'offen')}>
                    <RotateCcw className="w-3.5 h-3.5" /> Wieder öffnen
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => onErledigen?.(p.id, 'erledigt')}>
                    <Check className="w-3.5 h-3.5" /> Erledigt
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}