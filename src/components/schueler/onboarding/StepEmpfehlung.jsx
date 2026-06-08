import { useEffect, useState } from 'react';
import { Sparkles, Loader2, ArrowLeft, ArrowRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { getLerntyp } from '@/lib/lerntypen';

/**
 * Schritt 5 – finale Lerntyp-Empfehlung. Ruft empfehleLerntyp mit den
 * gesammelten Eingaben auf und zeigt das Ergebnis. Speichert die Empfehlung
 * über onSpeichern im Fortschritt. Der Schüler kann von hier direkt zum
 * empfohlenen Dashboard wechseln.
 */
export default function StepEmpfehlung({
  einheitId, selbstAvg, quizAnteil, brianVerlauf, onSpeichern, onDashboard, onZurueck,
}) {
  const [laedt, setLaedt] = useState(true);
  const [empfehlung, setEmpfehlung] = useState(null);
  const [begruendung, setBegruendung] = useState('');
  const [fehler, setFehler] = useState(null);

  const generieren = async () => {
    setLaedt(true);
    setFehler(null);
    try {
      const res = await base44.functions.invoke('empfehleLerntyp', {
        einheitId,
        selbsteinschaetzung_avg: selbstAvg,
        quiz_anteil_richtig: quizAnteil,
        brian_transkript: brianVerlauf,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      setEmpfehlung(res.data.empfehlung);
      setBegruendung(res.data.begruendung || '');
      onSpeichern?.(res.data.empfehlung);
    } catch (e) {
      setFehler(e?.message || 'Empfehlung konnte nicht erstellt werden.');
    } finally {
      setLaedt(false);
    }
  };

  useEffect(() => {
    generieren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lt = empfehlung ? getLerntyp(empfehlung) : null;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-6">
        {laedt ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-3 text-primary" />
            <p className="text-sm font-medium">Brian überlegt, was zu dir passt …</p>
          </div>
        ) : fehler ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-sm text-foreground font-medium">{fehler}</p>
            <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={generieren}>
              <RefreshCw className="w-3.5 h-3.5" /> Erneut versuchen
            </Button>
          </div>
        ) : lt ? (
          <div className="text-center py-4">
            <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: `${lt.farbe}1a` }}>
              <Sparkles className="w-7 h-7" style={{ color: lt.farbe }} />
            </span>
            <p className="text-sm text-muted-foreground">Brians Empfehlung für dich:</p>
            <h2 className="text-2xl font-bold mt-1" style={{ color: lt.farbe }}>{lt.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{lt.untertitel}</p>
            <p className="text-sm text-foreground mt-4 max-w-md mx-auto leading-relaxed">{begruendung}</p>

            <Button onClick={() => onDashboard(empfehlung)} className="mt-6 gap-2" style={{ backgroundColor: lt.farbe }}>
              Mit {lt.name} starten
              <ArrowRight className="w-4 h-4" />
            </Button>
            <p className="text-xs text-muted-foreground mt-3">
              Du entscheidest selbst – du kannst auch jedes andere Dashboard wählen.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onZurueck} className="gap-2"><ArrowLeft className="w-4 h-4" />Zurück</Button>
        {!laedt && lt && (
          <Button variant="outline" onClick={generieren} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Neu auswerten
          </Button>
        )}
      </div>
    </div>
  );
}