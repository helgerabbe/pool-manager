/**
 * BrianExportCockpitView.jsx
 *
 * Export-Cockpit für Brian.study.
 * Zeigt alle freigegebenen Aufgaben (Ebene 2 + 3), generiert
 * Brian-Prompts und markiert Aufgaben als "In Brian integriert".
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Copy, ChevronDown, ChevronUp, AlertTriangle, ExternalLink } from 'lucide-react';
import BrianUebertragenDialog from '@/components/export/BrianUebertragenDialog';
import BrianAnleitungPanel from '@/components/export/BrianAnleitungPanel';
import MoodleWegInfoBox from '@/components/einheiten/MoodleWegInfoBox';
import HelpBadge from '@/components/ui/HelpBadge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { sammleBrianDialoge, istVeraltet } from '@/lib/brianDialoge';

// ── Brian-relevante Aufgabentypen ──
// Nur KI-Tutor-Aufgaben ('inhalt', inkl. Sequenz-Modus) brauchen Brian.
// ── Segment-Copy-Button ──
function SegmentCopyButton({ label, value }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success(`"${label}" kopiert.`);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      disabled={!value}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors disabled:opacity-40"
    >
      {copied
        ? <><CheckCircle2 className="w-3 h-3 text-green-600" /> Kopiert</>
        : <><Copy className="w-3 h-3" /> Kopieren</>
      }
    </button>
  );
}

// ── Karte eines Brian-DIALOGS ──
// Ein Dialog ist entweder eine ganze Einzelaufgabe oder EIN Brian-Schritt
// einer Folge — Brian legt pro Dialog eine Aufgabe an. Woher er stammt,
// liefert lib/brianDialoge; diese Karte muss den Unterschied nicht kennen.
function DialogCard({ dialog, onMarkAsSynced }) {
  const [expanded, setExpanded] = useState(false);
  const { aufgabe, felder } = dialog;
  const isSynced = dialog.sync_status === 'synced';
  const isReady = dialog.bereit;
  const modifiedSinceExport = istVeraltet(dialog);

  // Direkter Weg zur Aufgabe: neuer Tab, damit das Export-Center offen bleibt.
  const aufgabeLink = aufgabe?.einheit_id
    ? `/workspace?einheit=${aufgabe.einheit_id}&tab=${aufgabe.anforderungsebene === '3 - Projekt' ? 'ebene3' : 'ebene2'}`
    : null;

  const ebeneLabel = aufgabe.anforderungsebene === '3 - Projekt'
    ? '🎯 Ebene 3'
    : aufgabe.anforderungsebene === '2 - Transfer' ? '📝 Ebene 2' : '📘 Ebene 1';

  return (
    <div className={cn(
      'rounded-xl border bg-card shadow-sm transition-all',
      isSynced ? 'border-green-200 bg-green-50/20' : 'border-border'
    )}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{dialog.titel}</span>
            {dialog.schrittId && (
              <Badge variant="secondary" className="text-[10px] shrink-0">
                Schritt {dialog.schrittNummer} aus „{aufgabe.titel || 'Aufgabe'}“
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] shrink-0">{ebeneLabel}</Badge>
            {aufgabe.aufgabentyp_projekt && (
              <Badge variant="secondary" className="text-[10px] shrink-0">{aufgabe.aufgabentyp_projekt}</Badge>
            )}
            {isSynced && (
              <Badge className="bg-green-100 text-green-800 border border-green-300 text-[10px] shrink-0 gap-1">
                <CheckCircle2 className="w-3 h-3" /> In Brian
                {dialog.dialog_id ? ` · ${dialog.dialog_id}` : ''}
              </Badge>
            )}
            {modifiedSinceExport && (
              <Badge className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] shrink-0 gap-1">
                <AlertTriangle className="w-3 h-3" /> Seit Brian-Export geändert
              </Badge>
            )}
          </div>
          {isSynced && dialog.synced_at && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Zuletzt nach Brian übertragen am {new Date(dialog.synced_at).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}
              {modifiedSinceExport && ' — die Aufgabe wurde danach noch bearbeitet. Prüfe, ob die Brian-Version noch aktuell ist.'}
            </p>
          )}
          {felder.learner_instruction && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{felder.learner_instruction}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
          {isReady && (
            <Badge className="bg-green-100 text-green-800 border border-green-300 text-[10px] shrink-0 gap-1 whitespace-nowrap">
              ✓ Bereit
            </Badge>
          )}
          {!isSynced && (
            <Button
              size="sm"
              onClick={() => onMarkAsSynced(dialog)}
              className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700 whitespace-nowrap"
              disabled={!isReady}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Übertragen
            </Button>
          )}
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1 rounded hover:bg-muted/50 text-muted-foreground"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandierter Bereich mit Segmenten */}
      {expanded && (
        <div className="border-t border-border p-4 space-y-4">
          {!isReady && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>
                Nicht alle vier Felder sind gefüllt.{' '}
                {dialog.schrittId
                  ? 'Im Schritt-Fenster dieses Gesprächs im Reiter „Brian-Felder" erzeugen.'
                  : 'Im KI-Tutor-Prompt-Tab der Aufgabe generieren oder ausfüllen.'}
                {aufgabeLink && (
                  <>
                    {' '}
                    <a
                      href={aufgabeLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-semibold underline"
                    >
                      Aufgabe öffnen <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </span>
            </div>
          )}

          {/* Fünf Segmente */}
          <div className="space-y-3">
            {[
              { label: '1. Dialogname', value: felder.dialog_name },
              { label: '2. Anweisung für Lernende', value: felder.learner_instruction },
              { label: '3. System-Anweisung (Tutor-Persona)', value: felder.system_instruction },
              { label: '4. Completion-Rule', value: felder.completion_rule },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
                  <SegmentCopyButton label={label} value={value} />
                </div>
                <div className="p-2.5 rounded-lg border border-border bg-muted/10 text-xs leading-relaxed text-foreground">
                  {value ? (
                    <p className="whitespace-pre-wrap max-h-24 overflow-y-auto">{value}</p>
                  ) : (
                    <p className="text-muted-foreground italic">Nicht definiert</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Rubriken */}
          {Array.isArray(aufgabe.rubric_criteria) && aufgabe.rubric_criteria.length > 0 && (
            <div className="pt-2 border-t border-border space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  5. Bewertungsrubriken ({aufgabe.rubric_criteria.reduce((s, r) => s + (r.points || 0), 0)} Punkte)
                </p>
              </div>
              <div className="space-y-1.5">
                {aufgabe.rubric_criteria.map((r, i) => (
                  <div key={i} className="p-2 rounded-lg border border-border bg-muted/10 text-xs">
                    <p className="font-medium">{r.title} ({r.points} Punkte)</p>
                    <p className="text-muted-foreground mt-0.5">{r.criteria_text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Haupt-Komponente ──
// einheitId (optional): auf eine einzelne Einheit begrenzen — so wird das
// Cockpit im Workspace privater Einheiten als eigener Tab wiederverwendet.
// embedded: kompaktere Darstellung inkl. Schritt-für-Schritt-Anleitung.
export default function BrianExportCockpitView({ einheitId = null, embedded = false }) {
  const queryClient = useQueryClient();
  const [filterSynced, setFilterSynced] = useState(false);
  const [uebertragenDialog, setUebertragenDialog] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const { data: allAufgaben = [] } = useQuery({
    queryKey: ['allgemeineAufgaben', einheitId],
    queryFn: () =>
      einheitId
        ? base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheitId })
        : base44.entities.AllgemeineAufgabe.list(),
  });

  // Gezählt und gelistet werden DIALOGE, nicht Aufgaben: Eine Folge mit zwei
  // Brian-Schritten ergibt zwei Dialoge, die einzeln nach Brian gehen und
  // unterschiedlich weit sein können.
  const alleDialoge = useMemo(() => sammleBrianDialoge(allAufgaben), [allAufgaben]);

  const dialoge = useMemo(() => alleDialoge.filter((d) =>
    d.aufgabe.content_status === 'approved'
    && (filterSynced ? true : d.sync_status !== 'synced')
  ), [alleDialoge, filterSynced]);

  const synced = alleDialoge.filter((d) => d.sync_status === 'synced').length;
  const pending = alleDialoge.filter((d) => d.aufgabe.content_status === 'approved' && d.sync_status !== 'synced').length;

  const handleConfirmUebertragen = async ({ brian_dialog_id, brian_url }) => {
    if (!uebertragenDialog) return;
    setIsSaving(true);
    try {
      // Atomarer Server-Call: setzt brian_sync_status='synced' + Brian-ID/URL
      // und löst im selben Update den Dual-Lock auf, falls Moodle bereits
      // synced ist (siehe OPTIMISTIC_LOCKING_VERSION_FIELD.md §14).
      const result = await base44.functions.invoke('confirmBrianExport', {
        aufgabe_id: uebertragenDialog.aufgabe.id,
        // Ohne schritt_id gilt die Bestätigung für die ganze Aufgabe
        // (Einzelaufgabe), mit für genau dieses eine Gespräch.
        schritt_id: uebertragenDialog.schrittId || null,
        brian_dialog_id,
        brian_url,
      });

      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      setUebertragenDialog(null);

      if (result.data?.lock_released) {
        toast.success('Als "In Brian" markiert – Dual-Lock aufgehoben (Moodle + Brian beide synced).');
      } else {
        toast.success('Als "In Brian" markiert. Bearbeitungssperre bleibt bis Moodle-Export bestätigt.');
      }
    } catch (error) {
      toast.error('Fehler: ' + (error?.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn(embedded ? 'p-6' : 'min-h-screen bg-muted/20 p-6')}>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Privater Exportbereich: Moodle-Einbindung (nur im Workspace-Tab) */}
        {embedded && (
          <div className="space-y-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Export</h2>
              <p className="text-muted-foreground mt-2">
                Der Exportbereich deiner privaten Einheit: Einbindung in Moodle und Übertragung der KI-Tutor-Aufgaben nach Brian.study.
              </p>
            </div>
            <MoodleWegInfoBox />
          </div>
        )}

        {/* Header */}
        <div className={cn(embedded && 'pt-2 border-t border-border')}>
          <h2 className={cn('font-bold tracking-tight flex items-center gap-2', embedded ? 'text-xl' : 'text-3xl')}>
            Brian.study Export
            <HelpBadge
              text="Hier kopierst du die KI-Tutor-Segmente für jede Aufgabe, legst sie händisch in Brian.study an und trägst die Brian-ID zurück ein."
              docsSlug="export-workflow"
            />
          </h2>
          <p className="text-muted-foreground mt-2">
            {embedded
              ? 'Übertrage die KI-Tutor-Aufgaben dieser Einheit per Kopieren & Einfügen nach Brian.study und verknüpfe sie über die Brian-ID.'
              : 'Generiere Prompts für Brian.study und markiere Aufgaben als exportiert.'}
          </p>
        </div>

        {/* Schritt-für-Schritt-Anleitung (im Workspace-Tab) */}
        {embedded && <BrianAnleitungPanel />}

        {/* Statistiken */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Bereit für Brian', value: pending, color: 'text-blue-700 bg-blue-50 border-blue-200' },
            { label: 'In Brian exportiert', value: synced, color: 'text-green-700 bg-green-50 border-green-200' },
            { label: 'Gesamt freigegeben', value: pending + synced, color: 'text-slate-700 bg-slate-50 border-slate-200' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border p-4 ${color}`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs mt-1 opacity-80">{label}</p>
            </div>
          ))}
        </div>

        {/* Aufgaben-Liste */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              Brian-Dialoge ({dialoge.length})
            </h3>
            <button
              onClick={() => setFilterSynced(p => !p)}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              {filterSynced ? 'Nur offene anzeigen' : 'Bereits exportierte auch anzeigen'}
            </button>
          </div>

          {dialoge.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm border border-dashed border-border rounded-xl">
              {filterSynced
                ? 'Keine freigegebenen Brian-Dialoge vorhanden.'
                : 'Alle Dialoge sind bereits in Brian angelegt.'}
            </div>
          ) : (
            dialoge.map(dialog => (
              <DialogCard
                key={dialog.key}
                dialog={dialog}
                onMarkAsSynced={setUebertragenDialog}
              />
            ))
          )}
        </div>
      </div>

      <BrianUebertragenDialog
        open={!!uebertragenDialog}
        onOpenChange={(open) => { if (!open) setUebertragenDialog(null); }}
        aufgabe={uebertragenDialog?.aufgabe}
        onConfirm={handleConfirmUebertragen}
        isSaving={isSaving}
      />
    </div>
  );
}