import React from 'react';
import { Eye, Smartphone } from 'lucide-react';
import StundenPlayer from './schueler/StundenPlayer';

/**
 * Lehrer-Vorschau der digitalen Unterrichtsstunde: zeigt die Schüleransicht in
 * einem Geräterahmen. Sie wird immer live aus den Phasen-Daten gerendert und
 * ist damit ohne „Neu generieren" stets aktuell; die Code-Sperren entfallen.
 */
export default function StundenSchueleransichtTab({ stunde, phasen }) {
  if (phasen.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Sobald das Regieblatt Phasen enthält, sehen Sie hier die Stunde aus Schülersicht.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
        <Eye className="w-3.5 h-3.5" />
        Live-Vorschau Ihres aktuellen Stands – Freischalt-Codes werden hier übersprungen.
      </p>
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border-8 border-slate-800 bg-background shadow-xl overflow-hidden">
        <div className="flex items-center justify-center gap-2 bg-slate-800 py-1.5 text-[11px] text-slate-300">
          <Smartphone className="w-3 h-3" /> Schüleransicht
        </div>
        <div className="h-[640px] bg-background">
          <StundenPlayer stunde={stunde} phasen={phasen} vorschau />
        </div>
      </div>
    </div>
  );
}