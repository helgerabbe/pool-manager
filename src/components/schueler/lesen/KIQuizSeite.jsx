import { useMemo, useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import AufgabenstellungBox from './AufgabenstellungBox';
import KIQuizFrageKarte from './KIQuizFrageKarte';

/**
 * Schüler-Aktivität „KI-Quiz": mehrere offene Fragen, freie Textantworten.
 * Die KI vergleicht die Antworten EINMALIG mit den Musterlösungen der
 * Lehrkraft und gibt pro Frage eine kurze Rückmeldung – kein Chat.
 */
export default function KIQuizSeite({ aktivitaet, busy, onErledigt, onBack, masterHinweis }) {
  const fv = aktivitaet?.field_values || {};
  const fragen = useMemo(
    () => (Array.isArray(fv.ki_quiz_fragen) ? fv.ki_quiz_fragen : []).filter((f) => String(f?.frage || '').trim() !== ''),
    [fv.ki_quiz_fragen]
  );
  const [antworten, setAntworten] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [wertetAus, setWertetAus] = useState(false);

  const alleBeantwortet = fragen.length > 0 && fragen.every((f, i) => String(antworten[f.id || i] || '').trim() !== '');

  const auswerten = async () => {
    setWertetAus(true);
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein freundlicher Tutor und bewertest die Antworten eines Schülers/einer Schülerin auf ein Quiz. Vergleiche jede Antwort mit der Musterlösung der Lehrkraft. Entscheide pro Frage, ob die Kernaspekte der Musterlösung erreicht sind (erreicht: true/false), und formuliere eine kurze, ermutigende Rückmeldung (2–3 Sätze, direkte Anrede "du"), die benennt, was gut war und was fehlt. Verrate die Musterlösung nicht wörtlich.\n\n${fragen.map((f, i) => `Frage ${i + 1}: ${f.frage}\nMusterlösung: ${f.musterloesung || '(keine)'}\nAntwort des Schülers: ${antworten[f.id || i] || ''}`).join('\n\n')}`,
      response_json_schema: {
        type: 'object',
        properties: {
          bewertungen: {
            type: 'array',
            items: { type: 'object', properties: { erreicht: { type: 'boolean' }, rueckmeldung: { type: 'string' } } },
          },
        },
      },
    });
    setFeedback(Array.isArray(res?.bewertungen) ? res.bewertungen : []);
    setWertetAus(false);
  };

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-4">
      {masterHinweis && (
        <div className="mb-2 shrink-0 inline-flex items-center self-start rounded-full bg-primary/10 text-primary text-xs font-semibold px-3 py-1">
          Aufgabe {masterHinweis.aktuell} von {masterHinweis.gesamt}
        </div>
      )}
      <AufgabenstellungBox className="mb-3 shrink-0">
        {fv.einleitung || 'Beantworte die folgenden Fragen in vollständigen Sätzen. Eine KI gleicht deine Antworten anschließend mit einer Musterlösung ab.'}
      </AufgabenstellungBox>

      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 space-y-4">
        {fragen.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-6">Für dieses Quiz sind noch keine Fragen hinterlegt.</p>
        ) : fragen.map((f, i) => (
          <KIQuizFrageKarte
            key={f.id || i}
            frage={f}
            index={i}
            antwort={antworten[f.id || i]}
            onChange={(wert) => setAntworten((prev) => ({ ...prev, [f.id || i]: wert }))}
            feedback={feedback?.[i]}
            disabled={!!feedback || wertetAus || busy}
          />
        ))}
        {feedback && (
          <p className="text-center text-sm font-semibold">
            {feedback.filter((b) => b?.erreicht).length} von {fragen.length} Fragen sicher beantwortet
          </p>
        )}
      </div>

      <div className="pt-3 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy || wertetAus}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        {fragen.length > 0 && !feedback ? (
          <Button className="gap-2 bg-violet-600 hover:bg-violet-700" disabled={!alleBeantwortet || wertetAus || busy} onClick={auswerten}>
            {wertetAus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
            {wertetAus ? 'KI wertet aus …' : 'Antworten von der KI prüfen lassen'}
          </Button>
        ) : (
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" disabled={busy} onClick={onErledigt}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Erledigt
          </Button>
        )}
      </div>
    </div>
  );
}