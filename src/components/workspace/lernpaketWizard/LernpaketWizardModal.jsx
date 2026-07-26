/**
 * components/workspace/lernpaketWizard/LernpaketWizardModal.jsx
 *
 * Lernpaket-Wizard (Tab 3, Konzept v0.4 §4.1 – §4.7) — UX-Redesign 2026-07-26:
 * klarer Schritt-für-Schritt-Ablauf statt Informationsflut.
 *
 * Ablauf:
 *   Kontext-Anker (Lernpaket + Lernziele) direkt unter dem Titel.
 *   Schritt 1 (nur bei Bestand): Ausgangslage & Vorgehen — einklappbar.
 *   Schritt 2: "Was ist dir wichtig?" → Ideen generieren (stage=ideen).
 *   Schritt 3: Ideen auswählen (Kreativ-Zwischenstopp).
 *   Schritt 4: Umsetzungsvorschlag prüfen → Übernehmen (stage=mapping,
 *              dann applyLernpaketWizardProposal).
 *   Danach: Inhalte-Generator für leere Aktivitäten.
 *
 * Voraussetzung: Aufrufer hat bereits einen aktiven Lernpaket-Lock
 * (sichergestellt durch den Trigger-Button in `LernpaketPanel`).
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Sparkles, Loader2, Wand2, Package, Target, ChevronDown } from 'lucide-react';
import WizardProposalPreview from './WizardProposalPreview';
import WizardIdeenAuswahl from './WizardIdeenAuswahl';
import WizardBestandsAnalyse from './WizardBestandsAnalyse';
import WizardInhalteGenerator from './WizardInhalteGenerator';
import WizardStepSection from './WizardStepSection';
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

  // Kreativ-Zwischenstopp: freie Ideen der KI + Auswahl der Lehrkraft.
  const [ideen, setIdeen] = useState(null);
  const [recherche, setRecherche] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isMapping, setIsMapping] = useState(false);

  // Super-Wizard Etappe 1: Wie soll die KI mit dem Bestand umgehen?
  const [strukturModus, setStrukturModus] = useState('ergaenzen');
  // Schritt 1 ist standardmäßig eingeklappt — die Zusammenfassungszeile
  // zeigt Bestand + gewähltes Vorgehen kompakt an.
  const [bestandOpen, setBestandOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  // Etappe 2: true, solange die Inhalte-Generierung läuft (blockiert Schließen).
  const [inhalteBusy, setInhalteBusy] = useState(false);

  // Bestandsanalyse: vorhandene (nicht-gelöschte) Aktivitäten dieses Pakets.
  const { data: bestandAktivitaeten = [] } = useQuery({
    queryKey: ['wizard-bestand', paket?.id],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.filter({
      lernpaket_id: paket.id,
      sync_status: { $ne: 'to_delete' },
    }),
    enabled: open && !!paket?.id,
  });

  // Aktivitäten-Katalog für Namensauflösung (Bestand + Inhalte-Generator).
  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
    enabled: open,
  });

  // Lernziele zu diesem Paket — Anzeige oben im Dialog als Kontext-Anker.
  const { data: paketLernziele = [] } = useQuery({
    queryKey: ['lernziele', 'paket', paket?.id],
    queryFn: () => base44.entities.Lernziele.filter({ lernpaket_id: paket.id }),
    enabled: open && !!paket?.id,
  });

  // Beim Öffnen das gespeicherte Briefing seedet, beim Schließen reset.
  useEffect(() => {
    if (open) {
      setBriefing(paket?.kreativ_briefing || '');
      setProposal(null);
      setKorrekturen([]);
      setIdeen(null);
      setRecherche(null);
      setSelectedIds(new Set());
      setStrukturModus('ergaenzen');
      setBestandOpen(false);
    }
  }, [open, paket?.id, paket?.kreativ_briefing]);

  const hatBestand = bestandAktivitaeten.length > 0;
  const befuellteAnzahl = bestandAktivitaeten.filter((a) => a.is_complete === true).length;

  // Dynamische Schritt-Nummern: ohne Bestand entfällt Schritt 1.
  const stepWuensche = hatBestand ? 2 : 1;
  const stepIdeen = stepWuensche + 1;
  const stepUmsetzung = stepIdeen + 1;

  const totalProposalItems = proposal
    ? Object.values(proposal.phasen || {}).reduce((s, arr) => s + (arr?.length || 0), 0)
    : 0;

  // ── Schritt 2a: Kreative Ideen sammeln (Recherche + freier Entwurf) ──
  const handleGenerate = async () => {
    const trimmed = briefing.trim();
    if (!trimmed) {
      toast.error('Bitte schreibe zuerst, was dir wichtig ist.');
      return;
    }
    if (trimmed.length > MAX_BRIEFING_LENGTH) {
      toast.error(`Text zu lang (max. ${MAX_BRIEFING_LENGTH} Zeichen).`);
      return;
    }
    setIsGenerating(true);
    setProposal(null);
    setKorrekturen([]);
    setIdeen(null);
    setRecherche(null);
    try {
      const res = await base44.functions.invoke('generateLernpaketAktivitaeten', {
        lernpaketId: paket.id,
        briefing: trimmed,
        strukturModus: hatBestand ? strukturModus : 'neu',
        stage: 'ideen',
      });
      const data = res?.data || res;
      if (!data?.success || !data.ideen) {
        toast.error(data?.message || 'Generierung fehlgeschlagen. Bitte Hinweise präzisieren.');
        return;
      }
      setIdeen(data.ideen);
      setRecherche(data.recherche || null);
      // Alle Ideen sind zunächst ausgewählt — die Lehrkraft wählt ab.
      const alleIds = ['erarbeitung', 'uebung', 'sicherung'].flatMap((k) => (data.ideen[k] || []).map((it) => it.id));
      setSelectedIds(new Set(alleIds));
      toast.success('Ideen erstellt — wähle aus, was umgesetzt werden soll.');
    } catch (err) {
      console.error('[LernpaketWizardModal] generate failed', err);
      toast.error(err?.response?.data?.error || 'Fehler beim Generieren.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleIdee = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectedCount = selectedIds.size;

  // ── Schritt 2b: Ausgewählte Ideen in Aktivitäten übersetzen ──────
  const handleMapping = async () => {
    if (!ideen || selectedCount === 0) {
      toast.error('Bitte wähle mindestens eine Idee aus.');
      return;
    }
    setIsMapping(true);
    setProposal(null);
    setKorrekturen([]);
    try {
      const pick = (arr) => (arr || []).filter((it) => selectedIds.has(it.id)).map(({ idee, beschreibung }) => ({ idee, beschreibung }));
      const res = await base44.functions.invoke('generateLernpaketAktivitaeten', {
        lernpaketId: paket.id,
        briefing: briefing.trim(),
        strukturModus: hatBestand ? strukturModus : 'neu',
        stage: 'mapping',
        entwurf: {
          leitidee: ideen.leitidee || '',
          erarbeitung: pick(ideen.erarbeitung),
          uebung: pick(ideen.uebung),
          sicherung: pick(ideen.sicherung),
        },
        recherche,
      });
      const data = res?.data || res;
      if (!data?.success) {
        toast.error(data?.message || 'Umsetzung fehlgeschlagen. Bitte erneut versuchen.');
        return;
      }
      setProposal(data.proposal);
      setKorrekturen(data.korrekturen || []);
      if ((data.korrekturen || []).length > 0) {
        toast.info(`${data.korrekturen.length} Phase${data.korrekturen.length !== 1 ? 'n' : ''} automatisch korrigiert.`);
      } else {
        toast.success('Umsetzungsvorschlag erstellt.');
      }
    } catch (err) {
      console.error('[LernpaketWizardModal] mapping failed', err);
      toast.error(err?.response?.data?.error || 'Fehler bei der Umsetzung.');
    } finally {
      setIsMapping(false);
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
          items.push({
            aktivitaetstyp: it.aktivitaetstyp,
            phase: it.phase,
            ki_briefing_skizze: it.ki_briefing_skizze || null,
          });
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
        hatBestand
          ? `${data.stats.items_created} Aktivitäten ergänzt — Bestehendes blieb unverändert. Unten kannst du jetzt Inhalte generieren.`
          : `${data.stats.items_created} Aktivitäten angelegt. Unten kannst du jetzt Inhalte generieren.`
      );
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      queryClient.invalidateQueries({ queryKey: ['workspace-data'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      queryClient.invalidateQueries({ queryKey: ['wizard-bestand', paket.id] });
      // Modal bleibt offen — die neuen Hüllen erscheinen im Inhalte-Generator.
      setProposal(null);
      setKorrekturen([]);
      setIdeen(null);
      setRecherche(null);
      setSelectedIds(new Set());
    } catch (err) {
      console.error('[LernpaketWizardModal] apply failed', err);
      const msg = err?.response?.data?.error || 'Fehler beim Übernehmen.';
      toast.error(msg);
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    if (isGenerating || isMapping || isApplying || inhalteBusy) return;
    onClose();
  };

  const busy = isGenerating || isMapping || isApplying;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 gap-4">
        {/* Kopf: Titel + Kontext-Anker (Lernpaket & Lernziele) */}
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="w-4 h-4 text-primary" />
            Lernpaket mit KI-Assistent füllen
          </DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            In wenigen Schritten zu einem fertigen Lernpaket — die KI kennt den Einheiten-Kontext und recherchiert im Netz.
          </DialogDescription>
        </DialogHeader>

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

        <div className="space-y-5">
          {/* Schritt 1 (nur bei Bestand): Ausgangslage & Vorgehen — einklappbar */}
          {hatBestand && (
            <WizardStepSection nummer={1} titel="Ausgangslage & Vorgehen">
              <Collapsible open={bestandOpen} onOpenChange={setBestandOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    type="button"
                    className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs hover:bg-muted/70 transition-colors"
                  >
                    <span className="text-left min-w-0">
                      <span className="font-semibold text-foreground">
                        {bestandAktivitaeten.length} Aktivität{bestandAktivitaeten.length !== 1 ? 'en' : ''} bereits im Paket
                      </span>
                      <span className="text-muted-foreground"> ({befuellteAnzahl} mit Inhalt) · Vorgehen: </span>
                      <span className="font-medium text-primary">
                        {strukturModus === 'ergaenzen' ? 'Vorhandenes ergänzen' : 'Struktur neu denken'}
                      </span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${bestandOpen ? 'rotate-180' : ''}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2">
                  <WizardBestandsAnalyse
                    aktivitaeten={bestandAktivitaeten}
                    katalog={aktivitaetenKatalog}
                    strukturModus={strukturModus}
                    onModusChange={(m) => { setStrukturModus(m); setProposal(null); setKorrekturen([]); setIdeen(null); setSelectedIds(new Set()); }}
                    disabled={busy}
                  />
                </CollapsibleContent>
              </Collapsible>
            </WizardStepSection>
          )}

          {/* Schritt 2: Wünsche an die KI */}
          <WizardStepSection
            nummer={stepWuensche}
            titel="Was ist dir wichtig?"
            rechts={
              <div className="flex items-center gap-3">
                <SpeechInputButton
                  value={briefing}
                  onResult={(text) => setBriefing(text.slice(0, MAX_BRIEFING_LENGTH))}
                  disabled={busy}
                  maxSeconds={30}
                />
                <span className="text-xs text-muted-foreground">
                  {briefing.length} / {MAX_BRIEFING_LENGTH}
                </span>
              </div>
            }
          >
            <p className="text-xs text-muted-foreground leading-snug">
              Lernpaket und Lernziele kennt die KI bereits. Ergänze hier, worauf sie achten soll —
              Schwerpunkte, gewünschte Methoden oder Materialien, Umfang, Besonderheiten deiner Lerngruppe.
            </p>
            <Textarea
              id="wizard-briefing"
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="Beispiel: Mir ist wichtig, dass viel mit konkreten Beispielwörtern gearbeitet wird. Einstieg gern über ein Video, dazwischen abwechslungsreiche Übungen, am Ende ein kleiner Test."
              rows={4}
              maxLength={MAX_BRIEFING_LENGTH}
              disabled={busy}
              className="resize-none"
            />
            {paket?.kreativ_briefing_updated_at && (
              <p className="text-xs text-muted-foreground">
                Zuletzt mit KI gefüllt: {new Date(paket.kreativ_briefing_updated_at).toLocaleString('de-DE')}
              </p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={busy || !briefing.trim()}
                className="gap-2"
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Recherchiere & sammle Ideen… (kann einige Minuten dauern)</>
                ) : (
                  <><Sparkles className="w-4 h-4" /> {ideen ? 'Neue Ideen generieren' : 'Ideen generieren'}</>
                )}
              </Button>
            </div>
          </WizardStepSection>

          {/* Schritt 3: Kreativ-Zwischenstopp — Ideen auswählen */}
          {ideen && !proposal && (
            <WizardStepSection
              nummer={stepIdeen}
              titel="Ideen auswählen"
              rechts={<span className="text-xs text-muted-foreground">{selectedCount} ausgewählt</span>}
            >
              <p className="text-xs text-muted-foreground leading-snug">
                Diese Ideen sind bewusst frei gedacht — noch ohne Zuordnung zu einem Aufgabenformat.
                Erst im nächsten Schritt prüft die KI für deine Auswahl, wie sie sich am besten umsetzen
                lässt: als Standard-Aktivität, mit einer Vorlage aus der Aufgabengalerie oder als offene Aufgabe.
              </p>
              <WizardIdeenAuswahl
                ideen={ideen}
                selectedIds={selectedIds}
                onToggle={handleToggleIdee}
                disabled={isMapping || isApplying}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleMapping}
                  disabled={isMapping || isApplying || selectedCount === 0}
                  className="gap-2"
                >
                  {isMapping ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Übersetze in Aktivitäten…</>
                  ) : (
                    <><Sparkles className="w-4 h-4" /> {selectedCount} Idee{selectedCount !== 1 ? 'n' : ''} umsetzen</>
                  )}
                </Button>
              </div>
            </WizardStepSection>
          )}

          {/* Schritt 4: Umsetzungsvorschlag prüfen & übernehmen */}
          {proposal && (
            <WizardStepSection
              nummer={stepUmsetzung}
              titel={`Umsetzung prüfen & übernehmen (${totalProposalItems} Aktivität${totalProposalItems !== 1 ? 'en' : ''})`}
              rechts={
                <div className="flex items-center gap-3">
                  {korrekturen.length > 0 && (
                    <span className="text-xs text-amber-700">
                      {korrekturen.length} Phase-Korrektur{korrekturen.length !== 1 ? 'en' : ''}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => { setProposal(null); setKorrekturen([]); }}
                    disabled={isApplying}
                    className="text-xs text-primary underline-offset-2 hover:underline"
                  >
                    ← Zurück zur Ideen-Auswahl
                  </button>
                </div>
              }
            >
              <WizardProposalPreview
                proposal={proposal}
                onRemoveItem={handleRemoveItem}
              />
            </WizardStepSection>
          )}
        </div>

        {/* Danach: Inhalte-Generator für leere Aktivitäten (erscheint,
            sobald das Paket leere Aktivitäten enthält — auch direkt nach
            der Struktur-Übernahme). */}
        <WizardInhalteGenerator
          paket={paket}
          aktivitaeten={bestandAktivitaeten}
          katalog={aktivitaetenKatalog}
          disabled={isGenerating || isApplying}
          onBusyChange={setInhalteBusy}
        />

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={busy || inhalteBusy}>
            {proposal ? 'Abbrechen' : 'Schließen'}
          </Button>
          <Button
            onClick={handleApplyClick}
            disabled={!proposal || totalProposalItems === 0 || busy || inhalteBusy}
            className="gap-2"
          >
            {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Übernehmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}