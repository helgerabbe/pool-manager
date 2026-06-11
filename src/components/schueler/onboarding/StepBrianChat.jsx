import { useState, useEffect, useRef } from 'react';
import { MessageCircle, ArrowRight, ArrowLeft, Send, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { invokeFunction } from '@/services/schueler/SchuelerDataService';

/**
 * Schritt 4 – simuliertes Gespräch mit dem KI-Lernbegleiter „Brian".
 * (Später wird das an brian.teach verlinkt; hier simulieren wir Brian über
 * die Backend-Funktion brianLerntypChat.)
 *
 * Der Gesprächsverlauf wird nach oben an den Eltern-Flow gemeldet, damit die
 * finale Empfehlung ihn berücksichtigen kann.
 */
export default function StepBrianChat({ einheitId, leitfaden, verlauf, setVerlauf, onWeiter, onZurueck }) {
  const [eingabe, setEingabe] = useState('');
  const [laedt, setLaedt] = useState(false);
  const scrollRef = useRef(null);

  // Beim ersten Öffnen Brian begrüßen lassen.
  useEffect(() => {
    if (verlauf.length === 0) brianAntwort([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [verlauf, laedt]);

  const brianAntwort = async (aktuellerVerlauf) => {
    setLaedt(true);
    try {
      const res = await invokeFunction('brianLerntypChat', {
        einheitId,
        verlauf: aktuellerVerlauf,
        leitfaden,
      });
      const antwort = res?.antwort;
      if (antwort) {
        setVerlauf([...aktuellerVerlauf, { rolle: 'assistant', text: antwort }]);
      }
    } finally {
      setLaedt(false);
    }
  };

  const senden = () => {
    const text = eingabe.trim();
    if (!text || laedt) return;
    const neu = [...verlauf, { rolle: 'user', text }];
    setVerlauf(neu);
    setEingabe('');
    brianAntwort(neu);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-sky-50/60">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-sky-100 text-sky-600 shrink-0">
            <MessageCircle className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-foreground">Sprich mit Brian</h2>
            <p className="text-xs text-muted-foreground">Dein KI-Lernbegleiter hilft dir, deinen Lerntyp zu finden.</p>
          </div>
        </div>

        <div ref={scrollRef} className="h-80 overflow-y-auto p-4 space-y-3 bg-muted/20">
          {verlauf.map((m, i) => (
            <div key={i} className={`flex ${m.rolle === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                  m.rolle === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-sm'
                    : 'bg-card border border-border text-foreground rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {laedt && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                <Loader2 className="w-4 h-4 animate-spin text-sky-500" />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 p-3 border-t border-border">
          <input
            value={eingabe}
            onChange={(e) => setEingabe(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && senden()}
            placeholder="Schreib Brian etwas …"
            className="flex-1 rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <Button onClick={senden} disabled={!eingabe.trim() || laedt} size="icon" className="rounded-xl shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onZurueck} className="gap-2"><ArrowLeft className="w-4 h-4" />Zurück</Button>
        <Button onClick={onWeiter} className="gap-2">
          <Sparkles className="w-4 h-4" />
          Empfehlung erhalten
        </Button>
      </div>
    </div>
  );
}