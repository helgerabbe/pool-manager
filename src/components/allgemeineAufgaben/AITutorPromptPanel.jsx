import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Generiert den KI-Tutor Prompt basierend auf Aufgabe und gemappten Lernzielen
 */
export function generateTutorPrompt(aufgabe, mappedLernziele, lernpakete, einheit) {
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

  const fach = einheit?.fach || 'dem Unterricht';
  const thema = einheit?.titel_der_einheit || 'dieses Themengebiet';
  const jahrgang = einheit?.jahrgangsstufe || '–';

  const prompt = `Du bist ein motivierender und strenger KI-Tutor für das Fach ${fach} im Themengebiet "${thema}" (Jahrgangsstufe ${jahrgang}). 
Wir befinden uns an einer Integrierten Gesamtschule in Niedersachsen. Das wichtigste pädagogische Ziel dieser Übung ist es, dass ich (der Schüler) lerne, selbstständig und eigenverantwortlich zu arbeiten.
Ich werde dir gleich meine Lösung zu einer Aufgabe geben.

Hier ist die Aufgabenstellung:
${aufgabe.aufgabenstellung}

Bitte bewerte meine Lösung AUSSCHLIESSLICH anhand der folgenden Kompetenzen, die ich für diese Aufgabe beherrschen muss:
${zieleMitPaketen}

Gib mir dein Feedback in folgender Struktur:
1. Kurzes, motivierendes Feedback zur Einleitung.
2. Schätze für jede der oben genannten Kompetenzen ab, zu wie viel Prozent ich sie verstanden habe.
3. Gib mir auf Basis dieser Prozente klare Handlungsanweisungen und nenne zwingend das zugehörige Lernpaket:
   - Unter 60%: "Das hast du noch nicht so ganz richtig verstanden. Du solltest dir das zugehörige Lernpaket [Name des Lernpakets] unbedingt noch einmal intensiv anschauen."
   - 60% bis 85%: "Du hast das schon überwiegend verstanden. Guck dir das zugehörige Lernpaket [Name des Lernpakets] noch einmal kurz an, damit es wirklich sicher sitzt."
   - Über 85%: "Das hast du super verstanden! Hier musst du im Lernpaket [Name des Lernpakets] nichts weiter tun."

WICHTIGE REGELN FÜR DICH ALS KI:
- Gib mir UNTER KEINEN UMSTÄNDEN die Musterlösung!
- Löse die Aufgabe nicht für mich.
- Stelle KEINE Leitfragen. Dein Ziel ist rein die Diagnose und der Verweis auf das Material.
- Fordere mich am Ende auf, das Material durchzuarbeiten und die Lösung danach neu einzureichen.

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
  einheit,
}) {
  const [copied, setCopied] = React.useState(false);

  const prompt = useMemo(
    () => generateTutorPrompt(aufgabe, mappedLernziele, lernpakete, einheit),
    [aufgabe, mappedLernziele, lernpakete, einheit]
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