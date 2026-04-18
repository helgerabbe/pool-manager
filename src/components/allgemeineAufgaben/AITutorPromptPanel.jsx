import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, AlertTriangle, RefreshCw, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Dynamischer Tutor-Prompt-Generator (Level 2 – Transfer) ──────────────────
function buildTutorPrompt({ aufgabe, einheit, mappedLernziele = [], mappedBasisLernziele = [] }) {
  const fach            = einheit?.fach || 'unbekanntes Fach';
  const jahrgangsstufe  = einheit?.jahrgangsstufe || 'unbekannte Jahrgangsstufe';
  const thema           = einheit?.titel_der_einheit || 'unbekanntes Thema';
  const themenfeld      = aufgabe?.titel || '';
  const aufgabenstellung = [aufgabe?.titel && `Titel: ${aufgabe.titel}`, aufgabe?.aufgabenstellung]
    .filter(Boolean).join('\n') || 'Keine Aufgabenstellung hinterlegt.';
  const erwartungshorizont = aufgabe?.erwartungshorizont?.trim()
    || aufgabe?.musterloesung?.trim()
    || 'Kein Erwartungshorizont hinterlegt.';

  // Lernziele: schülergerechte Formulierung bevorzugen
  const lernzieleTexte = [
    ...mappedLernziele.map(lz => lz.schueler_uebersetzung || lz.formulierung_fachsprache),
    ...mappedBasisLernziele.map(lz => lz.text),
  ].filter(Boolean);
  const lernziele = lernzieleTexte.length > 0
    ? lernzieleTexte.join(', ')
    : 'Keine spezifischen Lernziele hinterlegt.';

  // Basismodule: Namen aus mappedBasisLernziele ableiten (falls vorhanden)
  const basismodulNamen = mappedBasisLernziele
    .map(lz => lz.modul_name || lz.titel || lz.text)
    .filter(Boolean);
  const basismodule = basismodulNamen.length > 0
    ? basismodulNamen.join(', ')
    : 'Keine spezifischen Module hinterlegt.';

  const themenKontext = themenfeld
    ? `${thema} (${themenfeld})`
    : thema;

  return `Du bist ein motivierender, geduldiger und verständnisvoller Lerncoach für Schüler der ${jahrgangsstufe}. Jahrgangsstufe im Fach ${fach}. 

Dein Ziel ist es, die Antwort des Schülers auf eine bestimmte Aufgabe zu analysieren und ihm ein strukturiertes, lernförderliches Feedback zu geben. 

[KONTEXT DER AUFGABE]
Thema: ${themenKontext}
Aufgabenstellung: ${aufgabenstellung}
Erwartungshorizont (Korrekte Lösung): ${erwartungshorizont}
Geprüfte Lernziele: ${lernziele}
Verfügbare Basismodule zum Üben: ${basismodule}

[DEINE AUFGABE ALS TUTOR]
Analysiere die Eingabe des Schülers und vergleiche sie strikt mit dem 'Erwartungshorizont'. 
Bewerte, inwieweit die 'Geprüften Lernziele' erreicht wurden. 

WICHTIGE REGELN:
1. VERRATE NIEMALS DIE LÖSUNG! Gib stattdessen Denkanstöße (Scaffolding).
2. Schreibe in einer schülergerechten, ermutigenden Sprache (verwende "Du").
3. Verurteile den Schüler nicht für Fehler, sondern betrachte Fehler als Lernchance.

[STRUKTUR DEINER ANTWORT]
Gliedere deine Antwort ZWINGEND in die folgenden vier Abschnitte und verwende diese Überschriften:

🌟 Was dir schon ganz gut gelungen ist:
(Nenne hier konkret, welche Teile der Schülerantwort korrekt sind und mit dem Erwartungshorizont übereinstimmen. Lobe den Einsatz.)

📈 Wo du noch genauer hinschauen solltest:
(Weise auf kleine Flüchtigkeitsfehler, Ungenauigkeiten oder Teilschritte hin, die nicht ganz passen. Stelle gezielte Leitfragen, damit der Schüler selbst auf den Fehler kommt.)

🛑 Wo noch größere Lücken sind:
(Benenne klar, sachlich und freundlich, welche Lernziele oder Kernaspekte aus dem Erwartungshorizont komplett fehlen oder falsch verstanden wurden.)

🛠️ Dein nächster Schritt:
(Nenne dem Schüler konkret 1 bis maximal 2 "Verfügbare Basismodule" aus der oben genannten Liste, die er sich ansehen muss, um genau die Lücken aus dem vorherigen Schritt zu schließen. Erkläre in einem Satz, warum dieses Modul ihm jetzt hilft.)`;
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function AITutorPromptPanel({
  aufgabe,
  mappedLernziele = [],
  mappedBasisLernziele = [],
  einheit,
  kannBearbeiten = false,
}) {
  const queryClient = useQueryClient();
  const [promptText, setPromptText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  const hatErwartungshorizont = !!(aufgabe?.erwartungshorizont?.trim() || aufgabe?.musterloesung?.trim());

  // Beim ersten Öffnen: gespeicherten Prompt laden oder neu generieren
  useEffect(() => {
    if (!aufgabe) return;
    const generated = buildTutorPrompt({ aufgabe, einheit, mappedLernziele, mappedBasisLernziele });
    setPromptText(generated);
    setIsDirty(false);
  }, [aufgabe?.id]);

  // Auto-Save beim Verlassen
  const promptRef = useRef(promptText);
  const isDirtyRef = useRef(isDirty);
  useEffect(() => { promptRef.current = promptText; }, [promptText]);
  useEffect(() => { isDirtyRef.current = isDirty; }, [isDirty]);
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && aufgabe?.id) {
        base44.entities.AllgemeineAufgabe.update(aufgabe.id, { erwartungshorizont_ki_prompt: promptRef.current });
      }
    };
  }, [aufgabe?.id]);

  const saveMutation = useMutation({
    mutationFn: (text) => base44.entities.AllgemeineAufgabe.update(aufgabe.id, { erwartungshorizont_ki_prompt: text }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setIsDirty(false);
      toast.success('KI-Tutor Prompt gespeichert.');
    },
    onError: () => toast.error('Fehler beim Speichern.'),
  });

  const handleRegenerate = () => {
    const generated = buildTutorPrompt({ aufgabe, einheit, mappedLernziele, mappedBasisLernziele });
    setPromptText(generated);
    setIsDirty(true);
    toast.success('Prompt neu generiert.');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    toast.success('Prompt kopiert.');
    setTimeout(() => setCopied(false), 2000);
  };

  if (!aufgabe) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">

        {/* Warnung: kein Erwartungshorizont */}
         {!hatErwartungshorizont && (
           <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
             <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
             <span>
               <strong>Hinweis:</strong> Es wurde noch kein Erwartungshorizont hinterlegt. Füllen Sie dazu bitte den Tab „Erwartungshorizont" aus. Ohne diese Referenz kann der KI-Tutor dem Schüler kein präzises, zielgerichtetes Feedback geben.
             </span>
           </div>
         )}

        {/* Aktionsleiste */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold flex-1">KI-Tutor System-Prompt</h3>
          {kannBearbeiten && (
            <Button size="sm" variant="outline" onClick={handleRegenerate} className="gap-2">
              <RefreshCw className="w-3.5 h-3.5" /> Neu generieren
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Kopiert' : 'Kopieren'}
          </Button>
          {kannBearbeiten && isDirty && (
            <Button size="sm" onClick={() => saveMutation.mutate(promptText)} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Speichern
            </Button>
          )}
        </div>

        {/* Editierbare Textarea */}
        <textarea
          value={promptText}
          onChange={e => { if (kannBearbeiten) { setPromptText(e.target.value); setIsDirty(true); } }}
          disabled={!kannBearbeiten}
          className="w-full px-4 py-3 text-sm border border-border rounded-lg resize-none bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono leading-relaxed disabled:bg-muted/20 disabled:text-muted-foreground"
          style={{ minHeight: '480px' }}
          placeholder="Kein Prompt generiert…"
        />

        <p className="text-xs text-muted-foreground">
          Dieser Prompt steuert den KI-Tutor bei der Interaktion mit dem Schüler. Manuelle Anpassungen (z. B. Fachsprache-Anforderungen) sind jederzeit möglich.
        </p>
      </div>
    </div>
  );
}