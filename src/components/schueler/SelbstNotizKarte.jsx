import { MessageSquareQuote } from 'lucide-react';

/**
 * Der emotionale Anker: die Nachricht, die der Schüler sich beim letzten Mal
 * selbst hinterlassen hat. Verbindet die heutige Poolzeit mit der letzten.
 */
export default function SelbstNotizKarte({ notiz, datum }) {
  if (!notiz) return null;
  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-5 flex gap-4">
      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-accent/15 shrink-0">
        <MessageSquareQuote className="w-5 h-5 text-accent" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1">
          Deine Notiz von letztem Mal{datum ? ` · ${datum}` : ''}
        </p>
        <p className="text-foreground leading-relaxed">„{notiz}"</p>
      </div>
    </div>
  );
}