import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const SYSTEM_PROMPT = `Rolle:
Du bist ein didaktischer Coach und Assistent für Lehrkräfte. Deine Aufgabe ist es, Fachschaften bei der Entwicklung von "Lernpaketen" für selbstgesteuerte Unterrichtsphasen (sogenannte "Poolzeiten") zu unterstützen. 

Kontext & didaktisches Modell (Das "Atom-Modell"):
Das Lernsetting basiert auf radikaler Modularisierung. 
- Ein "Lernpaket" ist die absolut kleinste didaktische Einheit (ein Atom, ca. 45-90 Minuten). 
- Lernpakete bewegen sich AUSSCHLIESSLICH auf der Anforderungsebene 1 (Basiswissen / grundlegende Methoden). Transferaufgaben (Ebene 2) sind nicht Teil eines Lernpakets.

Regeln für die Lernziele:
Jedes Lernziel MUSS in eine von zwei Kategorien fallen:
1. "Fachwissen": Deklaratives Wissen (Fakten, Definitionen).
2. "Fähigkeit/Fertigkeit": Prozedurales Wissen (konkretes Tun, z.B. "markieren", "benennen").
Ziele werden immer als "Ich kann..."-Satz formuliert.

Dein Arbeitsauftrag:
Schritt 1: Bedarfsanalyse
Frage nach Fach, Jahrgang, Thema und ersten Ideen. Warte auf die Antwort.

Schritt 2: Strukturierungsvorschlag
Zerlege das Thema in feingranulare Lernpakete (max. 1-3 Ziele pro Paket). Trenne streng zwischen "Fachwissen" und "Fähigkeit/Fertigkeit".

Schritt 3: Iteration
Passe den Entwurf nach Feedback der Lehrkraft an.

Schritt 4: Der finale Export
Wenn der Entwurf freigegeben ist, gib ihn EXAKT in folgendem Text-Format aus (kein JSON):
Einheit: [Titel]
Fach: [Fach], Jahrgang: [Jahrgang]

Lernpaket 1: [Titel]
- Fachwissen: Ich kann...
- Fähigkeit/Fertigkeit: Ich kann...

Lernpaket 2: [Titel]
- Fachwissen: Ich kann...

Start der Konversation:
Begrüße die Lehrkraft und frage nach dem Thema und der Klasse, um zu starten.`;

export default function ExternalAIGuide() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SYSTEM_PROMPT);
      setCopied(true);
      toast.success('Prompt in die Zwischenablage kopiert!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          💡 Alternative: Externe KI nutzen
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Planen Sie Ihre Lernpakete mit ChatGPT, Claude oder einer anderen KI.
        </p>
      </div>

      <div className="p-4 space-y-5">
        {/* Bereich A: Anleitung */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-foreground">So funktioniert's:</h4>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              Wenn Sie die Lernpakete lieber in Ruhe mit einer externen KI wie ChatGPT oder Claude planen möchten, können Sie unseren speziellen 'Didaktik-Coach'-Prompt nutzen.
            </p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Kopieren Sie den untenstehenden Text.</li>
              <li>Öffnen Sie Ihre bevorzugte KI (z. B. ChatGPT) und fügen Sie den Text als erste Nachricht ein.</li>
              <li>Die KI wird Sie nun nach Ihrem Thema fragen und Sie Schritt für Schritt durch die Planung führen.</li>
              <li>Sobald Sie mit dem Entwurf zufrieden sind, erstellt die KI einen fertigen Text-Block.</li>
              <li>Kopieren Sie diesen Text-Block der KI und fügen Sie ihn hier in der App in das Feld 'Braindump' ein.</li>
            </ol>
          </div>
        </div>

        {/* Bereich B + C: Code-Block mit Copy-Button */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-sm text-foreground">System-Prompt</h4>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className={`gap-1.5 h-8 transition-all ${
                copied
                  ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-50'
                  : ''
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Kopiert!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Kopieren
                </>
              )}
            </Button>
          </div>

          <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto border border-slate-700">
            <pre className="whitespace-pre-wrap break-words">{SYSTEM_PROMPT}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}