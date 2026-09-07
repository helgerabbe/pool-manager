/**
 * TestKIPanel.jsx
 * ───────────────
 * Zwei KI-Assistenten für die Test-Bearbeitung:
 *
 *  1) „Fragen aus dem Lernpaket vorschlagen" — liest Titel, Lernziele und die
 *     Inhalte des Lernpakets und schreibt daraus einen Fragen-Entwurf als TEXT,
 *     genau in der Form, die der Test abbilden kann (Multiple Choice,
 *     Richtig/Falsch, Lösungswort, Punkte). Die Lehrkraft kann den Text noch
 *     ändern — er ist bewusst nur ein Zwischenschritt, kein fertiger Test.
 *
 *  2) „Test aus Text erstellen" — verwandelt genau diesen Text (oder einen
 *     eigenen, extern vorbereiteten) in die Testfragen. Nichts wird dabei
 *     erfunden; die Lehrkraft prüft danach im Editor und speichert selbst.
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { ladeLernpaketKontext } from '@/lib/lernpaketTestKontext';

const FRAGE_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['mc', 'true_false', 'solution_word'] },
          question: { type: 'string' },
          points: { type: 'number' },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: { text: { type: 'string' }, isCorrect: { type: 'boolean' } },
              required: ['text', 'isCorrect'],
            },
          },
          correctAnswer: { type: 'boolean' },
          explanation: { type: 'string' },
          expectedAnswer: { type: 'string' },
        },
        required: ['type', 'question'],
      },
    },
  },
  required: ['questions'],
};

const AUFBAU_REGELN = `Der Test kennt genau drei Fragearten:
- Multiple Choice: Fragestellung + 3–4 Antwortmöglichkeiten, davon mindestens eine richtig.
- Richtig / Falsch: eine Aussage, dazu ob sie richtig oder falsch ist, plus kurze Erklärung.
- Lösungswort: Frage, die mit einem Wort beantwortet wird (mehrere erlaubte Schreibweisen mit Semikolon).
Jede Frage hat eine Punktzahl (1–3).`;

export default function TestKIPanel({ lernpaketId = null, disabled = false, onFragenUebernehmen }) {
  const [anzahl, setAnzahl] = useState(8);
  const [text, setText] = useState('');
  const [entwurfBusy, setEntwurfBusy] = useState(false);
  const [bauBusy, setBauBusy] = useState(false);

  // ── Assistent 1: Fragen-Entwurf aus dem Lernpaket ──
  const entwurfErstellen = async () => {
    setEntwurfBusy(true);
    try {
      const kontext = await ladeLernpaketKontext(lernpaketId);
      if (!kontext) {
        toast.error('Zu diesem Test ist kein Lernpaket hinterlegt — bitte den Text selbst einfügen.');
        return;
      }
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bist eine erfahrene Lehrkraft und entwirfst einen Abschlusstest zu einem Lernpaket.

${AUFBAU_REGELN}

Schreibe einen Fragen-Entwurf mit genau ${anzahl} Fragen als KLARTEXT (keine Tabellen, kein JSON), pro Frage in dieser Form:

Frage 1 — Multiple Choice (2 Punkte)
Fragestellung: …
a) … (richtig)
b) …
c) …

Frage 2 — Richtig/Falsch (1 Punkt)
Aussage: …
Richtig? ja
Erklärung: …

Frage 3 — Lösungswort (1 Punkt)
Fragestellung: …
Lösung: …; …

Mische die drei Fragearten sinnvoll und prüfe die zentralen Inhalte und Lernziele des Lernpakets.

LERNPAKET:
${kontext}`,
      });
      const entwurf = typeof res === 'string' ? res : (res?.text || '');
      if (!entwurf.trim()) {
        toast.error('Es konnte kein Entwurf erstellt werden.');
        return;
      }
      setText(entwurf.trim());
      toast.success('Entwurf erstellt — du kannst ihn jetzt anpassen.');
    } finally {
      setEntwurfBusy(false);
    }
  };

  // ── Assistent 2: Test aus dem Text bauen ──
  const testBauen = async () => {
    if (!text.trim()) return;
    setBauBusy(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bekommst den Textentwurf eines Tests von einer Lehrkraft und überträgst ihn EXAKT in die Teststruktur.
Erfinde keine Fragen, keine Antworten und keine Lösungen, formuliere nichts um. Übernimm die angegebenen Punkte (fehlt eine Angabe: 1 Punkt).

${AUFBAU_REGELN}

Feldbelegung:
- type='mc' → options (mindestens 2, richtige mit isCorrect=true)
- type='true_false' → correctAnswer (true/false), explanation falls im Text vorhanden
- type='solution_word' → expectedAnswer (mehrere erlaubte Antworten mit Semikolon)

TEXT:
${text}`,
        response_json_schema: FRAGE_SCHEMA,
      });

      const fragen = (res?.questions || []).filter((q) => q?.question?.trim());
      if (fragen.length === 0) {
        toast.error('Aus dem Text konnten keine Fragen erkannt werden.');
        return;
      }
      onFragenUebernehmen?.(fragen);
      toast.success(`${fragen.length} Fragen übernommen — bitte prüfen und speichern.`);
    } finally {
      setBauBusy(false);
    }
  };

  const busy = disabled || entwurfBusy || bauBusy;

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-700" />
        <p className="text-sm font-semibold text-violet-900">KI-Unterstützung</p>
      </div>

      {/* Schritt 1 */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-violet-900">
          1. Fragen-Entwurf aus dem Lernpaket
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-violet-800">Anzahl Fragen:</span>
            <select
              value={anzahl}
              onChange={(e) => setAnzahl(Number(e.target.value))}
              disabled={busy}
              className="h-8 rounded-md border border-input bg-white px-2 text-xs font-semibold"
            >
              {[6, 7, 8, 9, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <Button size="sm" variant="outline" onClick={entwurfErstellen} disabled={busy} className="gap-2 bg-white">
            {entwurfBusy
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Entwurf entsteht…</>
              : <><Sparkles className="w-3.5 h-3.5" /> Entwurf erstellen</>}
          </Button>
        </div>
      </div>

      {/* Schritt 2 */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-violet-900">
          2. Test aus Text erstellen
        </Label>
        <p className="text-xs text-violet-800/80">
          Hier steht der Entwurf aus Schritt 1 — du kannst ihn ändern oder einen eigenen Text einfügen.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          disabled={busy}
          placeholder={'Frage 1 — Multiple Choice (2 Punkte)\nFragestellung: …\na) … (richtig)\nb) …'}
          className="text-sm bg-white"
        />
        <Button size="sm" onClick={testBauen} disabled={busy || !text.trim()} className="gap-2 w-full">
          {bauBusy
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Test wird gebaut…</>
            : <><Wand2 className="w-3.5 h-3.5" /> Fragen in den Test übernehmen</>}
        </Button>
      </div>
    </div>
  );
}