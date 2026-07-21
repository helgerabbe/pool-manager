/**
 * InspirationModal — Phase 2 / PR5.
 *
 * Das Tutor-Modus-Interface. Ein iterativer Loop:
 *   1. Briefing setzen (Mission, Material-Level, Fokus)
 *   2. "Vorschlag generieren" → Backend (`generateInspirationProposal`)
 *   3. Karte sehen, Briefing direkt anpassen, "🔄 Neu würfeln"
 *   4. "Übernehmen" → schreibt in Editor-Form (über Callback)
 *
 * Stateless gegenüber DB: Schreibt nichts, persistiert nichts. Der Editor
 * (`AufgabeCreateView`) entscheidet via Schutz-Logik, ob Felder
 * überschrieben werden.
 *
 * Props:
 *   - open / onOpenChange : Dialog-Steuerung
 *   - aufgabenTyp         : 'inhalt' | 'handlung' (vom Editor durchgereicht)
 *   - einheitId           : optional, für Kontext im Backend-Prompt
 *   - initialMission      : optional, vorbelegte Mission aus dem Editor
 *   - onAccept(proposal)  : Übernahme-Callback. Bekommt den vollständigen
 *                           Proposal + materialLevel, der Editor mappt.
 */
import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, Check, Loader2, X, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getMission } from '@/lib/missionen';
import { speichereIdeeInKiste, baueIdeenBeschreibung } from '@/lib/ideenkisteUebernahme';
import InspirationBriefingForm from '@/components/missionen/InspirationBriefingForm';
import InspirationProposalCard from '@/components/missionen/InspirationProposalCard';
import { DEFAULT_MATERIAL_LEVEL } from '@/lib/inspirationConstants';

export default function InspirationModal({
  open,
  onOpenChange,
  aufgabenTyp = 'inhalt',
  einheitId = null,
  initialMission = null,
  onAccept,
}) {
  // Briefing-State
  const [mission, setMission] = useState(initialMission || null);
  const [materialLevel, setMaterialLevel] = useState(DEFAULT_MATERIAL_LEVEL);
  const [fokus, setFokus] = useState('');

  // Ergebnis-State
  const [proposal, setProposal] = useState(null);
  const [proposalMaterialLevel, setProposalMaterialLevel] = useState(DEFAULT_MATERIAL_LEVEL);
  const [loading, setLoading] = useState(false);
  const [kisteSaving, setKisteSaving] = useState(false);
  const [kisteSaved, setKisteSaved] = useState(false);
  const queryClient = useQueryClient();

  // Beim Öffnen: Briefing aus initialMission vorbelegen, alten Vorschlag verwerfen.
  useEffect(() => {
    if (!open) return;
    setMission(initialMission || null);
    setMaterialLevel(DEFAULT_MATERIAL_LEVEL);
    setFokus('');
    setProposal(null);
    setLoading(false);
  }, [open, initialMission]);

  const isValidBriefing = !!mission;
  const hasProposal = !!proposal;

  const generate = async () => {
    if (!isValidBriefing) {
      toast.error('Bitte zuerst eine Mission auswählen.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await base44.functions.invoke('generateInspirationProposal', {
        mission_type: mission,
        material_level: materialLevel,
        fokus,
        aufgaben_typ: aufgabenTyp,
        einheit_id: einheitId,
      });
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      // Snapshotten, mit welchem Material-Level der Vorschlag erzeugt
      // wurde — damit die Material-Checkliste auch nach Slider-Änderung
      // korrekt bleibt, bis das nächste "Neu würfeln" stattfindet.
      setProposal(data);
      setProposalMaterialLevel(materialLevel);
      setKisteSaved(false);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Fehler beim Generieren des Vorschlags.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToKiste = async () => {
    if (!proposal || !einheitId) return;
    setKisteSaving(true);
    try {
      const missionDef = getMission(mission);
      await speichereIdeeInKiste({
        einheitId,
        titel: proposal.titel,
        beschreibung: baueIdeenBeschreibung(proposal, {
          missionLabel: missionDef ? `${missionDef.emoji} ${missionDef.label}` : mission,
        }),
        aufgabentypVorschlag: aufgabenTyp === 'handlung' ? 'Handlungsaufgabe' : 'Allgemeine Aufgabe (Ebene 2)',
      });
      queryClient.invalidateQueries({ queryKey: ['aufgaben-ideen', einheitId] });
      setKisteSaved(true);
      toast.success('Vorschlag liegt jetzt in der Ideenkiste.');
    } catch (err) {
      toast.error(err?.message || 'Vorschlag konnte nicht in die Ideenkiste gelegt werden.');
    } finally {
      setKisteSaving(false);
    }
  };

  const handleAccept = () => {
    if (!proposal) return;
    onAccept?.({
      proposal,
      materialLevel: proposalMaterialLevel,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Inspiration holen
          </DialogTitle>
          <DialogDescription>
            Setze die didaktischen Leitplanken — die KI baut dir genau dazu eine Aufgabe.
            Du kannst beliebig oft neu würfeln, bis es passt.
          </DialogDescription>
        </DialogHeader>

        {/* Briefing */}
        <div className="border-b pb-5">
          <InspirationBriefingForm
            mission={mission}
            onMissionChange={setMission}
            materialLevel={materialLevel}
            onMaterialLevelChange={setMaterialLevel}
            fokus={fokus}
            onFokusChange={setFokus}
            disabled={loading}
          />
        </div>

        {/* Aktion: erstmaliges Generieren ODER Neu würfeln */}
        <div className="flex flex-wrap items-center gap-2">
          {!hasProposal ? (
            <Button
              onClick={generate}
              disabled={!isValidBriefing || loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              Vorschlag generieren
            </Button>
          ) : (
            <Button
              onClick={generate}
              disabled={!isValidBriefing || loading}
              variant="outline"
              className="gap-2"
            >
              <RefreshCw className={loading ? 'w-4 h-4 animate-spin' : 'w-4 h-4'} />
              🔄 Neu würfeln
            </Button>
          )}
          {!isValidBriefing && (
            <span className="text-xs text-muted-foreground">
              Bitte zuerst eine Mission auswählen.
            </span>
          )}
        </div>

        {/* Ergebnis-Karte (mit Skeleton-Overlay beim Re-Generate) */}
        {hasProposal && (
          <InspirationProposalCard
            proposal={proposal}
            loading={loading}
            materialLevel={proposalMaterialLevel}
          />
        )}

        {/* Footer-Aktionen */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="gap-2">
            <X className="w-4 h-4" />
            Abbrechen
          </Button>
          {einheitId && (
            <Button
              variant="outline"
              onClick={handleSaveToKiste}
              disabled={!hasProposal || loading || kisteSaving || kisteSaved}
              className="gap-2"
            >
              {kisteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Inbox className="w-4 h-4" />}
              {kisteSaved ? 'In der Ideenkiste' : 'In die Ideenkiste'}
            </Button>
          )}
          <Button onClick={handleAccept} disabled={!hasProposal || loading} className="gap-2">
            <Check className="w-4 h-4" />
            Übernehmen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}