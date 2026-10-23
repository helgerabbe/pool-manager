import React from 'react';
import { Palette } from 'lucide-react';
import CiVorschau from './CiVorschau';
import CiBedienVorschau from './CiBedienVorschau';
import CiTextTimerVorschau from './CiTextTimerVorschau';
import CiRasterVorschau from './CiRasterVorschau';
import CiRahmenVorschau from './CiRahmenVorschau';
import CiMedienVorschau from './CiMedienVorschau';
import CiSymbolVorschau from './CiSymbolVorschau';
import CiInteraktivVorschau from './CiInteraktivVorschau';
import CiRueckmeldungVorschau from './CiRueckmeldungVorschau';
import CiErgebnisVorschau from './CiErgebnisVorschau';
import CiHilfenVorschau from './CiHilfenVorschau';
import CiZustandVorschau from './CiZustandVorschau';
import CiNiveauVorschau from './CiNiveauVorschau';
import CiGruppenVorschau from './CiGruppenVorschau';
import CiTabletVorschau from './CiTabletVorschau';
import CiFormenVorschau from './CiFormenVorschau';
import CiElementeVorschau from './CiElementeVorschau';
import CiStandardVorschau from './CiStandardVorschau';

const OFFEN = [
  'Gesamtlayout: Farbschema, Hintergrund, Kopf- und Fußbereich der Folien',
  'Einheitliches Aussehen je Element: Button, Eingabefeld, Textfeld, Überschrift, Bildrahmen, Timer, Symbole …',
  'Abstände, Ecken, Schatten und Schriftgrößen als feste Regeln',
];

/** Schritt 2 (Prototyp): gestaltete Vorlage – wartet noch auf die festen Gestaltungsregeln. */
export default function GestaltungPlatzhalter() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-3 overflow-y-auto rounded-xl border border-dashed p-6 text-center">
      <Palette className="h-8 w-8 text-primary" />
      <p className="font-display text-lg font-bold">Gestaltete Vorlage</p>
      <p className="max-w-xl text-sm text-muted-foreground">Hier baut ein Assistent aus dem Funktionsaufbau die echte, wiedererkennbare Ansicht. Dafür müssen zuerst diese Regeln festgelegt werden:</p>
      <ul className="max-w-xl list-disc text-left text-sm">{OFFEN.map((t) => <li key={t}>{t}</li>)}</ul>
      <div className="w-full max-w-4xl text-left"><p className="mb-2 text-sm font-semibold">Festgelegt (Teil 1): Grundfarben, Inhaltsboxen, Folientypen</p><CiVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 2): Buttons und Eingabefelder</p><CiBedienVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 3): Überschriften, Textfelder, Timer</p><CiTextTimerVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 4): Folienraster mit Kopfleiste und festen Ecken</p><CiRasterVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 5): Bildrahmen, Abstände, Schatten</p><CiRahmenVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 5b): Medien – Bild, Video, Animation, Audio</p><CiMedienVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 6): Symbole für Sozialform und Tätigkeit</p><CiSymbolVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 7): Interaktive Elemente</p><CiInteraktivVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 8): Rückmeldungen</p><CiRueckmeldungVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 8b): Hilfen – Tippkarte und KI-Tutor</p><CiHilfenVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 9): Ergebnisanzeigen an der Tafel</p><CiErgebnisVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 10): Zustände auf dem Schülergerät</p><CiZustandVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 11): Schwierigkeit von Aufgaben</p><CiNiveauVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 12): Gruppenkennung</p><CiGruppenVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 13): Schülergerät iPad 11" und Navigation</p><CiTabletVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 14a): Formen, Linien und Pfeile</p><CiFormenVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 14b): Elemente des Folien-Designers</p><CiElementeVorschau /><p className="mb-2 mt-4 text-sm font-semibold">Festgelegt (Teil 15): Standardfolien für häufige Situationen</p><CiStandardVorschau /></div>
    </div>
  );
}