import { useState } from 'react';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import AufgabenstellungBox from './AufgabenstellungBox';
import HinweisBox from './HinweisBox';
import KICheckPruefung from './KICheckPruefung';

/**
 * Schüler-Aktivität „KI-Check" (Abschluss-Phase).
 *
 * Der Schüler bleibt IN der Umgebung: Er schreibt seine Antwort auf und lässt
 * sie von einer KI anhand der Kriterien der Lehrkraft prüfen. Das ist bewusst
 * KEIN Brian-Gespräch — die KI wird im jeweiligen Kontext angebunden (hier in
 * der App die eigene KI, im fertigen Kurs die KI des Kursbaus).
 */
export default function KICheckSeite({ aktivitaet, busy, onErledigt, onBack }) {
  const fv = aktivitaet?.field_values || {};
  const aufgabenstellung = fv.instruction || 'Zeige mit deiner Antwort, was du gelernt hast.';
  const kriterien = fv.kriterien || fv.erwartungshorizont || '';
  const [bestanden, setBestanden] = useState(false);

  return (
    <div className="h-full flex flex-col max-w-2xl mx-auto w-full px-5 py-6">
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1">
        <div className="space-y-5 pb-2">
          <AufgabenstellungBox>{aufgabenstellung}</AufgabenstellungBox>

          <HinweisBox>
            <p>
              Schreibe deine Antwort auf und lass sie von der <strong>KI prüfen</strong>. Du bekommst
              eine Rückmeldung und kannst deine Antwort so oft überarbeiten, wie du möchtest.
            </p>
          </HinweisBox>

          <KICheckPruefung
            aufgabenstellung={aufgabenstellung}
            kriterien={kriterien}
            onBestanden={() => setBestanden(true)}
          />
        </div>
      </div>

      {/* Aktion: links zurück, rechts grün „Erledigt" */}
      <div className="pt-4 shrink-0 grid grid-cols-2 gap-3">
        <Button variant="outline" className="gap-2" onClick={onBack} disabled={busy}>
          <ArrowLeft className="w-4 h-4" /> Zurück zum Lernpaket
        </Button>
        <Button
          className={cn('gap-2 bg-emerald-600 hover:bg-emerald-700', !bestanden && 'opacity-90')}
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