import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import AufgabenstellungBox from './AufgabenstellungBox';
import KIQuizFrageKarte from './KIQuizFrageKarte';

/**
 * Schüler-Aktivität „KI-Quiz": offene Fragen werden NACHEINANDER bearbeitet.
 * Pro Frage: Antwort schreiben → KI vergleicht sie einmalig mit der
 * Musterlösung der Lehrkraft → sofortige Rückmeldung → weiter zur nächsten.
 */
export default function KIQuizSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};
  const fragen = useMemo(
    () => (Array.isArray(fv.ki_quiz_fragen) ? fv.ki_quiz_fragen : []).filter((f) => String(f?.frage || '').trim() !== ''),
    [fv.ki_quiz_fragen]
  );
  const [aktuell, setAktuell] = useState(0);
  const [antworten, setAntworten] = useState({});
  const [feedback, setFeedback] = useState({});
  const [prueft, setPrueft] = useState(false);

  const frage = fragen[aktuell];
  const key = frage ? (frage.id || aktuell) : null;
  const aktuellBewertet = key != null && !!feedback[key];
  const letzteFrage = aktuell >= fragen.length - 1;
  const richtig = fragen.filter((f, i) => feedback[f.id || i]?.erreicht).length;

  const pruefen = async () => {
    setPrueft(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein freundlicher Tutor und bewertest die Antwort eines Schülers/einer Schülerin auf eine Quizfrage. Vergleiche die Antwort mit der Musterlösung der Lehrkraft. Entscheide, ob die Kernaspekte der Musterlösung erreicht sind (erreicht: true/false), und formuliere eine kurze, ermutigende Rückmeldung (2–4 Sätze, direkte Anrede "du"): Benenne konkret, was schon richtig war, und was gefehlt hat oder falsch war – nenne dabei, was richtig gewesen wäre, ohne die Musterlösung wörtlich abzuschreiben.\n\nFrage: ${frage.frage}\nMusterlösung: ${frage.musterloesung || '(keine)'}\nAntwort des Schülers: ${antworten[key] || ''}`,
      response_json_schema: {
        type: 'object',
        properties: { erreicht: { type: 'boolean' }, rueckmeldung: { type: 'string' } },
      },
    });
    setFeedback((prev) => ({ ...prev, [key]: { erreicht: !!res?.erreicht, rueckmeldung: res?.rueckmeldung || '' } }));
    setPrueft(false);
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}
      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.einleitung || 'Beantworte die Fragen nacheinander in vollständigen Sätzen. Nach jeder Antwort bekommst du sofort eine Rückmeldung der KI.'}
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-4">
        {fragen.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">Für dieses Quiz sind noch keine Fragen hinterlegt.</p>
        ) : (
          <KIQuizFrageKarte
            key={key}
            frage={frage}
            index={aktuell}
            gesamt={fragen.length}
            antwort={antworten[key]}
            onChange={(wert) => setAntworten((prev) => ({ ...prev, [key]: wert }))}
            onPruefen={pruefen}
            feedback={feedback[key]}
            prueft={prueft}
            disabled={busy}
          />
        )}
        {fragen.length > 0 && letzteFrage && aktuellBewertet && (
          <p className="text-center text-sm font-semibold">
            {richtig} von {fragen.length} Fragen sicher beantwortet
          </p>
        )}
      </div>

      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy || prueft}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {fragen.length > 0 && !letzteFrage ? (
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700" disabled={!aktuellBewertet || busy} onClick={() => setAktuell((i) => i + 1)}>
            Nächste Frage <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={busy || (fragen.length > 0 && !aktuellBewertet)} onClick={onErledigt}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        )}
      </div>
    </div>
  );
}