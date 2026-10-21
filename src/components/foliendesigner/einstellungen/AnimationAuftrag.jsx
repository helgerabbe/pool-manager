import React from 'react';
import { Textarea } from '@/components/ui/textarea';

/** Auftrag an die KI für eine (interaktive) Animation. */
export default function AnimationAuftrag({ el, setze }) {
  const interaktiv = el.typ === 'animation_interaktiv';
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">Auftrag an die KI</p>
      <p className="text-xs text-muted-foreground">
        {interaktiv ? 'Beschreibe bitte, was für eine Animation zu sehen sein soll und worin die Interaktivität bestehen soll.' : 'Beschreibe bitte, welche Animation zu sehen sein soll und was die KI machen soll.'}
      </p>
      <Textarea rows={6} value={el.auftrag || ''} onChange={(e) => setze({ auftrag: e.target.value })}
        placeholder={interaktiv ? 'z. B. Eine Pyramide klappt sich auf und zu. Mit einem Regler bestimmen die Schüler die Geschwindigkeit.' : 'z. B. Das Netz einer Pyramide klappt sich langsam auf.'} />
    </div>
  );
}