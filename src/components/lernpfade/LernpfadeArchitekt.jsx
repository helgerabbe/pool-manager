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
import { Sparkles, Layers, Trophy, Star, Plus, Zap, BookOpen, ShieldCheck, ShieldOff, Loader2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import LernpfadeSektor from '@/components/lernpfade/LernpfadeSektor';
import PfadKopierenMenu from '@/components/lernpfade/PfadKopierenMenu';
import InfoHint from '@/components/lernpfade/InfoHint';

export const LERN_TYPEN = [
  {
    key: 'minimalist',
    label: 'Minimalist',
    description: 'Konzentriert sich auf das Wesentliche.',
    icon: Sparkles,
    color: {
      bg: 'bg-slate-50',
      bgSolid: 'bg-slate-700',
      border: 'border-slate-300',
      text: 'text-slate-700',
      textOn: 'text-white',
    },
  },
  {
    key: 'pragmatiker',
    label: 'Pragmatiker',
    description: 'Effiziente, lösungsorientierte Reihenfolge.',
    icon: Layers,
    color: {
      bg: 'bg-blue-50',
      bgSolid: 'bg-blue-600',
      border: 'border-blue-300',
      text: 'text-blue-700',
      textOn: 'text-white',
    },
  },
  {
    key: 'ehrgeizig',
    label: 'Ehrgeizig',
    description: 'Fordert mit zusätzlichen Herausforderungen.',
    icon: Trophy,
    color: {
      bg: 'bg-amber-50',
      bgSolid: 'bg-amber-600',
      border: 'border-amber-300',
      text: 'text-amber-700',
      textOn: 'text-white',
    },
  },
  {
    key: 'passioniert',
    label: 'Passioniert',
    description: 'Tiefer Tauchgang mit Projektfokus.',
    icon: Star,
    color: {
      bg: 'bg-violet-50',
      bgSolid: 'bg-violet-600',
      border: 'border-violet-300',
      text: 'text-violet-700',
      textOn: 'text-white',
    },
  },
];

function LernTypTab({ typ, active, count, onClick }) {
  const Icon = typ.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${typ.label} – ${count} Sektor${count === 1 ? '' : 'en'}`}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all font-medium text-xs ${
        active
          ? `${typ.color.bgSolid} ${typ.color.textOn} border-transparent shadow-sm`
          : `${typ.color.bg} ${typ.color.text} ${typ.color.border}/50 hover:shadow-sm`
      }`}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span className="font-semibold leading-tight">{typ.label}</span>
      <span className={`text-[10px] leading-none px-1.5 py-0.5 rounded-full ${active ? 'bg-white/25' : 'bg-white/60 border border-current/10'}`}>
        {count}
      </span>
    </button>
  );
}

