/**
 * Kompakte Anzeige der Übergabe an Brian innerhalb einer Phase des
 * Regieblatts – plus der Button, der den Konfigurations-Dialog öffnet.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { MessagesSquare, AlertTriangle } from 'lucide-react';
import { istBrianVollstaendig } from '@/lib/stundenPhasen';
import StundenBrianDialog from './StundenBrianDialog';

function Feld({ label, wert }) {
  if (!wert) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-violet-800">{label}</p>
      <p className="text-xs text-foreground whitespace-pre-wrap line-clamp-4">{wert}</p>
    </div>
  );
}

export default function StundenBrianUebergabe({ phase, stunde, stundeId }) {
  const [offen, setOffen] = useState(false);
  const brian = phase.brian || {};
  const fertig = istBrianVollstaendig(brian);

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-xs font-semibold text-violet-900 inline-flex items-center gap-1.5">
          <MessagesSquare className="w-3.5 h-3.5" />
          Übergabe an Brian
        </p>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={() => setOffen(true)}>
          Dialog bearbeiten – mit KI befüllen
        </Button>
      </div>

      {fertig ? (
        <div className="space-y-2">
          <Feld label="Dialogname" wert={brian.dialog_name} />
          <Feld label="Anweisung für Lernende" wert={brian.learner_instruction} />
          <Feld label="Interne Anweisung" wert={brian.system_instruction} />
          <Feld label="Dialog beendet, wenn" wert={brian.completion_rule} />
        </div>
      ) : (
        <p className="text-xs font-medium text-red-700 inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" />
          Der Brian-Dialog ist noch nicht eingerichtet.
        </p>
      )}

      {offen && (
        <StundenBrianDialog
          open={offen}
          onOpenChange={setOffen}
          phase={phase}
          stunde={stunde}
          stundeId={stundeId}
        />
      )}
    </div>
  );
}