/**
 * AiTaskWizardModal.jsx
 *
 * Zweistufiger KI-Assistent:
 * Schritt 1 – Idee eingeben → KI generiert Vorschlag
 * Schritt 2 – Vorschlag prüfen/bearbeiten → Als Aufgabe übernehmen
 */

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, Sparkles, Info } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

async function generateTaskIdea(idee, task_type) {
  const response = await base44.functions.invoke('generateTaskProposal', { idee, task_type });
  return response.data;
}

export default function AiTaskWizardModal({
  open,
  onOpenChange,
  taskType = 'Allgemeine Aufgabe',
  onSave,          // async fn({ titel, aufgabenstellung, ki_kompetenz_tags })
}) {
  const [step, setStep] = useState(1);
  const [idee, setIdee] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Bearbeitbare Felder nach KI-Antwort
  const [titel, setTitel] = useState('');
  const [aufgabenstellung, setAufgabenstellung] = useState('');
  const [kompetenzen, setKompetenzen] = useState([]);

  const handleClose = () => {
    onOpenChange(false);
    // Reset nach Animation
    setTimeout(() => {
      setStep(1);
      setIdee('');
      setTitel('');
      setAufgabenstellung('');
      setKompetenzen([]);
      setErrorMsg('');
    }, 300);
  };

  const handleGenerate = async () => {
    if (!idee.trim()) {
      toast.error('Bitte gib zuerst eine Idee ein.');
      return;
    }
    setIsGenerating(true);
    setErrorMsg('');
    try {
      const result = await generateTaskIdea(idee.trim(), taskType);
      setTitel(result.titel || '');
      setAufgabenstellung(result.aufgabenstellung || '');
      setKompetenzen(result.kompetenzen || []);
      setStep(2);
    } catch (err) {
      const msg = err.message?.includes('429') || err.message?.includes('Rate limit')
        ? 'Zu viele Anfragen gerade – bitte kurz warten und erneut versuchen.'
        : 'KI-Generierung fehlgeschlagen: ' + err.message;
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!titel.trim() || !aufgabenstellung.trim()) {
      toast.error('Titel und Aufgabenstellung sind erforderlich.');
      return;
    }
    setIsSaving(true);
    try {
      await onSave({
        titel: titel.trim(),
        aufgabenstellung: aufgabenstellung.trim(),
        ki_kompetenz_tags: kompetenzen,
      });
      toast.success('Aufgabe wurde übernommen.');
      handleClose();
    } catch (err) {
      toast.error('Fehler beim Speichern: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            KI-Aufgaben-Assistent
            <Badge variant="secondary" className="text-[10px] ml-1">{taskType}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* ── Schritt 1: Idee eingeben ── */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            {errorMsg && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Beschreibe kurz deine Idee für eine Aufgabe. Die KI erstellt daraus einen vollständigen Entwurf.
            </p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Deine grobe Idee
                </label>
                <SpeechInputButton value={idee} onResult={setIdee} />
              </div>
              <textarea
                value={idee}
                onChange={e => setIdee(e.target.value)}
                placeholder="z.B. Die Schüler sollen die Ursachen des Ersten Weltkriegs analysieren und in einem Schaubild darstellen…"
                className="w-full h-32 p-3 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* ── Schritt 2: Ergebnis bearbeiten ── */}
        {step === 2 && (
          <div className="space-y-4 py-2 overflow-y-auto max-h-[60vh]">
            <p className="text-sm text-muted-foreground">
              Überprüfe und bearbeite den KI-Vorschlag. Du kannst alle Felder anpassen.
            </p>

            {/* Titel */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Titel
              </label>
              <input
                value={titel}
                onChange={e => setTitel(e.target.value)}
                className="w-full h-9 px-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Aufgabenstellung */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Aufgabenstellung
              </label>
              <textarea
                value={aufgabenstellung}
                onChange={e => setAufgabenstellung(e.target.value)}
                className="w-full h-32 p-3 border border-border rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {/* Kompetenz-Chips */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Benötigte Kompetenzen (KI-Vorschlag)
              </label>
              <div className="flex flex-wrap gap-2">
                {kompetenzen.map((k, i) => (
                  <Badge key={i} className="bg-primary/10 text-primary border border-primary/20 text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {k}
                  </Badge>
                ))}
              </div>
              {/* Hinweis-Banner */}
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>
                  <strong>Hinweis:</strong> Dies sind KI-Vorschläge. Bitte verknüpfe später die entsprechenden Lernpakete (Ebene&nbsp;1) manuell im Tab „Kompetenzzuordnung".
                </span>
              </div>
            </div>

            {/* Zurück-Link */}
            <button
              onClick={() => setStep(1)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              ← Idee erneut eingeben
            </button>
          </div>
        )}

        <DialogFooter className="gap-2 mt-2">
          <Button variant="outline" onClick={handleClose} disabled={isGenerating || isSaving}>
            Abbrechen
          </Button>

          {step === 1 ? (
            <Button onClick={handleGenerate} disabled={isGenerating || !idee.trim()} className="gap-2">
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Wird entworfen…</>
              ) : (
                <><Wand2 className="w-4 h-4" /> Aufgabe entwerfen</>
              )}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Als neue Aufgabe übernehmen</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}