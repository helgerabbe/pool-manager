import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Paperclip } from 'lucide-react';
import AufgabenstellungBox from '@/components/schueler/lesen/AufgabenstellungBox';

/**
 * Schüler-Seite einer ANALOGEN Phase: Anweisung plus (optionale) Materialien.
 * Es gibt nichts digital zu bearbeiten – die Schüler gehen einfach weiter.
 */
export default function StundenAnalogSeite({ phase, onWeiter, onZurueck }) {
  const materialien = phase.material_urls || [];

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      <AufgabenstellungBox className="mb-3 shrink-0">
        {phase.schueler_anweisung || 'Hör zu und arbeite mit.'}
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {materialien.map((m, i) => {
          const istBild = /\.(png|jpe?g|gif|webp)$/i.test(m.url || '');
          if (istBild) {
            return (
              <img
                key={`${m.url}-${i}`}
                src={m.url}
                alt={m.name || 'Material'}
                className="w-full rounded-xl border border-border"
              />
            );
          }
          return (
            <a
              key={`${m.url}-${i}`}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm text-primary"
            >
              <Paperclip className="w-4 h-4" />
              {m.name || 'Material öffnen'}
            </a>
          );
        })}
        {materialien.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground italic text-center">
              Für diesen Schritt brauchst du dein Gerät nicht.
            </p>
          </div>
        )}
      </div>

      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onZurueck}>
          <ArrowLeft className="w-4 h-4" /> Zurück
        </Button>
        <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={onWeiter}>
          Weiter <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}