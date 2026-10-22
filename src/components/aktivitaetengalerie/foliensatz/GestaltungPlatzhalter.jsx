import React from 'react';
import { Palette } from 'lucide-react';

const OFFEN = [
  'Gesamtlayout: Farbschema, Hintergrund, Kopf- und Fußbereich der Folien',
  'Einheitliches Aussehen je Element: Button, Eingabefeld, Textfeld, Überschrift, Bildrahmen, Timer, Symbole …',
  'Abstände, Ecken, Schatten und Schriftgrößen als feste Regeln',
];

/** Schritt 2 (Prototyp): gestaltete Vorlage – wartet noch auf die festen Gestaltungsregeln. */
export default function GestaltungPlatzhalter() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center">
      <Palette className="h-8 w-8 text-primary" />
      <p className="font-display text-lg font-bold">Gestaltete Vorlage</p>
      <p className="max-w-xl text-sm text-muted-foreground">Hier baut ein Assistent aus dem Funktionsaufbau die echte, wiedererkennbare Ansicht. Dafür müssen zuerst diese Regeln festgelegt werden:</p>
      <ul className="max-w-xl list-disc text-left text-sm">{OFFEN.map((t) => <li key={t}>{t}</li>)}</ul>
    </div>
  );
}