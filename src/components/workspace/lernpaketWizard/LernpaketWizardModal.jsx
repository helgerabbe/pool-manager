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
import { Sparkles, Loader2, Wand2, Package, Target, Info } from 'lucide-react';
import WizardProposalPreview from './WizardProposalPreview';
import WizardConflictDialog from './WizardConflictDialog';
import WizardGlossarSidebar from './WizardGlossarSidebar';
import SpeechInputButton from '@/components/ui/SpeechInputButton';

const MAX_BRIEFING_LENGTH = 5000;

export default function LernpaketWizardModal({
  open,
  onClose,
  paket,
  existingActivityCount = 0,
}) {
  const queryClient = useQueryClient();

  const [briefing, setBriefing] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [korrekturen, setKorrekturen] = useState([]);

  const [conflictOpen, setConflictOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const textareaRef = useRef(null);

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
      setConflictOpen(false);
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

  // ── Schritt 4: Übernehmen ────────────────────────────────────────
  const handleApplyClick = () => {
    if (totalProposalItems === 0) {
      toast.error('Vorschlag ist leer.');
      return;
    }
    if (existingActivityCount > 0) {
      setConflictOpen(true);
    } else {
      doApply('additive');
    }
  };

  const doApply = async (mode) => {
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
        mode,
        briefing: briefing.trim(),
      });
      const data = res?.data || res;
      if (!data?.success) {
        toast.error(data?.error || 'Übernahme fehlgeschlagen.');
        return;
      }
      toast.success(
        mode === 'overwrite'
          ? `${data.stats.items_created} Aktivitäten ersetzt.`
          : `${data.stats.items_created} Aktivitäten ergänzt.`
      );
      // Caches invalidieren, die Aktivitäten/Lernpaket-Daten zeigen.
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-data'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      setConflictOpen(false);
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
        <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-primary" />
              Lernpaket mit KI-Assistent füllen
            </DialogTitle>
            <DialogDescription>
              Beschreibe in eigenen Worten, was die Schüler:innen in diesem Lernpaket lernen sollen.
              Die KI schlägt dir passende Aktivitäts-Hüllen vor — die Inhalte füllst du anschließend selbst.
            </DialogDescription>
          </DialogHeader>

          {/* Kontext-Anker: zeigt Paket-Titel und zugeordnete Lernziele, damit
              der Anwender sieht, in welchem Lernpaket der Wizard gerade läuft. */}
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <Package className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide font-medium text-primary/70">Lernpaket</p>
                <p className="text-sm font-semibold text-foreground truncate">{paket?.titel_des_pakets || '—'}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Target className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wide font-medium text-primary/70">
                  Lernziel{paketLernziele.length !== 1 ? 'e' : ''} ({paketLernziele.length})
                </p>
                {paketLernziele.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic">Noch keine Lernziele zugeordnet.</p>
                ) : (
                  <ul className="text-sm text-foreground space-y-0.5 list-disc list-inside marker:text-green-600">
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

          {/* Beruhigender Hinweis, wenn das Paket bereits Aktivitäten enthält.
              Macht transparent, dass hier nichts versehentlich überschrieben
              wird — die eigentliche Entscheidung (additiv vs. ersetzen) fällt
              erst am Ende im WizardConflictDialog. */}
          {existingActivityCount > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2 text-sm text-blue-900">
              <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-600" />
              <div className="space-y-1">
                <p className="font-medium">
                  Dieses Lernpaket ist bereits mit {existingActivityCount} Aktivität{existingActivityCount !== 1 ? 'en' : ''} befüllt.
                </p>
                <p className="text-blue-800/90 leading-snug">
                  Du kannst hier trotzdem in Ruhe weiter mit der KI experimentieren, um eine bessere Konstellation zu finden. Es wird nichts automatisch gelöscht — erst wenn du auf <strong>„Übernehmen"</strong> klickst, fragen wir dich, ob du die neuen Aktivitäten <strong>zusätzlich</strong> hinzufügen oder die bestehenden <strong>ersetzen</strong> möchtest.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-5 py-2">
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

      <WizardConflictDialog
        open={conflictOpen}
        onClose={() => setConflictOpen(false)}
        existingCount={existingActivityCount}
        newCount={totalProposalItems}
        onChoose={doApply}
        isApplying={isApplying}
      />
    </>
  );
}