export default function LernpfadeArchitekt({
  konfiguration = {},
  activeLernTyp,
  onActiveLernTypChange,
  readOnly = false,
  aufgabenById,
  systemBausteineById,
  onAddSektor,
  onPatchSektor,
  onRemoveSektor,
  onRemoveAufgabeFromPath,
  onRemoveSystemItem,
  onQuickAddOpen,
  onSelectAufgabe,
  onSelectSystemBaustein,
  selectedAufgabeId,
  selectedSystemBausteinId,
  onCopyFromLernTyp,
  getAmpelStatusForItem,
  onOpenAufgabeEditor,
  onOpenGuide,
  canvasScrollRef,
  // Status-Bereich (rechts) – ehemals CockpitActionToolbar
  istPfadGesperrt = false,
  darfFreigeben = false,
  darfEntsperren = false,
  statusBusy = false,
  onReleasePath,
  onUnlockPath,
  saveIcon: SaveIcon,
  saveIconCls,
  saveTitle,
  // Bearbeitungs-Modus (in 2. Zeile statt globalem Banner)
  isStructuralEditingActive = false,
  isEndingEdit = false,
  onEndEditing,
}) {
  const sektoren = konfiguration?.[activeLernTyp] || [];
  const aktivLabel = LERN_TYPEN.find((t) => t.key === activeLernTyp)?.label;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Zeile 1: Lerntyp-Pills + Guide (links). Save-Indicator rechts. */}
      <div className="shrink-0 px-3 py-1.5 border-b border-border bg-card flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {LERN_TYPEN.map((typ) => (
            <LernTypTab
              key={typ.key}
              typ={typ}
              active={activeLernTyp === typ.key}
              count={(konfiguration?.[typ.key] || []).length}
              onClick={() => onActiveLernTypChange?.(typ.key)}
            />
          ))}
          {onOpenGuide && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onOpenGuide}
              className="gap-1.5 h-7 text-[11px] px-2.5"
              title="Didaktische Erklärung & Standard-Raster für diesen Lerntyp"
            >
              <BookOpen className="w-3 h-3" />
              Guide
            </Button>
          )}
        </div>

        {SaveIcon && (
          <span title={saveTitle} className="ml-auto inline-flex items-center">
            <SaveIcon className={`w-3.5 h-3.5 ${saveIconCls || ''}`} />
          </span>
        )}
      </div>

      {/* Zeile 2: Status-Badge + Aktionen (Prüfen/Entsperren, Pfad kopieren,
          Quick-Add) und ggf. „Bearbeitung beenden". */}
      {(darfFreigeben || darfEntsperren || !readOnly || isStructuralEditingActive) && (
        <div className="shrink-0 px-3 py-1.5 border-b border-border bg-muted/30 flex items-center gap-1.5 flex-wrap">
          {/* Status-Badge ganz links in der Aktionszeile */}
          {istPfadGesperrt ? (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5"
              title={`Pfad „${aktivLabel}" freigegeben & gesperrt`}
            >
              <ShieldCheck className="w-3 h-3" />
              {aktivLabel} · gesperrt
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-700 bg-slate-100 border border-slate-200 rounded-full px-1.5 py-0.5">
              {aktivLabel} · Entwurf
            </span>
          )}

          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            {/* Freigabe / Entsperren */}
            {istPfadGesperrt && darfEntsperren && (
              <div className="inline-flex items-center gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onUnlockPath}
                  disabled={statusBusy}
                  className="gap-1.5 h-7 text-[11px] px-2.5 border-red-300 text-red-700 hover:bg-red-50"
                >
                  {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldOff className="w-3 h-3" />}
                  Entsperren
                </Button>
                <InfoHint title="Lernpfad entsperren">
                  Hebt die Freigabe wieder auf, sodass Sektoren und Aufgaben erneut verändert werden können. Nur Admins und die Fachschaftsleitung dürfen entsperren.
                </InfoHint>
              </div>
            )}
            {!istPfadGesperrt && darfFreigeben && (
              <div className="inline-flex items-center gap-1">
                <Button
                  size="sm"
                  onClick={onReleasePath}
                  disabled={statusBusy || readOnly}
                  className="gap-1.5 h-7 text-[11px] px-2.5"
                  title={readOnly ? 'Bitte zuerst Bearbeiten starten' : 'Validieren und freigeben'}
                >
                  {statusBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                  Prüfen & freigeben
                </Button>
                <InfoHint title="Prüfen & freigeben">
                  Validiert den aktuellen Lernpfad (alle Aufgaben grün?) und gibt ihn anschließend für die Schüler frei. Danach ist der Pfad gesperrt – Änderungen sind erst nach „Entsperren" wieder möglich.
                </InfoHint>
              </div>
            )}

            {!readOnly && (
              <>
                <div className="inline-flex items-center gap-1">
                  <PfadKopierenMenu
                    lernTypen={LERN_TYPEN}
                    activeLernTyp={activeLernTyp}
                    konfiguration={konfiguration}
                    onCopyFrom={onCopyFromLernTyp}
                  />
                  <InfoHint title="Pfad kopieren">
                    Übernimmt die komplette Sektor-Struktur eines anderen Lerntyps (z. B. „Pragmatiker") in den aktuellen Pfad. Vorhandene Sektoren werden dabei überschrieben.
                  </InfoHint>
                </div>

                <div className="inline-flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onQuickAddOpen}
                    className="gap-1.5 h-7 text-[11px] px-2.5"
                  >
                    <Zap className="w-3 h-3" /> Quick-Add
                  </Button>
                  <InfoHint title="Quick-Add">
                    Legt direkt eine neue Meta-Aufgabe (z. B. Lernpaket-Bündel, Projekt-Anker) an und hängt sie an den aktuellen Pfad – ohne Umweg über den Material-Pool.
                  </InfoHint>
                </div>
              </>
            )}

            {/* Bearbeitung beenden – ersetzt den globalen Banner */}
            {isStructuralEditingActive && onEndEditing && (
              <Button
                size="sm"
                onClick={onEndEditing}
                disabled={isEndingEdit}
                className="gap-1.5 h-7 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white"
                title="Bearbeitungsmodus beenden – andere Nutzer können dann wieder Änderungen vornehmen"
              >
                {isEndingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <PenLine className="w-3 h-3" />}
                Bearbeitung beenden
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Canvas */}
      <div ref={canvasScrollRef} className="flex-1 overflow-y-auto p-4 bg-muted/20 min-h-0">
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
                <Button type="button" size="sm" onClick={onAddSektor} className="gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> Sektor hinzufügen
                </Button>
                <InfoHint title="Was ist ein Sektor?" side="top">
                  Ein Sektor ist ein Abschnitt im Lernpfad – eine Art Kapitel. Schüler arbeiten ihn entweder „sequenziell" (Aufgabe für Aufgabe) oder „frei" (Reihenfolge offen) ab. Pro Lerntyp lassen sich beliebig viele Sektoren anlegen.
                </InfoHint>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sektoren.map((sektor, idx) => (
              <LernpfadeSektor
                key={sektor.sektor_id || idx}
                sektor={sektor}
                index={idx}
                aufgabenById={aufgabenById}
                systemBausteineById={systemBausteineById}
                readOnly={readOnly}
                activeLernTyp={activeLernTyp}
                onPatch={onPatchSektor}
                onRemove={onRemoveSektor}
                onRemoveAufgabe={(aufgabeId) => onRemoveAufgabeFromPath?.(aufgabeId)}
                onRemoveSystemItem={onRemoveSystemItem}
                onSelectAufgabe={onSelectAufgabe}
                onSelectSystemBaustein={onSelectSystemBaustein}
                selectedAufgabeId={selectedAufgabeId}
                selectedSystemBausteinId={selectedSystemBausteinId}
                getAmpelStatusForItem={getAmpelStatusForItem}
                onOpenAufgabeEditor={onOpenAufgabeEditor}
              />
            ))}
            {!readOnly && (
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onAddSektor}
                  className="gap-1.5 flex-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Sektor hinzufügen
                </Button>
                <InfoHint title="Was ist ein Sektor?" side="top">
                  Ein Sektor ist ein Abschnitt im Lernpfad – eine Art Kapitel. Schüler arbeiten ihn entweder „sequenziell" (Aufgabe für Aufgabe) oder „frei" (Reihenfolge offen) ab. Pro Lerntyp lassen sich beliebig viele Sektoren anlegen.
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