/**
 * Auswahl der digitalen Aufgabenart einer Stunden-Phase.
 * Akkordeon (im Phasen-Akkordeon): alle Aufgabenarten auf einen Blick,
 * gruppiert nach Phase (Input / Übung / Abschluss) — wie die Aktivitäten-Palette
 * im Pool-Manager, inkl. Info-Popup pro Aufgabenart.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Info, Check, ChevronDown, ChevronUp } from 'lucide-react';
import AktivitaetsartInfoDialog from './AktivitaetsartInfoDialog';

const PHASEN = ['Input', 'Übung', 'Abschluss'];

export default function StundenPhaseAktivitaetWahl({ value, onChange, disabled = false }) {
  const [offen, setOffen] = useState(false);
  const [infoEintrag, setInfoEintrag] = useState(null);

  const { data: katalog = [], isLoading } = useQuery({
    queryKey: ['aktivitaetenKatalogAktiv'],
    queryFn: () => base44.entities.AktivitaetenKatalog.filter({ is_active: true }, 'phase', 200),
  });

  const gewaehlt = katalog.find((a) => a.id === value);

  return (
    <div className="space-y-2">
      <Label>Digitale Aufgabenart</Label>

      <button
        type="button"
        disabled={disabled}
        onClick={() => setOffen((o) => !o)}
        className="w-full flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-left text-sm hover:border-primary/50 disabled:opacity-50"
      >
        {gewaehlt ? (
          <>
            <Check className="w-4 h-4 text-blue-600 shrink-0" />
            <span className="font-medium text-foreground truncate">{gewaehlt.name}</span>
            <Badge variant="outline" className="bg-blue-100 text-blue-900 border-blue-200">{gewaehlt.phase}</Badge>
          </>
        ) : (
          <span className="text-muted-foreground">
            {isLoading ? 'Aufgabenarten werden geladen…' : 'Aufgabenart auswählen – hier klicken'}
          </span>
        )}
        {offen
          ? <ChevronUp className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 ml-auto text-muted-foreground shrink-0" />}
      </button>

      {gewaehlt?.beschreibung && !offen && (
        <p className="text-xs text-muted-foreground">{gewaehlt.beschreibung}</p>
      )}

      {offen && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-3">
          {PHASEN.map((phase) => {
            const arten = katalog.filter((a) => a.phase === phase);
            if (arten.length === 0) return null;
            return (
              <div key={phase} className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-900">{phase}</p>
                <div className="flex flex-wrap gap-1.5">
                  {arten.map((a) => {
                    const aktiv = a.id === value;
                    return (
                      <div
                        key={a.id}
                        className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs font-medium ${
                          aktiv
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        <button
                          type="button"
                          className="leading-tight text-left"
                          title={a.beschreibung || a.name}
                          onClick={() => {
                            onChange(a.id);
                            setOffen(false);
                          }}
                        >
                          {a.name}
                        </button>
                        <button
                          type="button"
                          onClick={() => setInfoEintrag(a)}
                          title="Informationen zu dieser Aufgabenart"
                          className={`shrink-0 p-0.5 rounded ${aktiv ? 'text-white/80 hover:text-white' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                        >
                          <Info className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={() => setOffen(false)}>Auswahl schließen</Button>
          </div>
        </div>
      )}

      <AktivitaetsartInfoDialog
        open={!!infoEintrag}
        onOpenChange={(o) => !o && setInfoEintrag(null)}
        katalogEntry={infoEintrag}
      />
    </div>
  );
}