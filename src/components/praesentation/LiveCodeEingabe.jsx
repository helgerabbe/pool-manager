import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { raumFinden } from '@/lib/liveRaum';

/** Schüler geben den Raum-Code von der Tafel ein. */
export default function LiveCodeEingabe({ onGefunden }) {
  const [code, setCode] = React.useState('');
  const [fehler, setFehler] = React.useState('');
  const [sucht, setSucht] = React.useState(false);
  const los = async (e) => {
    e.preventDefault();
    setSucht(true); setFehler('');
    const raum = await raumFinden(code).finally(() => setSucht(false));
    if (raum) onGefunden(raum); else setFehler('Zu diesem Code läuft gerade keine Stunde.');
  };
  return (
    <form onSubmit={los} className="max-w-sm mx-auto mt-24 space-y-4 text-center px-4">
      <h1 className="text-2xl font-display font-bold">Mitmachen</h1>
      <p className="text-sm text-muted-foreground">Gib den Code ein, der an der Tafel steht.</p>
      <Input inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        className="text-center text-3xl font-mono tracking-[0.3em] h-16" placeholder="000000" />
      {fehler && <p className="text-sm text-destructive">{fehler}</p>}
      <Button type="submit" className="w-full" disabled={code.length !== 6 || sucht}>{sucht && <Loader2 className="w-4 h-4 animate-spin" />} Beitreten</Button>
    </form>
  );
}