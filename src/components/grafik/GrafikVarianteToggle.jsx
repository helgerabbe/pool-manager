import React from 'react';
import { Button } from '@/components/ui/button';
import { Palette, Wrench, Trash2 } from 'lucide-react';
import { VARIANTE_FUNKTIONAL, VARIANTE_GRAFISCH } from '@/lib/grafikVariante';
import { cn } from '@/lib/utils';

/**
 * Umschalter zwischen der funktionalen und der grafisch aufbereiteten Fassung.
 * Zeigt immer klar, WELCHE Fassung die Schüler sehen.
 */
export default function GrafikVarianteToggle({ variante, onVariante, onVerwerfen, onNeu }) {
  const grafisch = variante === VARIANTE_GRAFISCH;

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-3 py-2.5 space-y-2">
      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => onVariante(VARIANTE_FUNKTIONAL)}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
            !grafisch ? 'bg-white text-foreground shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:bg-white/60',
          )}
        >
          <Wrench className="w-3.5 h-3.5" /> Funktional
        </button>
        <button
          type="button"
          onClick={() => onVariante(VARIANTE_GRAFISCH)}
          className={cn(
            'flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
            grafisch ? 'bg-white text-violet-800 shadow-sm ring-1 ring-violet-300' : 'text-muted-foreground hover:bg-white/60',
          )}
        >
          <Palette className="w-3.5 h-3.5" /> Grafisch aufbereitet
        </button>
      </div>
      <p className="text-[11px] leading-relaxed text-violet-900">
        {grafisch
          ? 'Die Schüler sehen die grafisch aufbereitete Fassung.'
          : 'Die Schüler sehen die funktionale Fassung. Die aufbereitete liegt daneben und ist jederzeit abrufbar.'}
      </p>
      <div className="flex gap-2">
        {onNeu && (
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onNeu}>
            <Palette className="w-3 h-3" /> Neu aufbereiten
          </Button>
        )}
        {onVerwerfen && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs text-destructive hover:text-destructive"
            onClick={onVerwerfen}
          >
            <Trash2 className="w-3 h-3" /> Variante verwerfen
          </Button>
        )}
      </div>
    </div>
  );
}