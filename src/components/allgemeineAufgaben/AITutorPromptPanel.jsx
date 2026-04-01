import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Generiert den KI-Tutor Prompt basierend auf Aufgabe und gemappten Lernzielen
 */
export function generateTutorPrompt(aufgabe, mappedLernziele, lernpakete) {
  if (!aufgabe || !mappedLernziele || mappedLernziele.length === 0) {
    return null;
  }

  // Erstelle die Liste der Lernziele mit zugehörigen Paketen
  const zieleMitPaketen = mappedLernziele.map((lz) => {
    const paket = lernpakete.find((p) => p.id === lz.lernpaket_id);
    const zielText = lz.schueler_uebersetzung || lz.formulierung_fachsprache;
    const paketTitel = paket?.titel_des_pakets || 'Unbekanntes Paket';
    return `- ${zielText} (Gehört zum Lernpaket: ${paketTitel})`;
  }).join('\n');

  const prompt = `Du bist ein motivierender und strenger KI-Tutor. 
Ich (der Schüler) werde dir gleich meine Lösung zu einer Aufgabe geben.

Hier ist die Aufgabenstellung:
${aufgabe.aufgabenstellung}

Bitte bewerte meine Lösung AUSSCHLIESSLICH anhand der folgenden Kompetenzen, die ich für diese Aufgabe beherrschen muss:
${zieleMitPaketen}

Gib mir dein Feedback in folgender Struktur:
1. Kurzes, motivierendes Feedback.
2. Bewerte die oben genannten Kompetenzen in vier Kategorien:
   - Das kannst du schon
   - Das kannst du überwiegend
   - Das kannst du teilweise
   - Das solltest du dir noch einmal anschauen
3. Wenn du Kompetenzen in die letzten beiden Kategorien einordnest, nenne mir zwingend den Namen des dazugehörigen Lernpakets, damit ich weiß, wo ich nachlernen muss.

WICHTIGE REGELN FÜR DICH ALS KI:
- Gib mir UNTER KEINEN UMSTÄNDEN die Musterlösung!
- Löse die Aufgabe nicht für mich.
- Stelle mir stattdessen gezielte Leitfragen, damit ich selbst auf die Lösung komme.
- Fordere mich am Ende auf, meine Lösung zu überarbeiten und dir neu einzureichen.

Hier ist meine Lösung:
[HIER FÜGT DER SCHÜLER SEINE LÖSUNG EIN]`;

  return prompt;
}

/**
 * Panel für KI-Tutor Prompt Anzeige und Verwaltung
 */
export default function AITutorPromptPanel({
  aufgabe,
  mappedLernziele,
  lernpakete,
}) {
  const [copied, setCopied] = React.useState(false);

  const prompt = useMemo(
    () => generateTutorPrompt(aufgabe, mappedLernziele, lernpakete),
    [aufgabe, mappedLernziele, lernpakete]
  );

  const handleCopyPrompt = async () => {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      toast.success('Prompt in Zwischenablage kopiert');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Fehler beim Kopieren');
    }
  };

  if (!prompt) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-muted-foreground mb-2">Keine Kompetenzen zugeordnet</p>
          <p className="text-sm text-muted-foreground">
            Bitte ordne zuerst Kompetenzen zu, um den Prompt zu generieren.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">KI-Tutor Prompt</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCopyPrompt}
          className="gap-2"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              Kopiert
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Kopieren
            </>
          )}
        </Button>
      </div>

      <pre className="bg-slate-50 p-4 rounded-md text-sm whitespace-pre-wrap text-foreground border border-border overflow-auto max-h-96">
        {prompt}
      </pre>

      <p className="text-xs text-muted-foreground">
        Dieser Prompt wird Schülern in Moodle zur Verfügung gestellt, um ihre Lösungen bewerten zu lassen.
      </p>
    </div>
  );
}