import { CheckCircle2, Loader2, ArrowLeft, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AufgabenstellungBox from './AufgabenstellungBox';

/**
 * Schüler-Aktivität „Lehrwerk/Quelle" (Input-Phase).
 *
 * Verweist den Schüler auf ein analoges Lehrwerk (Buchtitel + Seitenangabe).
 * Design-Konventionen wie alle Schüler-Aktivitäten:
 *  - kein Header, blauer Aufgabenstellungs-Anker oben,
 *  - unten genau zwei Buttons: links „Zurück zum Lernpaket", rechts „Erledigt".
 */
export default function LehrwerkQuelleSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}

      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.aufgabentext || 'Lies den angegebenen Abschnitt im Buch.'}
      </AufgabenstellungBox>

      {/* Buch-Karte: Titel + Seitenangabe groß und klar. */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="rounded-2xl border border-border bg-card shadow-sm px-6 py-8 flex flex-col items-center text-center gap-4 mt-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
            <BookOpen className="w-8 h-8" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
              Dein Buch
            </p>
            <p className="text-xl font-bold text-foreground leading-snug">
              {fv.buchtitel || 'Lehrwerk'}
            </p>
            {fv.seiten && (
              <p className="text-sm text-muted-foreground mt-2">
                Seite{String(fv.seiten).match(/[-–,]/) ? 'n' : ''}{' '}
                <span className="font-semibold text-foreground">{fv.seiten}</span>
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground max-w-sm leading-relaxed">
            Hol dir das Buch, lies den Abschnitt in Ruhe durch und komm danach hierher zurück.
          </p>
        </div>
      </div>

      {/* Aktionen: links zurück, rechts grün */}
      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        <Button
          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
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