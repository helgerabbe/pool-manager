/**
 * LernpfadeArchitekt.jsx
 *
 * Rechte Spalte des Lernpfad-Cockpits (Tab 7).
 * - Header: 4 prominente Tabs für die vier Lerntypen.
 * - Canvas: Liste der Sektoren des aktiven Lerntyps + "+ Sektor"-Button + Quick-Add.
 *
 * Diese Komponente hält keinen eigenen State – sie meldet alle Mutationen
 * über onUpdateKonfiguration / onSektorPatch / … nach oben (Cockpit ist
 * Single Source of Truth, der DragDropContext liegt dort).
 */

import React from 'react';
import { Sparkles, Layers, Trophy, Star, Plus, ChevronDown } from 'lucide-react';
import EPlanHinweis from '@/components/lernpfade/EPlanHinweis';
import AbschnittTrenner from '@/components/lernpfade/AbschnittTrenner';
import { Button } from '@/components/ui/button';
import LernpfadeSektor from '@/components/lernpfade/LernpfadeSektor';
import InfoHint from '@/components/lernpfade/InfoHint';
import LernplanDauerFeld from '@/components/lernpfade/LernplanDauerFeld';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { SEKTOR_TYP } from '@/lib/sektorTypen';
import { getSektorTypStil } from '@/lib/sektorTypStil';
import { getIntensitaetsFarbe } from '@/lib/lernpfadFarben';

// Intensitätsstufen: eigener Teal-Verlauf (hell → dunkel = wenig → viel
// Intensität). Bewusst getrennt von den Inhaltsfarben (blau = Lernpakete,
// orange = Aufgaben, lila = Projekte, grau = System, grün/rot = Status).
export const LERN_TYPEN = [
  {
    key: 'minimalist',
    label: 'Minimalist',
    description: 'Konzentriert sich auf das Wesentliche.',
    icon: Sparkles,
    color: getIntensitaetsFarbe('minimalist'),
  },
  {
    key: 'pragmatiker',
    label: 'Pragmatiker',
    description: 'Effiziente, lösungsorientierte Reihenfolge.',
    icon: Layers,
    color: getIntensitaetsFarbe('pragmatiker'),
  },
  {
    key: 'ehrgeizig',
    label: 'Ehrgeizig',
    description: 'Fordert mit zusätzlichen Herausforderungen.',
    icon: Trophy,
    color: getIntensitaetsFarbe('ehrgeizig'),
  },
  {
    key: 'passioniert',
    label: 'Passioniert',
    description: 'Tiefer Tauchgang mit Projektfokus.',
    icon: Star,
    color: getIntensitaetsFarbe('passioniert'),
  },
];

// Phase E: Statisches Drei-Optionen-Menü. Übergibt direkt die SEKTOR_TYP-
// Werte, die handleAddSektor im Cockpit erwartet (Arbeitsphase öffnet
// ein Modal, Zwischentest wird mit Template befüllt, Individuell legt
// einen leeren Sektor an).
// Haupttypen: Einstieg & Anmeldung, Arbeitsphase, Schriftliche Arbeit,
// Projektbereich. Darunter (noch offen in der Ausgestaltung): Zwischentest,
// Feedback, leerer Sektor.
const HAUPT_OPTIONEN = [
  { key: SEKTOR_TYP.UEBERBLICK, label: 'Einstieg & Anmeldung', hint: 'Lernlandkarte und Anmeldung zur Prüfung' },
  { key: SEKTOR_TYP.ARBEITSPHASE, label: 'Arbeitsphase', hint: 'Auf Grundlage eines Themenfelds der Einheit' },
  { key: SEKTOR_TYP.ABSCHLUSSTEST, label: 'Schriftliche Arbeit', hint: 'Vorbereitung und schriftliche Arbeit bzw. Abschlusstest' },
  { key: SEKTOR_TYP.PROJEKTE, label: 'Projektbereich', hint: 'Nach der schriftlichen Arbeit · gesperrt bis zur Freigabe' },
];
const WEITERE_OPTIONEN = [
  { key: SEKTOR_TYP.ZWISCHENTEST, label: 'Zwischentest', hint: 'Einstiegsseite · Zwischentest-Platzhalter' },
  { key: SEKTOR_TYP.FEEDBACK, label: 'Feedback', hint: 'Schüler-Rückmeldung am Ende der Einheit (immer letzter Sektor)' },
  { key: SEKTOR_TYP.INDIVIDUELL, label: 'Leerer Sektor', hint: 'Ohne vordefinierte Bausteine' },
];

