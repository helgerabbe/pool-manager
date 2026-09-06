import { CheckCircle2, AlertCircle, Bot, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * Eine Frage des KI-Quiz: Fragetext, freies Antwortfeld, Prüfen-Knopf und –
 * direkt nach dem Prüfen – die einmalige KI-Rückmeldung zu dieser Antwort.
 */
export default function KIQuizFrageKarte({ frage, index, gesamt, antwort, onChange, onPruefen, feedback, prueft, disabled }) {
  const bewertet = !!feedback;
  const gut = feedback?.erreicht === true;
  const hatAntwort = String(antwort || '').trim() !== '';
  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3',
      bewertet ? (gut ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/50') : 'border-border bg-card'
    )}>
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded-full bg-violet-100 text-violet-700 text-xs font-bold px-2 h-6 flex items-center justify-center mt-0.5">
          Frage {index + 1} von {gesamt}
        </span>
        <p className="text-sm font-semibold leading-snug">{frage.frage}</p>
      </div>
      <Textarea
        value={antwort || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Deine Antwort in vollständigen Sätzen …"
        disabled={disabled || bewertet || prueft}
        className="min-h-[110px] bg-background"
      />
      {!bewertet && (
        <Button className="gap-2 bg-violet-600 hover:bg-violet-700 w-full" disabled={!hatAntwort || prueft || disabled} onClick={onPruefen}>
          {prueft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
          {prueft ? 'KI prüft deine Antwort …' : 'Antwort prüfen lassen'}
        </Button>
      )}
      {bewertet && (
        <div className={cn('rounded-lg px-3 py-2 text-sm flex items-start gap-2', gut ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900')}>
          {gut ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <div>
            <p className="font-medium flex items-center gap-1"><Bot className="w-3.5 h-3.5" /> Rückmeldung der KI</p>
            <p className="mt-0.5 leading-snug">{feedback.rueckmeldung}</p>
          </div>
        </div>
      )}
    </div>
  );
}