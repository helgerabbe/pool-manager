import { CheckCircle2, Loader2, ArrowLeft, Lightbulb, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AufgabenstellungBox from './AufgabenstellungBox';

/**
 * Schüler-Aktivität „Kompaktwissen".
 *
 * Zeigt einen kompakten Wissensüberblick (Text oder Bild) als zentrale
 * Orientierung für das Lernpaket – wie ein „Kompass" für das, worum es geht.
 *
 * Layout: blauer Aufgabenstellungs-Anker oben, darunter das Kompaktwissen,
 * unten die zwei Standard-Buttons (Zurück / Erledigt).
 */
export default function KompaktwissenSeite({ aktivitaet, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};
  const inhaltTyp = fv.inhalt_typ || 'text';
  const text = fv.text || '';
  const bildUrl = fv.bild_url || '';
  const hatInhalt = inhaltTyp === 'text' ? !!text.trim() : !!bildUrl;

  const standardAufgabe =
    'Lies dir den folgenden Wissensüberblick aufmerksam durch. Er fasst die wichtigsten Inhalte des Lernpakets kompakt zusammen und hilft dir, den Überblick zu behalten.';

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      {/* Aufgabenstellung */}
      <AufgabenstellungBox className="mb-4 shrink-0">
        {fv.aufgabentext || standardAufgabe}
      </AufgabenstellungBox>

      {/* Kompaktwissen – Text oder Bild */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        {!hatInhalt ? (
          <p className="text-sm text-muted-foreground italic text-center py-10">
            Für diese Aktivität ist noch kein Kompaktwissen hinterlegt.
          </p>
        ) : inhaltTyp === 'bild' ? (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <img
              src={bildUrl}
              alt="Kompaktwissen – Übersichtsgrafik"
              className="w-full h-auto object-contain max-h-[60vh]"
            />
            <div className="px-4 py-2 border-t border-border bg-muted/20">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Image className="w-3.5 h-3.5" />
                Übersichtsgrafik – verschaffe dir einen Überblick über die wichtigsten Inhalte.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 text-amber-700 shrink-0">
                <Lightbulb className="w-4 h-4" />
              </span>
              <p className="text-[11px] font-bold uppercase tracking-wide text-amber-700/80 pt-0.5">
                Kompaktwissen
              </p>
            </div>
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {text}
            </div>
          </div>
        )}
      </div>

      {/* Aktion: links zurück, rechts grün */}
      <div className="pt-5 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          disabled={busy}
          onClick={onErledigt}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Gelesen
        </Button>
      </div>
    </div>
  );
}