/**
 * AiTaskWizardModal.jsx
 *
 * Zweistufiger KI-Assistent:
 * Schritt 1 – Briefing eingeben (Idee + Mission + Material-Einsatz)
 *             → KI generiert Vorschlag.
 * Schritt 2 – Vorschlag prüfen/bearbeiten → Als Aufgabe übernehmen.
 *
 * Idee, Mission und Material-Einsatz werden zusammen als Briefing an
 * `generateTaskProposal` geschickt. Die im Briefing gewählte Mission
 * wird auch in den Save-Payload übernommen, damit die fertige Aufgabe
 * direkt korrekt klassifiziert ist.
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
import MissionPicker from '@/components/missionen/MissionPicker';
import { Slider } from '@/components/ui/slider';
import { MATERIAL_LEVELS, DEFAULT_MATERIAL_LEVEL, getMaterialLevel } from '@/lib/inspirationConstants';

async function generateTaskIdea({ idee, task_type, mission_type, material_level }) {
  const response = await base44.functions.invoke('generateTaskProposal', {
    idee,
    task_type,
    mission_type,
    material_level,
  });
  return response.data;
}

export default function AiTaskWizardModal({
  open,
  onOpenChange,
  taskType = 'Allgemeine Aufgabe',
  onSave,          // async fn({ titel, aufgabenstellung, ki_kompetenz_tags, mission_type })
}) {
  const [step, setStep] = useState(1);
  const [idee, setIdee] = useState('');
  const [missionType, setMissionType] = useState(null);
  const [materialLevel, setMaterialLevel] = useState(DEFAULT_MATERIAL_LEVEL);
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
      setMissionType(null);
      setMaterialLevel(DEFAULT_MATERIAL_LEVEL);
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
      const result = await generateTaskIdea({
        idee: idee.trim(),
        task_type: taskType,
        mission_type: missionType,
        material_level: materialLevel,
      });
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
        mission_type: missionType || null,
      });
      toast.success('Aufgabe wurde übernommen.');
      handleClose();
    } catch (err) {
      toast.error('Fehler beim Speichern: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const currentMaterial = getMaterialLevel(materialLevel);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95%] sm:max-w-xl flex flex-col p-0 max-h-[90dvh] overflow-hidden">
        {/* ── Fixierter Header ── */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-primary" />
            KI-Aufgaben-Assistent
            <Badge variant="secondary" className="text-[10px] ml-1">{taskType}</Badge>
          </DialogTitle>
        </DialogHeader>

        {/* ── Scrollbarer Body ── */}
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
          {/* ── Schritt 1: Briefing eingeben ── */}
          {step === 1 && (
            <div className="space-y-5">
              {errorMsg && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800">
                  <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                Beschreibe kurz deine Idee, wähle die Art der Aufgabe und den Material-Einsatz.
                Die KI baut daraus einen vollständigen Entwurf.
              </p>

              {/* Idee */}
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

              {/* Mission */}
              <div className="pt-2 border-t border-border">
                <MissionPicker
                  value={missionType}
                  onChange={setMissionType}
                  disabled={isGenerating}
                />
              </div>

              {/* Material-Einsatz */}
              <div className="pt-2 border-t border-border space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Material-Einsatz
                    <span className="text-xs font-normal text-muted-foreground ml-1.5">(optional)</span>
                  </label>
                  <span className="text-xs font-medium text-muted-foreground inline-flex items-center gap-1">
                    <span aria-hidden="true">{currentMaterial.emoji}</span>
                    {currentMaterial.label} · {currentMaterial.short}
                  </span>
                </div>
                <Slider
                  min={0}
                  max={3}
                  step={1}
                  value={[materialLevel]}
                  onValueChange={(v) => setMaterialLevel(v[0])}
                  disabled={isGenerating}
                />
                <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
                  {MATERIAL_LEVELS.map((m) => (
                    <span key={m.value}>{m.emoji}</span>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">{currentMaterial.hint}</p>
              </div>
            </div>
          )}

          {/* ── Schritt 2: Ergebnis bearbeiten ── */}
          {step === 2 && (
            <div className="space-y-4">
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
                ← Briefing erneut anpassen
              </button>
            </div>
          )}
        </div>

        {/* ── Fixierter Footer ── */}
        <DialogFooter className="gap-2 px-6 py-4 border-t border-border shrink-0">
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