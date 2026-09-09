/**
 * VorschlagBlock — der Vorschlag eines Befunds, zum Mitnehmen.
 *
 * Bei Befunden aus dem didaktischen Blick (mbk_quelle='sichtung') steht im
 * Vorschlag häufig ein FERTIGER Einfügetext. Der soll nicht abgetippt werden:
 * Deshalb wird er dann als Textblock mit „Text kopieren" gezeigt. Alle anderen
 * Vorschläge bleiben ein schlichter Hinweissatz — mit derselben Kopiermöglichkeit.
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Sparkles } from 'lucide-react';

export default function VorschlagBlock({ vorschlag, istEinfuegetext }) {
  const [kopiert, setKopiert] = useState(false);
  if (!vorschlag) return null;

  const kopieren = async () => {
    await navigator.clipboard.writeText(vorschlag);
    setKopiert(true);
    setTimeout(() => setKopiert(false), 2000);
  };

  const KopierButton = (
    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={kopieren}>
      {kopiert ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
      {kopiert ? 'Kopiert' : 'Text kopieren'}
    </Button>
  );

  if (!istEinfuegetext) {
    return (
      <div className="flex items-start gap-1">
        <p className="text-xs text-muted-foreground flex-1">→ {vorschlag}</p>
        {KopierButton}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-2.5 space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-blue-700" />
        <span className="text-xs font-semibold text-blue-900 flex-1">
          Fertiger Vorschlagstext — kann direkt übernommen werden
        </span>
        {KopierButton}
      </div>
      <p className="text-sm text-blue-950 whitespace-pre-wrap">{vorschlag}</p>
    </div>
  );
}