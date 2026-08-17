import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, Lock, ArrowLeft } from 'lucide-react';

/**
 * Code-Sperre vor einer Phase: die Schüler geben den dreistelligen Code ein,
 * den die Lehrkraft im Unterricht nennt. Der Notfall-Code der Stunde öffnet
 * jede Phase.
 */
export default function StundenCodeGate({ phasenname, code, notfallCode, onEntsperrt, onZurueck }) {
  const [eingabe, setEingabe] = React.useState('');
  const [fehler, setFehler] = React.useState(false);

  const pruefen = () => {
    const v = eingabe.trim();
    if (v && (v === String(code) || (notfallCode && v === String(notfallCode)))) {
      onEntsperrt();
    } else {
      setFehler(true);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto px-6">
      <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted text-muted-foreground mb-4">
        <Lock className="w-6 h-6" />
      </span>
      <h2 className="text-lg font-bold text-foreground">{phasenname || 'Nächster Schritt'}</h2>
      <p className="text-sm text-muted-foreground mt-1">
        Gib den Code ein, den deine Lehrkraft nennt.
      </p>
      <Input
        value={eingabe}
        onChange={(e) => { setEingabe(e.target.value); setFehler(false); }}
        onKeyDown={(e) => e.key === 'Enter' && pruefen()}
        inputMode="numeric"
        maxLength={3}
        placeholder="000"
        className="mt-5 text-center text-2xl font-mono tracking-[0.4em] h-14"
      />
      {fehler && <p className="text-xs text-rose-600 mt-2">Dieser Code passt nicht. Versuch es nochmal.</p>}
      <Button className="mt-4 w-full gap-2" onClick={pruefen} disabled={!eingabe.trim()}>
        <KeyRound className="w-4 h-4" /> Freischalten
      </Button>
      {onZurueck && (
        <Button variant="ghost" className="mt-3 gap-2 text-muted-foreground" onClick={onZurueck}>
          <ArrowLeft className="w-4 h-4" /> Zurück zur letzten Seite
        </Button>
      )}
    </div>
  );
}