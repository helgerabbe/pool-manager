/**
 * OffeneAufgabeEditor.jsx
 *
 * Editor für die Aktivität "Offene Aufgabe".
 * Datenmodell: { description: String }
 * Nutzt State-Lifting via onChange für parent-Synchronisation.
 * Integriert Web Speech API für iterativen KI-Assistenten mit Spracheingabe.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Mic, MicOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

export default function OffeneAufgabeEditor({ initialData = {}, onChange, readOnly = false }) {
  const [description, setDescription] = useState(initialData.description || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef(null);

  // DATENBRÜCKE ZUM MODAL
  useEffect(() => {
    if (onChange) {
      onChange({ description });
    }
  }, [description]);

  // Initialisierung der Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'de-DE';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
        if (event.error !== 'aborted') {
          toast.error('Fehler bei der Spracherkennung. Bitte Mikrofon-Berechtigungen prüfen.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Mikrofon-Toggle
  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        toast.error('Spracherkennung konnte nicht gestartet werden.');
      }
    }
  };

  // KI-Generierung aus Sprachinput
  const handleGenerateFromVoice = async () => {
    if (!transcript.trim()) return;
    
    setIsGenerating(true);
    try {
      const basePrompt = description
        ? `Aktueller Aufgabenentwurf:\n"${description}"\n\nBitte überarbeite ihn basierend auf diesem Feedback und mache ihn präziser und pädagogisch hilfreicher:\n"${transcript}"`
        : `Erstelle eine professionelle, detaillierte Aufgabenbeschreibung für Schüler:innen basierend auf dieser Idee:\n"${transcript}"`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: basePrompt,
      });

      if (result) {
        setDescription(result);
        setTranscript('');
        toast.success('Aufgabenbeschreibung erfolgreich generiert.');
      }
    } catch (error) {
      toast.error('Fehler bei der KI-Generierung: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefinement = async (action) => {
    if (!description.trim()) {
      toast.error('Bitte geben Sie zunächst eine Aufgabenbeschreibung ein.');
      return;
    }

    setIsGenerating(true);
    try {
      const prompts = {
        refine: `Verfeinere diese Aufgabenbeschreibung. Mache sie präziser, strukturierter und pädagogisch hilfreicher für Schüler:innen.\n\nAktueller Text:\n${description}`,
        structure: `Strukturiere diese Aufgabenbeschreibung mit folgenden Abschnitten:\n1. Aufgabenstellung (was sollen die Schüler tun?)\n2. Materialien/Ressourcen\n3. Erwartete Ergebnisse\n4. Bewertungskriterien\n\nAktueller Text:\n${description}`,
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompts[action] || prompts.refine,
      });

      if (result) {
        setDescription(result);
        toast.success(`Aufgabenbeschreibung wurde ${action === 'refine' ? 'verfeinert' : 'strukturiert'}.`);
      }
    } catch (err) {
      toast.error('Fehler bei der KI-Verarbeitung: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (readOnly) {
    return (
      <div className="space-y-3">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Aufgabenbeschreibung</Label>
        <div className="bg-muted/30 rounded-lg p-4 text-sm whitespace-pre-wrap leading-relaxed border border-border">
          {description || <span className="text-muted-foreground italic">Keine Beschreibung vorhanden.</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KI-Assistent Bereich mit Spracherkennung */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="bg-indigo-100 p-2 rounded-lg shrink-0">
            <Sparkles className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-indigo-900">KI-Assistent für Aufgabenbeschreibungen</h3>
            <p className="text-xs text-indigo-700 mt-1">
              Sprich deine Idee ein oder nenne Änderungswünsche zum bestehenden Text. Die KI formuliert daraus eine professionelle Beschreibung für den Moodle-Export.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {/* Sprachsteuerung */}
          {recognitionRef.current ? (
            <div className="flex items-center gap-3">
              <Button 
                onClick={toggleListening} 
                variant={isListening ? "destructive" : "secondary"}
                className={`gap-2 ${isListening ? 'animate-pulse' : ''}`}
                disabled={isGenerating}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? "Aufnahme stoppen" : "Idee einsprechen"}
              </Button>
              
              {isListening && <span className="text-xs text-red-600 font-medium">Hört zu...</span>}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
              <AlertCircle className="w-4 h-4" />
              Dein Browser unterstützt die Web Speech API leider nicht.
            </div>
          )}

          {/* Transkript & Generieren-Button */}
          {(transcript || isGenerating) && (
            <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm space-y-3">
              <div className="text-sm text-indigo-900 italic bg-indigo-50/50 p-2 rounded">
                "{transcript || 'Verarbeite Audio...'}"
              </div>
              <Button 
                onClick={handleGenerateFromVoice} 
                disabled={isGenerating || !transcript}
                className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'KI generiert...' : (description ? 'Text anpassen' : 'Entwurf generieren')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Haupttextfeld */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Aufgabenbeschreibung (Finaler Text)</Label>
          <span className="text-xs text-muted-foreground">{description.length} Zeichen</span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Hier erscheint die KI-generierte Aufgabe, oder schreibe sie manuell..."
          className="min-h-[240px] resize-vertical"
        />
      </div>

      {/* Manuelle KI-Assistent Buttons */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Weitere KI-Optionen</Label>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefinement('refine')}
            disabled={isGenerating || !description.trim()}
            className="gap-1.5 text-xs"
          >
            {isGenerating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird verfeinert...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Beschreibung verfeinern</>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRefinement('structure')}
            disabled={isGenerating || !description.trim()}
            className="gap-1.5 text-xs"
          >
            {isGenerating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Wird strukturiert...</>
            ) : (
              <><Sparkles className="w-3.5 h-3.5" /> Strukturieren</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}