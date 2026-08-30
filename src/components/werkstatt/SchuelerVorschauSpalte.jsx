import React, { useMemo } from 'react';
import { Monitor, Eye, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AufgabensequenzSeite from '@/components/schueler/lesen/AufgabensequenzSeite';
import { istSchrittVollstaendig } from '@/lib/schrittTypen';

/**
 * SchuelerVorschauSpalte
 * ──────────────────────
 * Mittlere Spalte der Werkstatt: der gewählte Schritt so, wie die Schüler ihn
 * sehen — oder auf Wunsch die ganze Folge am Stück.
 *
 * Gezeigt wird immer der ECHTE Schüler-Renderer (AufgabensequenzSeite), nie
 * eine Nachbildung. Für die Einzelansicht bekommt er eine Folge aus genau
 * einem Schritt; dadurch stimmt die Darstellung mit dem späteren Kurs überein,
 * ohne dass die Werkstatt eigene Anzeigelogik erfindet.
 *
 * Es gibt bewusst keine Gerätesimulation: Was im Rahmen steht, ist der Inhalt,
 * das Layout gehört später der MBK.
 */
export default function SchuelerVorschauSpalte({
  schritte = [],
  selectedIndex = 0,
  aufgabenstellung = '',
  gesamtdurchlauf = false,
  onGesamtdurchlaufChange,
}) {
  const schritt = schritte[selectedIndex] || null;

  // Der Renderer erwartet eine „Aktivität" mit field_values — für die
  // Einzelansicht bauen wir eine Folge aus genau diesem einen Schritt.
  const aktivitaet = useMemo(() => ({
    id: gesamtdurchlauf ? 'werkstatt-gesamt' : (schritt?.id || 'werkstatt-schritt'),
    field_values: {
      sequenz_schritte: gesamtdurchlauf ? schritte : (schritt ? [schritt] : []),
      aufgabentext: aufgabenstellung || '',
    },
  }), [gesamtdurchlauf, schritte, schritt, aufgabenstellung]);

  const leer = gesamtdurchlauf ? schritte.length === 0 : !schritt;
  const unvollstaendig = !gesamtdurchlauf && schritt && !istSchrittVollstaendig(schritt);

  return (
    <div className="flex flex-col min-h-0 gap-2">
      <div className="flex-1 min-h-[420px] rounded-xl border-2 border-slate-300 bg-white overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 border-b border-slate-200 shrink-0">
          <Monitor className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-600">
            So sehen es die Schüler:innen
          </span>
          <Button
            variant={gesamtdurchlauf ? 'default' : 'ghost'}
            size="sm"
            className="ml-auto h-7 gap-1.5 text-xs"
            onClick={() => onGesamtdurchlaufChange?.(!gesamtdurchlauf)}
            disabled={schritte.length === 0}
            title="Alle Schritte nacheinander durchlaufen"
          >
            <Play className="w-3 h-3" />
            {gesamtdurchlauf ? 'Einzelner Schritt' : 'Gesamtdurchlauf'}
          </Button>
        </div>

        <div className="flex-1 min-h-0 bg-background">
          {leer ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 px-8 text-center">
              <Eye className="w-8 h-8 text-slate-300" />
              <p className="text-sm text-slate-500">
                {schritte.length === 0
                  ? 'Sobald der erste Schritt steht, sehen Sie ihn hier.'
                  : 'Wählen Sie links einen Schritt aus.'}
              </p>
            </div>
          ) : (
            // key erzwingt einen frischen Renderer beim Wechsel — sonst
            // bliebe der interne Schrittzeiger auf dem alten Stand stehen.
            <AufgabensequenzSeite
              key={gesamtdurchlauf ? 'gesamt' : (schritt?.id || selectedIndex)}
              aktivitaet={aktivitaet}
              busy={false}
              // Die Aufgabenstellung der Folge gehört nur zum Gesamtdurchlauf.
              // Bei der Einzelansicht eines Schritts wäre die Ansage
              // "bearbeite Schritt für Schritt" schlicht falsch.
              zeigeAufgabenstellung={gesamtdurchlauf}
              onErledigt={() => {}}
              onBack={() => {}}
            />
          )}
        </div>
      </div>

      {unvollstaendig && (
        <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          In diesem Schritt fehlt noch etwas — die Vorschau zeigt ihn trotzdem, damit Sie sehen,
          wie weit er ist.
        </p>
      )}
    </div>
  );
}
