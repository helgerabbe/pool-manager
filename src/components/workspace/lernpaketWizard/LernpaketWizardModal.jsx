/**
 * components/workspace/lernpaketWizard/LernpaketWizardModal.jsx
 *
 * "Lernpaket-Wizard" (2026-08-24) — Chat-Einstieg (WizardChatPanel) als
 * primärer Bau-Modus; der bisherige Schritt-für-Schritt-Vorschlags-Flow
 * bleibt als klassischer Modus erreichbar.
 *
 * Aufbau:
 *   Kontext-Anker (Lernpaket + Lernziele) direkt unter dem Titel.
 *   Freigabe-Prüfung: freigegebene Lernpakete sind nicht bearbeitbar.
 *   Aktivitäten-Übersicht (Tabelle): Beschreibung / Material / Status
 *   pro Aktivität, inkl. aller Master-Aufgaben; Material-Upload pro Zeile.
 *   Button "Neue/weitere Aufgabenvorschläge erstellen" öffnet den
 *   KI-Vorschlags-Flow (Vorgehen → Wünsche → Ideen → Umsetzung).
 *   Inhalte-Generator für leere Aktivitäten.
 *
 * Speichern/Abbrechen-Semantik: Alle in DIESER Sitzung neu angelegten
 * Aktivitäten werden getrackt (sessionCreatedIds). "Speichern & schließen"
 * behält sie; "Abbrechen & verwerfen" löscht sie via
 * discardWizardActivities wieder (nur nie-exportierte Entwurfs-Hüllen).
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
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { Sparkles, Loader2, Wand2, Package, Target, ChevronDown, Lock, Plus } from 'lucide-react';
import WizardProposalPreview from './WizardProposalPreview';
import WizardIdeenAuswahl from './WizardIdeenAuswahl';
import WizardBestandsAnalyse from './WizardBestandsAnalyse';
import WizardInhalteGenerator from './WizardInhalteGenerator';
import WizardStepSection from './WizardStepSection';
import AufgabeneditorUebersicht from './AufgabeneditorUebersicht';
import WizardMaterialUpload from './WizardMaterialUpload';
import WizardIdeenkisteAuswahl from './WizardIdeenkisteAuswahl';
import WizardChatPanel from './WizardChatPanel';
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
  // Etappe 2: optionale Materialien fürs Briefing + Runden-Zähler für
  // eindeutige Ideen-IDs über mehrere "Weitere Vorschläge"-Runden.
  const [materialien, setMaterialien] = useState([]);
  const ideenRundeRef = useRef(0);
  // Ideenkiste-Integration: Auswahl offener Aufgaben-Ideen der Einheit.
  const [kisteSelected, setKisteSelected] = useState(new Set());
  const kisteImProposalRef = useRef([]);
  const [kisteZuIntegrieren, setKisteZuIntegrieren] = useState([]);

  // Vorschlags-Flow ein-/ausblenden (Editor-Startansicht = Übersicht).
  const [vorschlagOffen, setVorschlagOffen] = useState(false);

  // Wie soll die KI mit dem Bestand umgehen?
  const [strukturModus, setStrukturModus] = useState('ergaenzen');
  const [bestandOpen, setBestandOpen] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  // Speichern/Abbrechen: in dieser Sitzung neu angelegte Aktivitäten.
  const [sessionCreatedIds, setSessionCreatedIds] = useState([]);
  const [isDiscarding, setIsDiscarding] = useState(false);
  // true, solange die Inhalte-Generierung läuft (blockiert Schließen).
  const [inhalteBusy, setInhalteBusy] = useState(false);
  // true, solange der Wizard-Chat arbeitet (blockiert Schließen).
  const [chatBusy, setChatBusy] = useState(false);

  // Freigegebene Lernpakete sind nicht bearbeitbar.
  const istFreigegeben = paket?.content_status === 'approved' && !!paket?.released_at;

  // Bestand: vorhandene (nicht-gelöschte) Aktivitäten dieses Pakets.
  const { data: bestandAktivitaeten = [] } = useQuery({
    queryKey: ['wizard-bestand', paket?.id],
    queryFn: () => base44.entities.LernpaketPhaseAktivitaet.filter({
      lernpaket_id: paket.id,
      sync_status: { $ne: 'to_delete' },
    }),
    enabled: open && !!paket?.id,
  });

  // Aktivitäten-Katalog für Namensauflösung + Masterfähigkeit.
  const { data: aktivitaetenKatalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
    enabled: open,
  });

  // Master-Aufgaben des Pakets — für die Übersichts-Tabelle.
  const { data: masterAufgaben = [] } = useQuery({
    queryKey: ['masterAufgaben', 'paket', paket?.id],
    queryFn: () => base44.entities.MasterAufgabe.filter({ lernpaket_id: paket.id }),
    enabled: open && !!paket?.id,
  });

  // Lernziele zu diesem Paket — Anzeige oben im Dialog als Kontext-Anker.
  const { data: paketLernziele = [] } = useQuery({
    queryKey: ['lernziele', 'paket', paket?.id],
    queryFn: () => base44.entities.Lernziele.filter({ lernpaket_id: paket.id }),
    enabled: open && !!paket?.id,
  });

  // Offene Aufgaben-Ideen aus der Ideenkiste der Einheit.
  const { data: ideenkisteEintraege = [] } = useQuery({
    queryKey: ['aufgabenIdeen', 'offen', paket?.einheit_id],
    queryFn: () => base44.entities.AufgabenIdee.filter({ einheit_id: paket.einheit_id, status: 'offen' }),
    enabled: open && !!paket?.einheit_id,
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
      setVorschlagOffen(false);
      setSessionCreatedIds([]);
      setMaterialien([]);
      ideenRundeRef.current = 0;
      setKisteSelected(new Set());
      kisteImProposalRef.current = [];
      setKisteZuIntegrieren([]);
    }
  }, [open, paket?.id, paket?.kreativ_briefing]);

  const hatBestand = bestandAktivitaeten.length > 0;

  const hatIdeenkiste = ideenkisteEintraege.length > 0;

  // Dynamische Schritt-Nummern im Vorschlags-Flow.
  const stepIdeenkiste = hatBestand ? 2 : 1;
  const stepWuensche = (hatBestand ? 1 : 0) + (hatIdeenkiste ? 1 : 0) + 1;
  const stepIdeen = stepWuensche + 1;
  const stepUmsetzung = stepIdeen + 1;

  const totalProposalItems = proposal
    ? Object.values(proposal.phasen || {}).reduce((s, arr) => s + (arr?.length || 0), 0)
    : 0;

  const refreshBestand = () => {
    queryClient.invalidateQueries({ queryKey: ['wizard-bestand', paket.id] });
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    queryClient.invalidateQueries({ queryKey: ['workspace-data'] });
    // Präfix-Invalidierung: trifft sowohl die Wizard-Query
    // ['masterAufgaben','paket',id] als auch die des Menübaums ['masterAufgaben'].
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
  };

  // ── Kreative Ideen sammeln (Recherche + freier Entwurf) ──────────
  const handleGenerate = async (weitere = false) => {
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
    if (!weitere) {
      setIdeen(null);
      setRecherche(null);
    }
    try {
      // Weitere-Vorschläge-Schleife: bereits vorgeschlagene Ideen mitgeben,
      // damit die KI nur NEUE, andere Ideen liefert.
      const bisherige = weitere && ideen
        ? ['erarbeitung', 'uebung', 'sicherung'].flatMap((k) => (ideen[k] || []).map((it) => it.idee)).filter(Boolean)
        : [];
      const res = await base44.functions.invoke('generateLernpaketAktivitaeten', {
        lernpaketId: paket.id,
        briefing: trimmed,
        strukturModus: hatBestand ? strukturModus : 'neu',
        stage: 'ideen',
        materialien,
        ...(bisherige.length > 0 ? { bisherigeIdeen: bisherige } : {}),
      });
      const data = res?.data || res;
      if (!data?.success || !data.ideen) {
        toast.error(data?.message || 'Generierung fehlgeschlagen. Bitte Hinweise präzisieren.');
        return;
      }
      // Ideen über Runden hinweg eindeutig halten.
      const runde = ideenRundeRef.current++;
      const rekey = (arr) => (arr || []).map((it) => ({ ...it, id: `r${runde}-${it.id}` }));
      const neu = {
        leitidee: data.ideen.leitidee || '',
        erarbeitung: rekey(data.ideen.erarbeitung),
        uebung: rekey(data.ideen.uebung),
        sicherung: rekey(data.ideen.sicherung),
      };
      const neueIds = [...neu.erarbeitung, ...neu.uebung, ...neu.sicherung].map((it) => it.id);
      if (weitere && ideen) {
        setIdeen((prev) => ({
          ...prev,
          erarbeitung: [...prev.erarbeitung, ...neu.erarbeitung],
          uebung: [...prev.uebung, ...neu.uebung],
          sicherung: [...prev.sicherung, ...neu.sicherung],
        }));
        setSelectedIds((prev) => new Set([...prev, ...neueIds]));
        if (!recherche && data.recherche) setRecherche(data.recherche);
        toast.success('Weitere Vorschläge ergänzt.');
      } else {
        setIdeen(neu);
        setRecherche(data.recherche || null);
        setSelectedIds(new Set(neueIds));
        toast.success('Vorschläge erstellt — markiere, was übernommen werden soll.');
      }
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

  const kisteAusgewaehlt = ideenkisteEintraege.filter((e) => kisteSelected.has(e.id));

  // ── Ausgewählte Ideen (KI + Ideenkiste) in Aktivitäten übersetzen ─
  const handleMapping = async () => {
    if (selectedCount === 0 && kisteAusgewaehlt.length === 0) {
      toast.error('Bitte wähle mindestens eine Idee aus.');
      return;
    }
    setIsMapping(true);
    setProposal(null);
    setKorrekturen([]);
    try {
      const pick = (arr) => (arr || []).filter((it) => selectedIds.has(it.id)).map(({ idee, beschreibung, ziel }) => ({ idee, beschreibung, ziel }));
      const res = await base44.functions.invoke('generateLernpaketAktivitaeten', {
        lernpaketId: paket.id,
        briefing: briefing.trim() || 'Setze die ausgewählten Ideen aus dem Ideenspeicher passend zu Lernpaket und Lernzielen um.',
        strukturModus: hatBestand ? strukturModus : 'neu',
        stage: 'mapping',
        entwurf: {
          leitidee: ideen?.leitidee || '',
          erarbeitung: pick(ideen?.erarbeitung),
          uebung: pick(ideen?.uebung),
          sicherung: pick(ideen?.sicherung),
          ideenkiste: kisteAusgewaehlt.map((e) => ({
            idee: e.titel,
            beschreibung: e.beschreibung || '',
            ziel: e.aufgabentyp_vorschlag || '',
          })),
        },
        recherche,
        materialien: [
          ...materialien,
          ...kisteAusgewaehlt.flatMap((e) => (Array.isArray(e.material_urls) ? e.material_urls : [])),
        ],
      });
      const data = res?.data || res;
      if (!data?.success) {
        toast.error(data?.message || 'Umsetzung fehlgeschlagen. Bitte erneut versuchen.');
        return;
      }
      setProposal(data.proposal);
      setKorrekturen(data.korrekturen || []);
      // Verwendete Ideenkiste-Einträge merken — beim Übernehmen + Speichern
      // werden sie als integriert markiert.
      kisteImProposalRef.current = kisteAusgewaehlt.map((e) => e.id);
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

  // ── Übernehmen — immer additiv (nicht-destruktiv) ────────────────
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
            material_urls: it.material_urls || [],
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
      // Sitzungs-Tracking für Speichern/Abbrechen.
      const neueIds = (data.createdActivities || []).map((c) => c.id);
      setSessionCreatedIds((prev) => [...prev, ...neueIds]);
      // Verwendete Ideenkiste-Einträge fürs Speichern vormerken.
      if (kisteImProposalRef.current.length > 0) {
        const verwendete = kisteImProposalRef.current;
        setKisteZuIntegrieren((prev) => [...new Set([...prev, ...verwendete])]);
        setKisteSelected(new Set());
        kisteImProposalRef.current = [];
      }
      toast.success(
        `${data.stats.items_created} Aktivität${data.stats.items_created !== 1 ? 'en' : ''} angelegt — mit "Speichern & schließen" übernehmen oder mit "Abbrechen" verwerfen.`
      );
      refreshBestand();
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      // Zurück zur Übersicht — die neuen Einträge erscheinen in der Tabelle.
      setProposal(null);
      setKorrekturen([]);
      setIdeen(null);
      setRecherche(null);
      setSelectedIds(new Set());
      setVorschlagOffen(false);
    } catch (err) {
      console.error('[LernpaketWizardModal] apply failed', err);
      const msg = err?.response?.data?.error || 'Fehler beim Übernehmen.';
      toast.error(msg);
    } finally {
      setIsApplying(false);
    }
  };

  // ── Abbrechen: in dieser Sitzung angelegte Aktivitäten verwerfen ─
  const handleDiscard = async () => {
    if (sessionCreatedIds.length === 0) {
      onClose();
      return;
    }
    setIsDiscarding(true);
    try {
      const res = await base44.functions.invoke('discardWizardActivities', {
        lernpaketId: paket.id,
        activityIds: sessionCreatedIds,
      });
      const data = res?.data || res;
      if (!data?.success) {
        toast.error(data?.error || 'Verwerfen fehlgeschlagen.');
        return;
      }
      toast.success(`Änderungen verworfen — ${data.deleted.length} neue Aktivität${data.deleted.length !== 1 ? 'en' : ''} entfernt.`);
      refreshBestand();
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      onClose();
    } catch (err) {
      console.error('[LernpaketWizardModal] discard failed', err);
      toast.error(err?.response?.data?.error || 'Fehler beim Verwerfen.');
    } finally {
      setIsDiscarding(false);
    }
  };

  const handleClose = () => {
    if (isGenerating || isMapping || isApplying || isDiscarding || inhalteBusy || chatBusy) return;
    onClose();
  };

  // Speichern & schließen: verwendete Ideenkiste-Einträge als integriert markieren.
  const handleSave = async () => {
    if (isGenerating || isMapping || isApplying || isDiscarding || inhalteBusy || chatBusy) return;
    if (kisteZuIntegrieren.length > 0) {
      try {
        await base44.entities.AufgabenIdee.bulkUpdate(
          kisteZuIntegrieren.map((id) => ({
            id,
            status: 'integriert',
            integriert_hinweis: `Im Lernpaket-Wizard in Lernpaket "${paket?.titel_des_pakets || ''}" übernommen`,
            integriert_am: new Date().toISOString(),
          }))
        );
        queryClient.invalidateQueries({ queryKey: ['aufgabenIdeen'] });
      } catch (err) {
        console.error('[LernpaketWizardModal] ideenkiste update failed', err);
        toast.error('Status im Ideenspeicher konnte nicht aktualisiert werden.');
      }
    }
    onClose();
  };

  const busy = isGenerating || isMapping || isApplying || isDiscarding;
  const hatSitzungsAenderungen = sessionCreatedIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-5 gap-4">
        {/* Kopf: Titel + Kontext-Anker (Lernpaket & Lernziele) */}
        <DialogHeader className="space-y-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wand2 className="w-4 h-4 text-primary" />
            Lernpaket-Wizard
          </DialogTitle>
          <DialogDescription className="text-xs leading-snug">
            Beschreibe im Gespräch, was in dieses Lernpaket soll — der Wizard plant mit dir und baut es dann komplett auf.
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

        {/* Freigabe-Sperre: freigegebene Lernpakete sind nicht bearbeitbar. */}
        {istFreigegeben ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-6 text-center space-y-2">
            <Lock className="w-6 h-6 text-amber-600 mx-auto" />
            <p className="text-sm font-semibold text-foreground">Dieses Lernpaket ist freigegeben.</p>
            <p className="text-xs text-muted-foreground">
              Freigegebene Lernpakete können nicht bearbeitet werden. Hebe die Freigabe zuerst auf,
              um den Lernpaket-Wizard zu nutzen.
            </p>
          </div>
        ) : (
          <>
            {/* Chat-Einstieg: der Lernpaket-Wizard als Gespräch */}
            <WizardChatPanel
              paket={paket}
              disabled={busy || inhalteBusy}
              onBusyChange={setChatBusy}
              onApplied={({ createdIds, ideenkisteIds }) => {
                setSessionCreatedIds((prev) => [...prev, ...createdIds]);
                if (ideenkisteIds?.length > 0) {
                  setKisteZuIntegrieren((prev) => [...new Set([...prev, ...ideenkisteIds])]);
                }
                refreshBestand();
                queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
              }}
            />

            {/* Aktivitäten-Übersicht */}
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Aktivitäten & Aufgaben in diesem Paket</h3>
              <AufgabeneditorUebersicht
                aktivitaeten={bestandAktivitaeten}
                katalog={aktivitaetenKatalog}
                masterAufgaben={masterAufgaben}
                disabled={busy || inhalteBusy}
                onChanged={refreshBestand}
              />
              {!vorschlagOffen && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setVorschlagOffen(true)}
                    disabled={busy || inhalteBusy || chatBusy}
                    className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    Klassischer Schritt-für-Schritt-Modus
                  </button>
                </div>
              )}
            </section>

            {/* KI-Vorschlags-Flow (aufklappbar) */}
            {vorschlagOffen && (
              <div className="space-y-5 rounded-md border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    Neue Aufgabenvorschläge mit KI
                  </h3>
                  <button
                    type="button"
                    onClick={() => setVorschlagOffen(false)}
                    disabled={busy}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Ausblenden
                  </button>
                </div>

                {/* Schritt 1 (nur bei Bestand): Ausgangslage & Vorgehen */}
                {hatBestand && (
                  <WizardStepSection nummer={1} titel="Vorgehen wählen">
                    <Collapsible open={bestandOpen} onOpenChange={setBestandOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-muted/50 transition-colors"
                        >
                          <span className="text-left min-w-0">
                            <span className="text-muted-foreground">Vorgehen: </span>
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

                {/* Schritt: Aus der Ideenkiste übernehmen (optional) */}
                {hatIdeenkiste && (
                  <WizardStepSection
                    nummer={stepIdeenkiste}
                    titel="Aus dem Ideenspeicher übernehmen (optional)"
                    rechts={<span className="text-xs text-muted-foreground">{kisteSelected.size} ausgewählt</span>}
                  >
                    <p className="text-xs text-muted-foreground leading-snug">
                      Bereitliegende Ideen aus dem Ideenspeicher dieser Einheit. Ausgewählte Ideen werden bei der
                      Umsetzung in passende Aktivitäten übersetzt — inklusive ihrer Materialien. Beim Speichern
                      werden sie im Ideenspeicher als integriert markiert.
                    </p>
                    <WizardIdeenkisteAuswahl
                      eintraege={ideenkisteEintraege}
                      selectedIds={kisteSelected}
                      onToggle={(id) => setKisteSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(id)) next.delete(id); else next.add(id);
                        return next;
                      })}
                      disabled={busy}
                    />
                    {kisteSelected.size > 0 && !ideen && !proposal && (
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleMapping}
                          disabled={busy}
                          className="gap-2"
                        >
                          {isMapping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                          Nur Ideenspeicher umsetzen ({kisteSelected.size})
                        </Button>
                      </div>
                    )}
                  </WizardStepSection>
                )}

                {/* Schritt: Wünsche an die KI */}
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
                  <WizardMaterialUpload
                    materialien={materialien}
                    onChange={setMaterialien}
                    disabled={busy}
                  />
                  {paket?.kreativ_briefing_updated_at && (
                    <p className="text-xs text-muted-foreground">
                      Zuletzt mit KI gefüllt: {new Date(paket.kreativ_briefing_updated_at).toLocaleString('de-DE')}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      onClick={() => handleGenerate(false)}
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

                {/* Schritt: Kreativ-Zwischenstopp — Ideen auswählen */}
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
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleGenerate(true)}
                        disabled={busy}
                        className="gap-2"
                      >
                        {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        Weitere Vorschläge erstellen
                      </Button>
                      <Button
                        type="button"
                        onClick={handleMapping}
                        disabled={busy || selectedCount === 0}
                        className="gap-2"
                      >
                        {isMapping ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Übersetze in Aktivitäten…</>
                        ) : (
                          <><Sparkles className="w-4 h-4" /> Weiter: {selectedCount + kisteAusgewaehlt.length} Vorschl{selectedCount + kisteAusgewaehlt.length !== 1 ? 'äge' : 'ag'} umsetzen</>
                        )}
                      </Button>
                    </div>
                  </WizardStepSection>
                )}

                {/* Schritt: Umsetzungsvorschlag prüfen & übernehmen */}
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
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleApplyClick}
                        disabled={totalProposalItems === 0 || busy}
                        className="gap-2"
                      >
                        {isApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        In die Übersicht übernehmen
                      </Button>
                    </div>
                  </WizardStepSection>
                )}
              </div>
            )}

            {/* Inhalte-Generator für leere Aktivitäten */}
            <WizardInhalteGenerator
              paket={paket}
              aktivitaeten={bestandAktivitaeten}
              katalog={aktivitaetenKatalog}
              masterAufgaben={masterAufgaben}
              disabled={isGenerating || isApplying || isDiscarding}
              onBusyChange={setInhalteBusy}
            />
          </>
        )}

        <DialogFooter>
          {istFreigegeben ? (
            <Button variant="outline" onClick={handleClose}>Schließen</Button>
          ) : hatSitzungsAenderungen ? (
            <>
              <Button variant="outline" onClick={handleDiscard} disabled={busy || inhalteBusy} className="gap-2">
                {isDiscarding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Abbrechen & verwerfen
              </Button>
              <Button onClick={handleSave} disabled={busy || inhalteBusy}>
                Speichern & schließen
              </Button>
            </>
          ) : (
            <Button variant="outline" onClick={handleClose} disabled={busy || inhalteBusy}>
              Schließen
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}