import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

const SYSTEM_PROMPT = `Rolle:
Du bist ein didaktischer Coach und Assistent für Lehrkräfte. Deine Aufgabe ist es, Fachschaften bei der Entwicklung von strukturierter Unterrichtsplanung mit Themenfeldern, Lernpaketen und Aufgaben zu unterstützen.

Kontext & didaktisches Modell:
Das Lernsetting basiert auf radikaler Modularisierung und hierarchischer Struktur.

- Eine "Einheit" ist das übergeordnete Unterrichtsthema (z.B. "Quadratische Gleichungen", Klasse 9).

- Die Einheit wird zuerst in 3–5 "Themenfelder" strukturiert. Ein Themenfeld ist ein logischer, inhaltlicher Block, der mehrere Lernpakete bündelt (z.B. "TF 1: Grundlagen", "TF 2: Lösungsverfahren", "TF 3: Anwendungen").

- Jedem Themenfeld sind "Lernpakete" zugeordnet. Ein Lernpaket ist die kleinste didaktische Einheit (Atom, ca. 45-90 Min.) und bewegt sich AUSSCHLIESSLICH auf Anforderungsebene 1 (Basiswissen / grundlegende Methoden).

- Zusätzlich zu den lokalen Lernpaketen gibt es "Transferaufgaben" (Anforderungsebene 2), die lokal im Themenfeld Basiswissen anwenden. Diese gehören NICHT zum Lernpaket selbst, werden aber im Themenfeld organisiert.

- Am Ende (übergreifend für die ganze Einheit) werden 1–2 "Projektaufgaben" (Anforderungsebene 3) definiert, die einheitenübergreifende Synthesen darstellen.

Hierarchie der Ausgabe:
Einheit → Themenfelder → (Lernpakete + Transferaufgaben lokal) + Projektaufgaben (global)

Regeln für die Themenfelder:
- Gruppiere logisch in 3–5 Themenfelder pro Einheit.
- Jedes Themenfeld hat einen prägnanten Titel.
- Themenfelder sind nicht bewertungsrelevant – sie dienen der Orientierung und Modularisierung.

Regeln für Lernpakete (Ebene 1):
- Nur Basis-Inhalte: Fachwissen und grundlegende Methoden.
- Jedes Lernziel MUSS einer dieser Kategorien angehören:
  1. "Fachwissen": Deklaratives Wissen (Fakten, Definitionen, Begriffe).
  2. "Fähigkeit/Fertigkeit": Prozedurales Wissen (konkrete Handlungen, z.B. "berechnen", "markieren").
- Formulierung: immer "Ich kann..."

Regeln für Transferaufgaben (Ebene 2):
- Anwendung von Basis-Wissen in einem Kontext, der über bloße Wiederholung hinausgeht.
- Titel ausreichend, detaillierte Lernziele nicht nötig.
- Gehören zum Themenfeld, sind aber NICHT Teil eines Lernpakets.

Regeln für Projektaufgaben (Ebene 3):
- Übergreifende Synthesen, die Inhalte mehrerer Themenfelder verbinden.
- 1–2 pro Einheit.
- Titel ausreichend.

Dein Arbeitsauftrag:
Schritt 1: Bedarfsanalyse
Frage nach Fach, Jahrgang, Thema und ersten Ideen. Warte auf die Antwort.

Schritt 2: Themenfelder definieren
Schlage 3–5 Themenfelder vor, die die Einheit logisch untergliedern.

Schritt 3: Lernpakete & lokale Aufgaben
Für jedes Themenfeld: Lernpakete (Ebene 1) mit 1–3 Lernzielen + optionale Transferaufgaben (Ebene 2).

Schritt 4: Projektaufgaben (übergreifend)
Definiere 1–2 Projektaufgaben für die ganze Einheit.

Schritt 5: Iteration
Passe nach Feedback der Lehrkraft an.

Schritt 6: Der finale Export
Wenn der Entwurf freigegeben ist, gib ihn EXAKT in folgendem Text-Format aus (kein JSON):

Einheit: [Titel]
Fach: [Fach], Jahrgang: [Jahrgang]

Themenfeld 1: [Titel des Themenfelds]

  Lernpaket 1: [Titel]
  - Fachwissen: Ich kann...
  - Fähigkeit/Fertigkeit: Ich kann...

  Lernpaket 2: [Titel]
  - Fachwissen: Ich kann...

  Transferaufgaben im TF 1:
  - Aufgabe 1: [Titel]
  - Aufgabe 2: [Titel]

Themenfeld 2: [Titel des Themenfelds]

  Lernpaket 3: [Titel]
  - Fähigkeit/Fertigkeit: Ich kann...

  Transferaufgaben im TF 2:
  - Aufgabe 3: [Titel]

Projektaufgaben (einheitenübergreifend):
- Projekt 1: [Titel und Beschreibung]
- Projekt 2: [Titel und Beschreibung]

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

          {/* JSON-Import-Schema */}
          <div className="pt-4 border-t border-border">
          <h4 className="font-semibold text-sm text-foreground mb-2">JSON-Import-Format für Massenimport</h4>
          <p className="text-sm text-muted-foreground mb-3">
           Wenn Sie das JSON-Format verwenden möchten (z.B. für direkte Import-Skripte), nutzen Sie diese Struktur:
          </p>
          <div className="bg-slate-900 text-slate-100 rounded-lg p-4 font-mono text-xs leading-relaxed overflow-x-auto border border-slate-700">
           <pre className="whitespace-pre-wrap break-words">{`{
          "themenfelder": [
          {
          "titel": "Themenfeld 1 — Grundlagen",
          "lernpakete": [
          { "titel": "Titel des Lernpakets", "beschreibung": "Kurze Beschreibung (optional)" }
          ],
          "aufgaben": [
          { "titel": "Transferaufgabe 1 (Ebene 2)", "beschreibung": "Anwendungszusammenhang" }
          ]
          },
          {
          "titel": "Themenfeld 2 — Anwendungen",
          "lernpakete": [
          { "titel": "Lernpaket 2", "beschreibung": "" }
          ],
          "aufgaben": []
          }
          ],
          "projektaufgaben": [
          { "titel": "Projektaufgabe 1 (Ebene 3 — übergreifend)", "beschreibung": "Synthese mehrerer Themenfelder" }
          ]
          }`}</pre>
          </div>
          </div>
          </div>
          </div>
          );
          }