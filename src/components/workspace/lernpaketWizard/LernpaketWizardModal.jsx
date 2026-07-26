/**
 * components/workspace/lernpaketWizard/LernpaketWizardModal.jsx
 *
 * Lernpaket-Wizard (Tab 3, Konzept v0.4 §4.1 – §4.7).
 *
 * Ablauf:
 *   1. Briefing-Sandbox (Lehrkraft beschreibt Vorhaben in Klartext).
 *   2. Klick auf "Vorschlag generieren" → `generateLernpaketAktivitaeten`.
 *   3. Vorschau (`WizardProposalPreview`) — Items entfernbar, Phase-
 *      Korrekturen transparent.
 *   4. "Übernehmen" → ggf. `WizardConflictDialog`, dann
 *      `applyLernpaketWizardProposal`.
 *
 * Voraussetzung: Aufrufer hat bereits einen aktiven Lernpaket-Lock
 * (sichergestellt durch den Trigger-Button in `LernpaketPanel`).
 */
import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2, Wand2, Package, Target } from 'lucide-react';
import WizardProposalPreview from './WizardProposalPreview';
import WizardBestandsAnalyse from './WizardBestandsAnalyse';
import WizardGlossarSidebar from './WizardGlossarSidebar';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

const MAX_BRIEFING_LENGTH = 5000;

