import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import AufgabenstellungBox from './AufgabenstellungBox';

/**
 * Schüler-Aktivität „Offene Aufgabe".
 *
 * Single Source of Truth ist der von der Lehrkraft in der Vorschau
 * eingefrorene Snapshot (`field_values.approved_snapshot_html`) – eine
 * vollständige, in sich geschlossene interaktive HTML-Seite. Sie wird in
 * einem Sandbox-iframe gerendert, das den verfügbaren Platz füllt.
 *
 * Fallback (kein Snapshot vorhanden): Die Aufgabenbeschreibung der
 * Lehrkraft wird schülergerecht als formatierter Text angezeigt.
 *
 * Design-Konventionen wie überall: kein Header, blauer Aufgaben-Anker oben,
 * unten zwei Buttons (Zurück zum Lernpaket / grün „Erledigt").
 */
export default function OffeneAufgabeSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};
  const snapshotHtml = fv.approved_snapshot_html || '';
  const hatSnapshot = !!snapshotHtml.trim();

  return (
    <div className="h-full flex flex-col max-w-3xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}

      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.aufgabentext || 'Bearbeite die folgende Aufgabe detailliert und vollständig.'}
      </AufgabenstellungBox>

      {hatSnapshot ? (
        /* Interaktive Aufgabe: eingefrorener Snapshot im Sandbox-iframe. */
        <div className="flex-1 min-h-0 rounded-xl border border-border overflow-hidden bg-white shadow-sm">
          <iframe
            title="Offene Aufgabe"
            srcDoc={snapshotHtml}
            sandbox="allow-scripts"
            className="w-full h-full border-0 bg-white"
          />
        </div>
      ) : (
        /* Fallback: Aufgabenbeschreibung schülergerecht formatiert. */
        <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
          {fv.description ? (
            <div className="rounded-xl border border-border bg-card px-5 py-4">
              <ReactMarkdown className="prose prose-sm prose-slate max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 leading-relaxed">
                {fv.description}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-10">
              Für diese Aufgabe sind noch keine Inhalte hinterlegt.
            </p>
          )}
        </div>
      )}

      {/* Aktionen: links zurück, rechts grün „Erledigt" */}
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