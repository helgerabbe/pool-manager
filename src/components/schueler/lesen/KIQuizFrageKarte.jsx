import { CheckCircle2, AlertCircle, Bot } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

/**
 * Eine Frage des KI-Quiz: Fragetext, freies Antwortfeld und – nach der
 * Auswertung – die kurze KI-Rückmeldung.
 */
export default function KIQuizFrageKarte({ frage, index, antwort, onChange, feedback, disabled }) {
  const bewertet = !!feedback;
  const gut = feedback?.erreicht === true;
  return (
    <div className={cn(
      'rounded-xl border p-4 space-y-3',
      bewertet ? (gut ? 'border-emerald-300 bg-emerald-50/50' : 'border-amber-300 bg-amber-50/50') : 'border-border bg-card'
    )}>
      <div className="flex items-start gap-2">
        <span className="shrink-0 w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-bold flex items-center justify-center mt-0.5">
          {index + 1}
        </span>
        <p className="text-sm font-semibold leading-snug">{frage.frage}</p>
      </div>
      <Textarea
        value={antwort || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Deine Antwort in vollständigen Sätzen …"
        disabled={disabled}
        className="min-h-[90px] bg-background"
      />
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