function AddSektorMenu({ onAddSektor, variant = 'default', size = 'sm', className = '' }) {
  const renderItem = (opt) => {
    const { Icon, icon } = getSektorTypStil(opt.key);
    return (
      <DropdownMenuItem key={opt.key} onClick={() => onAddSektor?.(opt.key)}>
        <Icon className={`w-4 h-4 ${icon}`} />
        <div className="flex flex-col">
          <span className="font-medium">{opt.label}</span>
          <span className="text-[11px] text-muted-foreground">{opt.hint}</span>
        </div>
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size={size} className={`gap-1.5 ${className}`}>
          <Plus className="w-3.5 h-3.5" /> Sektor hinzufügen
          <ChevronDown className="w-3 h-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Sektor-Typ wählen</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {HAUPT_OPTIONEN.map(renderItem)}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[11px] font-normal text-muted-foreground">Weitere (noch in Klärung)</DropdownMenuLabel>
        {WEITERE_OPTIONEN.map(renderItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function LernpfadeArchitekt({
  einheitId,
  konfiguration = {},
  activeLernTyp,
  onActiveLernTypChange,
  readOnly = false,
  aufgabenById,
  systemBausteineById,
  onAddSektor,
  onPatchSektor,
  onRemoveSektor,
  onMoveSektor,
  onRemoveAufgabeFromPath,
  onRemoveSystemItem,
  onRemoveBundle,
  onSetBundleConfig,
  onSetBundleModus,
  onAutoFillBundle,
  onToggleItemAktiv,
  onSetItemArbeitsauftrag,
  onSetLernpaketZugang,
  expandedSektoren,
  onToggleSektorExpanded,
  expandedBundles,
  onToggleBundleExpanded,
  getIsDropDisabled,
  onSelectAufgabe,
  onSelectSystemBaustein,
  selectedAufgabeId,
  selectedSystemBausteinId,
  getAmpelStatusForItem,
  onOpenAufgabeEditor,
  onOpenLernpaket,
  onOpenGuide,
  canvasScrollRef,
  themenfeldTitelById,
  getDriftStatus,
  driftReportLoading = false,
  onPreviewEinfuehrung,
  onPreviewQblock,
  onPreviewDiagnoseQuiz,
  onPreviewThemenfeldIntro,
  onPreviewLernlandkarte,
  onPreviewPruefungsAnmeldung,
  onOpenOnlineTest,
  onOpenKompetenzkarte,
}) {
  const sektoren = konfiguration?.[activeLernTyp] || [];
  const ePlan = activeLernTyp === 'ehrgeizig';
  const aktivLabel = ePlan ? 'Ehrgeizig & Passioniert' : LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label;
  // Erster Sektor des Projektbereichs → davor der Abschnittsübergang.
  const projektStart = ePlan
    ? sektoren.findIndex((s) => s.sektor_typ === SEKTOR_TYP.PROJEKTE || s.freischalt_bedingung?.modus === 'nach_freigabe')
    : -1;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header / Toolbar / Status-Anzeigen werden vom Cockpit oberhalb
          dieser Komponente gerendert (DashboardToolbar). Hier nur noch
          der reine Canvas. */}

      {/* Canvas */}
      <div ref={canvasScrollRef} className="flex-1 overflow-y-auto p-4 bg-muted/20 min-h-0">
        {ePlan && <EPlanHinweis />}
        {einheitId && activeLernTyp && (
          <LernplanDauerFeld
            einheitId={einheitId}
            lerntyp={activeLernTyp}
            lerntypLabel={aktivLabel}
            readOnly={readOnly}
          />
        )}
        {sektoren.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[260px] p-6 text-center rounded-xl border-2 border-dashed border-border bg-card/60">
            <p className="text-sm font-medium text-foreground/70">
              Noch kein Pfad für „{aktivLabel}" angelegt.
            </p>
            <p className="text-xs text-muted-foreground mt-1 mb-4 max-w-md">
              Lege Sektoren an und ziehe Aufgaben aus dem Pool hinein.
            </p>
            {!readOnly && (
              <div className="inline-flex items-center gap-1.5">
                <AddSektorMenu onAddSektor={onAddSektor} ePlan={ePlan} />
                <InfoHint title="Was ist ein Sektor?" side="top">
                  Ein Sektor ist ein Abschnitt im Lernpfad – eine Art Kapitel. Schüler arbeiten ihn entweder „sequenziell" (Aufgabe für Aufgabe) oder „frei" (Reihenfolge offen) ab. Pro Intensitätsstufe lassen sich beliebig viele Sektoren anlegen.
                </InfoHint>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sektoren.map((sektor, idx) => (
              <React.Fragment key={sektor.sektor_id || idx}>
              {idx === projektStart && <AbschnittTrenner />}
              <LernpfadeSektor
                sektor={sektor}
                index={idx}
                totalSektoren={sektoren.length}
                aufgabenById={aufgabenById}
                systemBausteineById={systemBausteineById}
                readOnly={readOnly}
                activeLernTyp={activeLernTyp}
                onPatch={onPatchSektor}
                onRemove={onRemoveSektor}
                onMove={onMoveSektor}
                onRemoveAufgabe={(aufgabeId) => onRemoveAufgabeFromPath?.(aufgabeId)}
                onRemoveSystemItem={onRemoveSystemItem}
                onRemoveBundle={onRemoveBundle}
                onSetBundleConfig={onSetBundleConfig}
                onSetBundleModus={onSetBundleModus}
                onAutoFillBundle={onAutoFillBundle}
                onToggleItemAktiv={onToggleItemAktiv}
                onSetItemArbeitsauftrag={onSetItemArbeitsauftrag}
                onSetLernpaketZugang={onSetLernpaketZugang}
                collapsed={!expandedSektoren?.has(sektor.sektor_id)}
                onToggleCollapsed={() => onToggleSektorExpanded?.(sektor.sektor_id)}
                expandedBundles={expandedBundles}
                onToggleBundle={onToggleBundleExpanded}
                getIsDropDisabled={getIsDropDisabled}
                onSelectAufgabe={onSelectAufgabe}
                onSelectSystemBaustein={onSelectSystemBaustein}
                selectedAufgabeId={selectedAufgabeId}
                selectedSystemBausteinId={selectedSystemBausteinId}
                getAmpelStatusForItem={getAmpelStatusForItem}
                onOpenAufgabeEditor={onOpenAufgabeEditor}
                onOpenLernpaket={onOpenLernpaket}
                themenfeldTitelById={themenfeldTitelById}
                alleSektoren={sektoren}
                onPreviewEinfuehrung={onPreviewEinfuehrung}
                onPreviewQblock={onPreviewQblock}
                onPreviewDiagnoseQuiz={onPreviewDiagnoseQuiz}
                onPreviewThemenfeldIntro={onPreviewThemenfeldIntro}
                onPreviewLernlandkarte={onPreviewLernlandkarte}
              onPreviewPruefungsAnmeldung={onPreviewPruefungsAnmeldung}
                onOpenOnlineTest={onOpenOnlineTest}
                onOpenKompetenzkarte={onOpenKompetenzkarte}
                driftStatus={
                  driftReportLoading
                    ? 'loading'
                    : getDriftStatus?.(activeLernTyp, sektor.sektor_id) ?? 'unknown'
                }
              />
              </React.Fragment>
            ))}
            {!readOnly && (
              <div className="flex items-center gap-1.5">
                <AddSektorMenu onAddSektor={onAddSektor} variant="outline" className="flex-1" ePlan={ePlan} />
                <InfoHint title="Was ist ein Sektor?" side="top">
                  Ein Sektor ist ein Abschnitt im Lernpfad – eine Art Kapitel. Schüler arbeiten ihn entweder „sequenziell" (Aufgabe für Aufgabe) oder „frei" (Reihenfolge offen) ab. Pro Intensitätsstufe lassen sich beliebig viele Sektoren anlegen.
                </InfoHint>
              </div>
            )}
          </div>
        )}
      </div>

      {readOnly && (
        <div className="shrink-0 px-4 py-2 border-t border-border bg-amber-50 text-xs text-amber-800">
          🔒 Nur-Lese-Modus aktiv – Bearbeitung erfordert den Bearbeitungsmodus.
        </div>
      )}
    </div>
  );
}