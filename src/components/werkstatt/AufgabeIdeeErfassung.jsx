import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import MaterialSammlung from '@/components/werkstatt/MaterialSammlung';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

/**
 * Erster Halt des Aufgaben-Assistenten: Was habe ich, und was soll passieren?
 *
 * Material zuerst, weil die Lehrkraft es meist schon vorliegen hat (Foto einer
 * Buchseite, PDF, Link) — und weil der Formatvorschlag daran erkennt, um
 * welche Art Aufgabe es überhaupt gehen kann. Die Idee darf gesprochen werden;
 * das ist der schnellste Weg und ohnehin die Form, in der man sie im Kopf hat.
 */
export default function AufgabeIdeeErfassung({
  materialien,
  onMaterialienChange,
  idee,
  onIdeeChange,
  onSuchen,
  busy = false,
  disabled = false,
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Material (optional)
        </p>
        <MaterialSammlung
          materialien={materialien}
          onChange={onMaterialienChange}
          disabled={disabled}
        />
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Ihre Aufgabenidee
          </p>
          <SpeechInputButton
            value={idee}
            onResult={onIdeeChange}
            disabled={disabled || busy}
            label="Idee aufsprechen"
            listeningLabel="Aufnahme stoppen"
            maxSeconds={60}
          />
        </div>
        <Textarea
          value={idee}
          onChange={(e) => onIdeeChange(e.target.value)}
          rows={5}
          disabled={disabled || busy}
          placeholder="Was sollen die Schüler:innen tun? z. B. Aussagen zu einem Text danach einordnen, ob sie zutreffen, teilweise zutreffen oder nicht zutreffen."
        />
        <Button
          className="gap-2"
          onClick={onSuchen}
          disabled={disabled || busy || !idee.trim()}
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {busy ? 'Ich sehe nach…' : 'Passendes Format suchen'}
        </Button>
      </div>
    </div>
  );
}