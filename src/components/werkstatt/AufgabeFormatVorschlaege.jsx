import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Wand2, ArrowLeft } from 'lucide-react';
import FormatTrefferKarte from '@/components/werkstatt/FormatTrefferKarte';
import FormatVorschauDialog from '@/components/formate/FormatVorschauDialog';

const HERKUNFT_LABEL = { katalog: 'Standardformat', galerie: 'Aufgabengalerie' };

/**
 * Zweiter Halt des Aufgaben-Assistenten: die gefundenen Formate.
 *
 * Beide Bestände stehen in EINER Liste — die Lehrkraft interessiert, ob die
 * Mechanik passt, nicht woher sie stammt. Die Herkunft steht nur als Vermerk
 * dabei, weil sie erklärt, warum es bei einem Format eine Vorschau gibt und
 * beim anderen nicht.
 *
 * Der Weg „neues Format" bleibt immer sichtbar. Nichts erzwingt eine Vorlage;
 * eine unpassende Vorlage kostet mehr Zeit als ein Neubau.
 */
export default function AufgabeFormatVorschlaege({ treffer, onWahl, onZurueck, disabled }) {
  const [vorschau, setVorschau] = useState(null);

  return (
    <div className="space-y-3">
      {treffer.length === 0 ? (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <p className="text-sm">Dafür gibt es noch kein passendes Format.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Dann bauen wir die Aufgabe neu — sie steht danach als Vorschlag für die Aufgabengalerie
            zur Verfügung.
          </p>
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {treffer.length === 1
              ? 'Ein Format kommt Ihrem Vorhaben nahe.'
              : `${treffer.length} Formate kommen Ihrem Vorhaben nahe.`}
            {' '}Sehen Sie sich die Beispiele an und wählen Sie eines — oder bauen Sie ein neues.
          </p>
          {treffer.map((t) => (
            <FormatTrefferKarte
              key={`${t.art}-${t.id}`}
              treffer={t}
              disabled={disabled}
              herkunftLabel={HERKUNFT_LABEL[t.art]}
              onAnsehen={t.art === 'galerie' ? () => setVorschau(t) : null}
              onNehmen={() => onWahl(
                t.art === 'katalog'
                  ? { art: 'katalog', aktivitaet_id: t.id, name: t.name }
                  : { art: 'galerie', format_id: t.id, name: t.name, fragment: t.fragment },
              )}
            />
          ))}
        </>
      )}

      <div className="flex items-center gap-2 pt-1">
        <Button className="gap-2" onClick={() => onWahl({ art: 'neu' })} disabled={disabled}>
          <Wand2 className="w-4 h-4" /> Neues Format bauen
        </Button>
        <Button variant="ghost" className="gap-2 text-muted-foreground" onClick={onZurueck}>
          <ArrowLeft className="w-4 h-4" /> Idee ändern
        </Button>
      </div>

      <FormatVorschauDialog
        format={vorschau}
        open={!!vorschau}
        onOpenChange={(o) => !o && setVorschau(null)}
      />
    </div>
  );
}