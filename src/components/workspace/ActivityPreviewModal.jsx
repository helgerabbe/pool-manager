import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';

// ── Preview-Renderer für verschiedene Aktivitätstypen ──

function GapTextPreview({ content }) {
  // Ersetze [Text] mit Eingabefeldern
  const parts = content.split(/(\[.+?\])/g);
  
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 border border-border">
        <div className="text-lg leading-relaxed">
          {parts.map((part, idx) => {
            if (part.match(/^\[.+?\]$/)) {
              const gapText = part.slice(1, -1);
              return (
                <span key={idx} className="inline">
                  <input
                    type="text"
                    placeholder={gapText}
                    disabled
                    className="inline-block w-24 px-2 py-1 rounded border-b-2 border-primary/50 bg-transparent text-center text-sm italic placeholder:text-muted-foreground/70 focus:outline-none"
                  />
                  {' '}
                </span>
              );
            }
            return <span key={idx}>{part}</span>;
          })}
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Dies ist eine schülergerechte Vorschau. Die Schüler sehen die Lücken als Eingabefelder.
      </p>
    </div>
  );
}

function PairListPreview({ pairs }) {
  const leftItems = pairs || [];
  const rightItems = Array.from({ length: leftItems.length }, (_, i) => i);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-6 border border-border">
        <div className="grid grid-cols-2 gap-6">
          {/* Linke Spalte */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Zu ordnen</p>
            {leftItems.map((item, idx) => (
              <button
                key={idx}
                disabled
                className="w-full p-3 rounded-lg bg-primary/5 border border-primary/20 text-left text-sm font-medium text-foreground cursor-not-allowed"
              >
                {item.left || '(Leer)'}
              </button>
            ))}
          </div>

          {/* Rechte Spalte */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase">Zuordnungen</p>
            {rightItems.map((idx) => (
              <button
                key={idx}
                disabled
                className="w-full p-3 rounded-lg bg-muted text-left text-sm text-muted-foreground cursor-not-allowed"
              >
                ___________
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Schüler können hier Paare durch Drag & Drop verbinden.
      </p>
    </div>
  );
}

function QuizPreview({ questions }) {
  if (!questions || !Array.isArray(questions)) return null;

  return (
    <div className="space-y-6">
      {questions.map((q, qIdx) => (
        <div key={qIdx} className="bg-white rounded-lg p-6 border border-border space-y-4">
          <h3 className="text-sm font-bold text-foreground">
            Frage {qIdx + 1}: {q.frage || '(Keine Frage)'}
          </h3>

          <div className="space-y-3 pl-4">
            {q.antworten?.map((answer, aIdx) => (
              <label
                key={aIdx}
                className="flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <input
                  type="radio"
                  name={`question-${qIdx}`}
                  disabled
                  className="mt-1 cursor-not-allowed"
                />
                <span className="text-sm text-foreground">{answer.text || '(Keine Antwort)'}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
      <p className="text-xs text-muted-foreground italic">
        Schüler sehen alle Fragen und Antwortoptionen, aber nicht die Lösung.
      </p>
    </div>
  );
}

function VideoPreview({ url }) {
  if (!url) {
    return (
      <div className="bg-muted rounded-lg p-6 border border-border text-center">
        <p className="text-sm text-muted-foreground">Keine Video-URL vorhanden</p>
      </div>
    );
  }

  return (
    <div className="bg-black rounded-lg overflow-hidden border border-border">
      <video
        src={url}
        controls
        className="w-full aspect-video bg-black"
      />
    </div>
  );
}

function ImagePreview({ url }) {
  if (!url) {
    return (
      <div className="bg-muted rounded-lg p-6 border border-border text-center">
        <p className="text-sm text-muted-foreground">Keine Bild-URL vorhanden</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg overflow-hidden border border-border">
      <img
        src={url}
        alt="Vorschau"
        className="w-full h-auto max-h-[500px] object-contain"
      />
    </div>
  );
}

function TextbookPreview({ seite, nummer }) {
  return (
    <div className="bg-white rounded-lg p-6 border border-border space-y-2">
      <p className="text-sm text-foreground">
        <span className="font-semibold">Lehrwerk-Verweis:</span>
      </p>
      <p className="text-lg text-primary font-bold">
        Seite {seite}, Aufgabe {nummer}
      </p>
      <p className="text-xs text-muted-foreground italic">
        Schüler bearbeiten die entsprechende Aufgabe im Lehrwerk.
      </p>
    </div>
  );
}

// ── Haupt-Komponente: ActivityPreviewModal ──

export default function ActivityPreviewModal({ open, onOpenChange, aktivitaet, fieldValues = {} }) {
  if (!aktivitaet) return null;

  const renderPreview = () => {
    // Bestimme den Aktivitätstyp basierend auf dem Namen oder einem Typ-Feld
    const name = aktivitaet.name?.toLowerCase() || '';

    // Gap-Text
    if (name.includes('lückentext') || name.includes('gap') || name.includes('lucke')) {
      return <GapTextPreview content={fieldValues.text || ''} />;
    }

    // Paare finden
    if (name.includes('paare') || name.includes('pair') || name.includes('zuordnung')) {
      return <PairListPreview pairs={fieldValues.pairs || []} />;
    }

    // Quiz/Test
    if (name.includes('quiz') || name.includes('test') || name.includes('frage')) {
      return <QuizPreview questions={fieldValues.questions || []} />;
    }

    // Video
    if (name.includes('video')) {
      return <VideoPreview url={fieldValues.url || ''} />;
    }

    // Bild
    if (name.includes('bild') || name.includes('image')) {
      return <ImagePreview url={fieldValues.url || ''} />;
    }

    // Lehrwerk
    if (name.includes('lehrwerk') || name.includes('textbook')) {
      return <TextbookPreview seite={fieldValues.seite} nummer={fieldValues.nummer} />;
    }

    // Fallback: generische Vorschau
    return (
      <div className="bg-white rounded-lg p-6 border border-border">
        <p className="text-sm text-muted-foreground">
          Für diesen Aktivitätstyp ist keine spezialisierte Vorschau verfügbar.
        </p>
        <pre className="mt-4 text-xs bg-muted p-3 rounded overflow-auto max-h-[300px]">
          {JSON.stringify(fieldValues, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <DialogTitle>Schüler-Vorschau: {aktivitaet.name}</DialogTitle>
          </div>
        </DialogHeader>

        {/* Vorschau-Inhalt */}
        <div className="py-6 bg-slate-50 rounded-lg -mx-6 px-6">
          <div className="space-y-4">
            {renderPreview()}
          </div>
        </div>

        {/* Info-Hinweis */}
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800 text-xs">
          <p className="font-semibold mb-1">💡 Dies ist die Schüler-Perspektive</p>
          <p>Schüler sehen diese Ansicht im Lernpaket. Bearbeitungs-Tools sind verborgen.</p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="gap-2">
            <X className="w-4 h-4" /> Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}