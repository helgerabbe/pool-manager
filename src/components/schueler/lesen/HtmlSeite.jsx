import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, Loader2, ArrowLeft, Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';
import HtmlIframePreview from '@/components/allgemeineAufgaben/HtmlIframePreview';

const PHASE_LABEL = { Input: 'Erklärung', 'Übung': 'Übung', Abschluss: 'Abschluss' };

/**
 * Schüler-Aktivität „HTML-Seite".
 *
 * Rendert beliebigen HTML-Code (z.B. GeoGebra-Einbettungen, interaktive
 * Tutorials) in einem sandboxed iframe. Oben die Aufgabenstellung, darunter
 * die eingebettete Seite – so sieht der Schüler exakt das, was die Lehrkraft
 * im HTML-Editor erstellt hat.
 */
export default function HtmlSeite({ aktivitaet, kat, lernpaketTitel, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};
  const phase = PHASE_LABEL[aktivitaet.phase] || aktivitaet.phase;
  const htmlCode = fv.html_code || '';

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="space-y-5 pb-2">
          {/* Aufgabenstellung */}
          {fv.aufgabentext && (
            <AufgabenstellungBox>{fv.aufgabentext}</AufgabenstellungBox>
          )}

          {!htmlCode ? (
            <div className="rounded-2xl border-2 border-dashed border-border bg-muted/30 flex items-center justify-center py-20 text-center">
              <p className="text-sm text-muted-foreground">
                Für diese Aktivität ist noch kein HTML-Code hinterlegt.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden bg-white">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-border">
                <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Interaktive HTML-Seite</span>
              </div>
              <HtmlIframePreview
                htmlCode={htmlCode}
                style={{ minHeight: '480px', height: '70vh' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Aktion: links zurück, rechts grün „Erledigt" */}
      <div className="pt-4 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        <Button
          className={cn('gap-2 bg-emerald-600 hover:bg-emerald-700')}
          disabled={busy}
          onClick={onErledigt}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Erledigt
        </Button>
      </div>
    </div>
  );
}