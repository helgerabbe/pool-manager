/**
 * QuizTextImportPanel.jsx
 *
 * Mini-Quiz: Fertige Fragen samt Antworten aus einem eingefügten Text übernehmen.
 * Die Lehrkraft hat ihre Fragen schon (Word, Buch, Notizen) — hier klebt sie den
 * Text ein, die KI zerlegt ihn nur in die Quiz-Struktur (nichts wird erfunden).
 */

import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardPaste, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

export default function QuizTextImportPanel({ onImport, disabled = false, maxQuestions = 12 }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const handleImport = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `Du bekommst den Rohtext einer Lehrkraft mit fertigen Quizfragen und Antwortmöglichkeiten.
Zerlege ihn EXAKT in eine Quiz-Struktur. Erfinde KEINE Fragen und KEINE Antworten, formuliere nichts um.
Markierungen für richtige Antworten im Text (z. B. *, ✓, "richtig", (r), Fettung, Unterstreichung, Hinweis "Lösung: B") erkennst du und setzt entsprechend isCorrect=true.
Ist bei einer Frage keine Markierung erkennbar, setze bei der plausibelsten Antwort isCorrect=true.
Maximal ${maxQuestions} Fragen. Jede Frage braucht mindestens 2 Antwortoptionen.

ROHTEXT:
${text}`,
        response_json_schema: {
          type: 'object',
          properties: {
            questions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  question: { type: 'string' },
                  answers: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        text: { type: 'string' },
                        isCorrect: { type: 'boolean' },
                      },
                      required: ['text', 'isCorrect'],
                    },
                  },
                },
                required: ['question', 'answers'],
              },
            },
          },
          required: ['questions'],
        },
      });

      const parsed = (res?.questions || []).filter(
        (q) => q?.question?.trim() && Array.isArray(q.answers) && q.answers.length >= 2
      );
      if (parsed.length === 0) {
        toast.error('Aus dem Text konnten keine Fragen erkannt werden.');
        return;
      }
      onImport?.(parsed);
      setText('');
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-violet-900">
          <ClipboardPaste className="w-4 h-4" />
          Fertige Fragen aus Text übernehmen
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-violet-700" /> : <ChevronDown className="w-4 h-4 text-violet-700" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          <p className="text-xs text-violet-800/80">
            Füge deine Fragen mit Antwortmöglichkeiten ein. Richtige Antworten kannst du z. B. mit
            „*" oder „(richtig)" markieren — die KI ordnet nur zu und erfindet nichts.
          </p>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            disabled={disabled || busy}
            placeholder={`1. Wie heißt die Hauptstadt von Italien?\na) Mailand\nb) Rom *\nc) Neapel\n\n2. ...`}
            className="text-sm bg-white"
          />
          <Button
            size="sm"
            onClick={handleImport}
            disabled={disabled || busy || !text.trim()}
            className="gap-2 w-full"
          >
            {busy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Fragen werden erstellt…</> : <>Quizfragen aus Text erstellen</>}
          </Button>
        </div>
      )}
    </div>
  );
}