import React from 'react';
import { BookCheck } from 'lucide-react';

/** Zeigt, wie viele KC-Vorgaben in der Auswahl abgedeckt sind. */
export default function KcAbdeckung({ inhalte }) {
  const kc = inhalte.filter((i) => i.kc);
  if (!kc.length) return null;
  const drin = kc.filter((i) => i.prioritaet === 'muss').length;
  const offen = kc.filter((i) => i.prioritaet === 'vielleicht').length;
  const raus = kc.filter((i) => i.prioritaet === 'raus');
  const voll = drin === kc.length;

  return (
    <div className={`rounded-lg border p-3 text-sm ${voll ? 'border-primary/40 bg-primary/5' : 'bg-muted/40'}`}>
      <div className="flex items-center gap-2 font-semibold">
        <BookCheck className="h-4 w-4 text-primary" />
        Kerncurriculum: {drin} von {kc.length} Vorgaben sind fest eingeplant
      </div>
      {offen > 0 && <p className="mt-1 text-xs text-muted-foreground">{offen} KC-Vorgabe{offen !== 1 ? 'n stehen' : ' steht'} noch auf „Vielleicht“.</p>}
      {raus.length > 0 && (
        <p className="mt-1 text-xs text-destructive">
          Bewusst nicht eingeplant: {raus.map((i) => i.titel).join(', ')}
        </p>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">Einschätzung der KI-Recherche — bitte mit dem KC abgleichen.</p>
    </div>
  );
}