export default function LernpaketWizardModal({
  open,
  onClose,
  paket,
}) {
  const queryClient = useQueryClient();

  const [briefing, setBriefing] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [korrekturen, setKorrekturen] = useState([]);

  // Super-Wizard Etappe 1: Wie soll die KI mit dem Bestand umgehen?
  // 'ergaenzen' = vorhandene Aktivitäten berücksichtigen, nur Lücken füllen.
  // 'neu' = Struktur unabhängig neu denken (Bestand bleibt trotzdem erhalten).
  const [strukturModus, setStrukturModus] = useState('ergaenzen');
  const [isApplying, setIsApplying] = useState(false);
  const textareaRef = useRef(null);

  // Bestandsanalyse: vorhandene (nicht-gelöschte) Aktivitäten dieses Pakets.
  const { data: bestandAktivitaeten = [] } = useQuery({
    queryKey: ['wizard-bestand', paket?.id],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.filter({
      lernpaket_id: paket.id,
      sync_status: { $ne: 'to_delete' },
    }),
    enabled: open && !!paket?.id,
  });

  // Aktivitäten-Katalog für die Glossar-Sidebar (gefiltert auf is_active).
  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
    enabled: open,
  });

  // Lernziele zu diesem Paket — Anzeige oben im Dialog als Kontext-Anker,
  // damit der Anwender sicher weiß, in welchem Paket er gerade arbeitet.
  const { data: paketLernziele = [] } = useQuery({
    queryKey: ['lernziele', 'paket', paket?.id],
    queryFn: () => base44.entities.Lernziele.filter({ lernpaket_id: paket.id }),
    enabled: open && !!paket?.id,
  });

  // Klick auf einen Glossar-Eintrag fügt den Typ-Namen am Cursor ein.
  const handleInsertFromGlossar = (typName) => {
    const ta = textareaRef.current;
    if (!ta) {
      setBriefing((prev) => (prev ? `${prev} ${typName}` : typName));
      return;
    }
    const start = ta.selectionStart ?? briefing.length;
    const end = ta.selectionEnd ?? briefing.length;
    const before = briefing.slice(0, start);
    const after = briefing.slice(end);
    const needsLeadingSpace = before && !/\s$/.test(before);
    const insert = `${needsLeadingSpace ? ' ' : ''}${typName}`;
    const next = `${before}${insert}${after}`;
    if (next.length > MAX_BRIEFING_LENGTH) return;
    setBriefing(next);
    requestAnimationFrame(() => {
      const pos = before.length + insert.length;
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  };

  // Beim Öffnen das gespeicherte Briefing seedet, beim Schließen reset.
  useEffect(() => {
    if (open) {
      setBriefing(paket?.kreativ_briefing || '');
      setProposal(null);
      setKorrekturen([]);
      setStrukturModus('ergaenzen');
    }
  }, [open, paket?.id, paket?.kreativ_briefing]);

  const totalProposalItems = proposal
    ? Object.values(proposal.phasen || {}).reduce((s, arr) => s + (arr?.length || 0), 0)
    : 0;

  // ── Schritt 2: Vorschlag generieren ──────────────────────────────
  const handleGenerate = async () => {
    const trimmed = briefing.trim();
    if (!trimmed) {
      toast.error('Bitte beschreibe zuerst dein Vorhaben.');
      return;
    }
    if (trimmed.length > MAX_BRIEFING_LENGTH) {
      toast.error(`Briefing zu lang (max. ${MAX_BRIEFING_LENGTH} Zeichen).`);
      return;
    }
    setIsGenerating(true);
    setProposal(null);
    setKorrekturen([]);
    try {
      const res = await base44.functions.invoke('generateLernpaketAktivitaeten', {
        lernpaketId: paket.id,
        briefing: trimmed,
        strukturModus: bestandAktivitaeten.length > 0 ? strukturModus : 'neu',
      });
      const data = res?.data || res;
      if (!data?.success) {
        toast.error(data?.message || 'Generierung fehlgeschlagen. Bitte Briefing präzisieren.');
        return;
      }
      setProposal(data.proposal);
      setKorrekturen(data.korrekturen || []);
      if ((data.korrekturen || []).length > 0) {
        toast.info(`${data.korrekturen.length} Phase${data.korrekturen.length !== 1 ? 'n' : ''} automatisch korrigiert.`);
      } else {
        toast.success('Vorschlag erstellt.');
      }
    } catch (err) {
      console.error('[LernpaketWizardModal] generate failed', err);
      toast.error(err?.response?.data?.error || 'Fehler beim Generieren.');
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Vorschau-Editing: einzelnes Item entfernen ───────────────────
  const handleRemoveItem = (phase, itemId) => {
    setProposal((prev) => {
      if (!prev) return prev;
      const next = { ...prev, phasen: { ...prev.phasen } };
      next.phasen[phase] = (next.phasen[phase] || []).filter((it) => it.id !== itemId);
      return next;
    });
  };

  // ── Schritt 4: Übernehmen — immer additiv (nicht-destruktiv) ─────
  const handleApplyClick = () => {
    if (totalProposalItems === 0) {
      toast.error('Vorschlag ist leer.');
      return;
    }
    doApply();
  };

  const doApply = async () => {
    setIsApplying(true);
    try {
      // proposal.phasen → flache items-Liste in der Reihenfolge
      // Input → Übung → Abschluss (entspricht der Pool-Manager-Logik).
      const items = [];
      ['Input', 'Übung', 'Abschluss'].forEach((phase) => {
        (proposal.phasen[phase] || []).forEach((it) => {
          items.push({ aktivitaetstyp: it.aktivitaetstyp, phase: it.phase });
        });
      });

      const res = await base44.functions.invoke('applyLernpaketWizardProposal', {
        lernpaketId: paket.id,
        items,
        mode: 'additive',
        briefing: briefing.trim(),
      });
      const data = res?.data || res;
      if (!data?.success) {
        toast.error(data?.error || 'Übernahme fehlgeschlagen.');
        return;
      }
      toast.success(
        bestandAktivitaeten.length > 0
          ? `${data.stats.items_created} Aktivitäten ergänzt — Bestehendes blieb unverändert.`
          : `${data.stats.items_created} Aktivitäten angelegt.`
      );
      // Caches invalidieren, die Aktivitäten/Lernpaket-Daten zeigen.
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-data'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['wizard-bestand', paket.id] });
      onClose();
    } catch (err) {
      console.error('[LernpaketWizardModal] apply failed', err);
      const msg = err?.response?.data?.error || 'Fehler beim Übernehmen.';
      toast.error(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    if (isGenerating || isApplying) return;
    onClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-5 gap-3">
          {/* Kompakter Header: Titel + einzeilige Beschreibung. */}
          <DialogHeader className="space-y-1">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Wand2 className="w-4 h-4 text-primary" />
              Lernpaket mit KI-Assistent füllen
            </DialogTitle>
            <DialogDescription className="text-xs leading-snug">
              Beschreibe in eigenen Worten, was die Schüler:innen lernen sollen — die KI schlägt passende Aktivitäts-Hüllen vor.
            </DialogDescription>
          </DialogHeader>

          {/* Bestandsanalyse + Struktur-Modus-Wahl (Super-Wizard Etappe 1):
              Zeigt, was schon im Paket liegt, und lässt wählen, ob die KI
              den Bestand berücksichtigt oder die Struktur neu denkt. */}
          <WizardBestandsAnalyse
            aktivitaeten={bestandAktivitaeten}
            katalog={aktivitaetenKatalog}
            strukturModus={strukturModus}
            onModusChange={(m) => { setStrukturModus(m); setProposal(null); setKorrekturen([]); }}
            disabled={isGenerating || isApplying}
          />

          {/* Kompakter Kontext-Anker: Paket + Lernziele kombiniert in einer
              zwei­spaltigen, dichten Anordnung — spart ~50% vertikalen Platz. */}
          <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs space-y-1">
            <div className="flex items-center gap-2 min-w-0">
              <Package className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="uppercase tracking-wide font-medium text-primary/70 text-[10px]">Lernpaket:</span>
              <span className="font-semibold text-foreground truncate">{paket?.titel_des_pakets || '—'}</span>
            </div>
            <div className="flex items-start gap-2 min-w-0">
              <Target className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
              <span className="uppercase tracking-wide font-medium text-primary/70 text-[10px] mt-0.5 shrink-0">
                Lernziel{paketLernziele.length !== 1 ? 'e' : ''} ({paketLernziele.length}):
              </span>
              <div className="min-w-0 flex-1">
                {paketLernziele.length === 0 ? (
                  <span className="text-muted-foreground italic">Noch keine Lernziele zugeordnet.</span>
                ) : (
                  <ul className="space-y-0 list-disc list-inside marker:text-green-600 text-foreground">
                    {paketLernziele.map((lz) => (
                      <li key={lz.id} className="leading-snug">
                        {lz.formulierung_fachsprache}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5 py-1">
            {/* Hauptspalte: Briefing + Vorschau */}
            <div className="space-y-5 min-w-0">
              {/* Schritt 1: Briefing-Sandbox */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="wizard-briefing" className="text-sm font-semibold">
                    Dein Vorhaben
                  </Label>
                  <div className="flex items-center gap-3">
                    <SpeechInputButton
                      value={briefing}
                      onResult={(text) => setBriefing(text.slice(0, MAX_BRIEFING_LENGTH))}
                      disabled={isGenerating || isApplying}
                      maxSeconds={30}
                    />
                    <span className="text-xs text-muted-foreground">
                      {briefing.length} / {MAX_BRIEFING_LENGTH}
                    </span>
                  </div>
                </div>
                <Textarea
                  ref={textareaRef}
                  id="wizard-briefing"
                  value={briefing}
                  onChange={(e) => setBriefing(e.target.value)}
                  placeholder="Beispiel: In diesem Lernpaket lernen die Schüler:innen, was Steigung und Y-Achsenabschnitt in einer linearen Funktion bedeuten. Einstieg über ein Video, dann mehrere Übungen, am Ende ein kombinierter Test."
                  rows={6}
                  maxLength={MAX_BRIEFING_LENGTH}
                  disabled={isGenerating || isApplying}
                  className="resize-none"
                />
                {paket?.kreativ_briefing_updated_at && (
                  <p className="text-xs text-muted-foreground">
                    Zuletzt mit KI gefüllt: {new Date(paket.kreativ_briefing_updated_at).toLocaleString('de-DE')}
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleGenerate}
                  disabled={isGenerating || isApplying || !briefing.trim()}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generiere…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> Vorschlag generieren</>
                  )}
                </Button>
              </div>

              {/* Schritt 3: Vorschau */}
              {proposal && (
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Vorschlag der KI ({totalProposalItems} Aktivität{totalProposalItems !== 1 ? 'en' : ''})
                    </h3>
                    {korrekturen.length > 0 && (
                      <span className="text-xs text-amber-700">
                        {korrekturen.length} Phase-Korrektur{korrekturen.length !== 1 ? 'en' : ''}
                      </span>
                    )}
                  </div>
                  <WizardProposalPreview
                    proposal={proposal}
                    onRemoveItem={handleRemoveItem}
                  />
                </div>
              )}
            </div>

            {/* Glossar-Sidebar (Konzept §6) */}
            <aside className="md:border-l md:pl-5">
              <WizardGlossarSidebar
                katalog={aktivitaetenKatalog}
                onInsert={handleInsertFromGlossar}
              />
            </aside>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isGenerating || isApplying}>
              Abbrechen
            </Button>
            <Button
              onClick={handleApplyClick}
              disabled={!proposal || totalProposalItems === 0 || isGenerating || isApplying}
              className="gap-2"
            >
              {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Übernehmen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}