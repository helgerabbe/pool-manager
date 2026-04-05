import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle2, AlertTriangle, RefreshCw, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Dynamischer Tutor-Prompt-Generator ───────────────────────────────────────
function buildTutorPrompt({ aufgabe, einheit, mappedLernziele = [], mappedBasisLernziele = [] }) {
  const parts = [];

  // Rolle
  const roleParts = ['Du bist ein unterstützender KI-Tutor für Schüler'];
  if (einheit?.jahrgangsstufe) roleParts.push(`der ${einheit.jahrgangsstufe}. Jahrgangsstufe`);
  if (einheit?.fach) roleParts.push(`im Fach ${einheit.fach}`);
  parts.push(roleParts.join(' ') + '.');

  // Kontext
  if (einheit?.titel_der_einheit) {
    parts.push(`Das aktuelle Thema ist '${einheit.titel_der_einheit}'.`);
  }

  // Aufgabe
  const aufgabentext = [aufgabe.titel && `Titel: ${aufgabe.titel}`, aufgabe.aufgabenstellung]
    .filter(Boolean).join('\n');
  if (aufgabentext) {
    parts.push(`Der Schüler bearbeitet folgende Aufgabe:\n${aufgabentext}`);
  }

  // Formale Kriterien
  const form = aufgabe.ergebnis_form;
  const format = aufgabe.ergebnis_dateiformat;
  const formOffen = !form || form.toLowerCase().includes('offen');
  const formatOffen = !format || format.toLowerCase().includes('offen') || format.toLowerCase().includes('beliebig');
  if (!formOffen || !formatOffen) {
    const teile = [];
    if (!formOffen) teile.push(`Form '${form}'`);
    if (!formatOffen) teile.push(`Dateiformat '${format}'`);
    parts.push(`Die finale Abgabe wird in der ${teile.join(' als ')} erwartet.`);
  }

  // Kompetenzen
  const alleKompetenzen = [
    ...mappedLernziele.map(lz => lz.schueler_uebersetzung || lz.formulierung_fachsprache).filter(Boolean),
    ...mappedBasisLernziele.map(lz => lz.text).filter(Boolean),
  ];
  if (alleKompetenzen.length > 0) {
    const liste = alleKompetenzen.map((k, i) => `${i + 1}. ${k}`).join('\n');
    parts.push(`Der Schüler soll dabei folgende Kompetenzen nachweisen:\n${liste}`);
  }

  // Erwartungshorizont
  const musterloesung = aufgabe.musterloesung?.trim();
  if (musterloesung) {
    parts.push(`Deine Bewertung und dein Feedback müssen sich strikt an folgendem Erwartungshorizont orientieren:\n--- ERWARTUNGSHORIZONT START ---\n${musterloesung}\n--- ERWARTUNGSHORIZONT ENDE ---`);
  }

  // Didaktische Direktive
  parts.push(
    'Bewerte die Eingaben des Schülers anhand dieses Erwartungshorizonts. Gib keine fertigen Lösungen vor, sondern nutze formatives Feedback, Hinweise und sokratische Fragen, um dem Schüler zu helfen, den Erwartungshorizont selbstständig zu erreichen.'
  );

  return parts.join('\n\n');
}

// ── Haupt-Komponente ──────────────────────────────────────────────────────────
export default function AITutorPromptPanel({
  aufgabe,
  mappedLernziele = [],
  mappedBasisLernziele = [],
  einheit,
}) {
  const queryClient = useQueryClient();
  const [promptText, setPromptText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [copied, setCopied] = useState(false);

  const hatErwartungshorizont = !!aufgabe?.musterloesung?.trim();

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
              <strong>Hinweis:</strong> Es wurde noch kein Erwartungshorizont (Tab 3) hinterlegt. Ohne diese Referenz kann der KI-Tutor dem Schüler kein präzises und auf die Musterlösung abgestimmtes Feedback geben.
            </span>
          </div>
        )}

        {/* Aktionsleiste */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold flex-1">KI-Tutor System-Prompt</h3>
          <Button size="sm" variant="outline" onClick={handleRegenerate} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Neu generieren
          </Button>
          <Button size="sm" variant="outline" onClick={handleCopy} className="gap-2">
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Kopiert' : 'Kopieren'}
          </Button>
          {isDirty && (
            <Button size="sm" onClick={() => saveMutation.mutate(promptText)} disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Speichern
            </Button>
          )}
        </div>

        {/* Editierbare Textarea */}
        <textarea
          value={promptText}
          onChange={e => { setPromptText(e.target.value); setIsDirty(true); }}
          className="w-full px-4 py-3 text-sm border border-border rounded-lg resize-none bg-background focus:outline-none focus:ring-1 focus:ring-ring font-mono leading-relaxed"
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