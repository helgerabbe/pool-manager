/**
 * TextLesenModal.jsx
 *
 * Modal für die Bearbeitung von Aktivitäten ohne supports_master (z.B. "Text lesen").
 * Öffnet sich nur nach erfolgreichem Lock-Erwerb.
 * Footer: Abbrechen (unlock + schließen) | Speichern (save + unlock + schließen)
 */

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle } from 'lucide-react';
import StandardInput from '@/components/workspace/inputs/StandardInput';
import ImageLabelingEditor from '@/components/workspace/ImageLabelingEditor';
import ActivityResetButton from '@/components/workspace/ActivityResetButton';
import TranskriptField, { shouldShowTranskript } from '@/components/workspace/ki/TranskriptField';
import TextLesenAIGeneratorPanel from '@/components/workspace/TextLesenAIGeneratorPanel';
import TextLesenBilderUploader from '@/components/workspace/TextLesenBilderUploader';

// Phase 6 (Freigabe-Konzept 2026-05-14): Pilot-Integration.
import CompletenessIndicator from '@/components/release/CompletenessIndicator';
import ReleaseToggleSection from '@/components/release/ReleaseToggleSection';
import ReleasedLockedBanner from '@/components/release/ReleasedLockedBanner';
import { useActivityCompleteness } from '@/hooks/useCompleteness';
import { useActivityLockState, useCanToggleActivityRelease } from '@/hooks/useReleaseLock';
import useSetReleaseStatus from '@/hooks/useSetReleaseStatus';

export default function TextLesenModal({
  open,
  onOpenChange,
  catalogEntry,
  initialFieldValues = {},
  onSave,        // (fieldValues) => Promise — speichert + gibt Lock frei
  onCancel,      // () => Promise — gibt Lock frei ohne zu speichern
  onReset,       // () => Promise — setzt Aktivitäts-Inhalte zurück (Aktivität bleibt erhalten)
  isSaving = false,
  exportLocked = false,  // Wird bei Export-Lock deaktiviert
  einheitFach = 'unbekannt',         // für KI-Generator: Kontext-Anker
  einheitJahrgangsstufe = 'unbekannt',
  parentLernpaketName = '',
  // Phase 6 — Freigabe-Konzept:
  // Vollständigkeits- und Sperr-Daten reicht der Parent-Container (Workspace
  // bzw. ActivityContentEditor) als bereits aufgelöste Records durch. So bleibt
  // das Modal frei von Netzwerk-Calls und arbeitet mit den exakt gleichen
  // Objekten wie der Backend-Sperr-Check.
  activity = null,                   // LernpaketPhaseAktivitaet-Record (für Freigabe-Status)
  parentLernpaket = null,            // Lernpakete-Record (für Hierarchie-Sperre)
  parentEinheit = null,              // Einheiten-Record (für Hierarchie-Sperre)
}) {
  const [fieldValues, setFieldValues] = useState(initialFieldValues);
  const [exportLockedWasEnabled, setExportLockedWasEnabled] = useState(exportLocked);

  // Phase 6: Live-Vollständigkeit + Sperrlogik
  const completeness = useActivityCompleteness(catalogEntry, fieldValues);
  const lockState = useActivityLockState(activity, parentLernpaket, parentEinheit);
  const canToggle = useCanToggleActivityRelease(activity, parentLernpaket, parentEinheit);
  const isReleased = activity?.content_status === 'approved';
  const { setReleaseStatus, isPending: isReleasePending } = useSetReleaseStatus();

  // Nur beim ÖFFNEN des Modals Initialwerte laden (nicht bei jedem Re-render)
  // initialFieldValues NICHT als Dependency — das ist ein neues Objekt bei jedem Parent-Render
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Modal wurde gerade geöffnet → Werte initialisieren.
      // UX-Defaults für "Text lesen": leere Pflichtfelder werden mit
      // sinnvollen Vorbelegungen vorausgefüllt (Lehrkraft kann sie jederzeit
      // überschreiben). Wir greifen NICHT in bereits gespeicherte Werte ein.
      const seeded = JSON.parse(JSON.stringify(initialFieldValues || {}));
      const isTextLesen = (catalogEntry?.name || '').toLowerCase().includes('text lesen');
      if (isTextLesen) {
        if (!seeded.aufgabentext) {
          seeded.aufgabentext = 'Lies den folgenden Text aufmerksam durch.';
        }
        if (!seeded.titel && parentLernpaketName) {
          seeded.titel = parentLernpaketName;
        }
      }
      setFieldValues(seeded);
      setExportLockedWasEnabled(exportLocked);
    }
    prevOpenRef.current = open;
  }, [open]);

  // Reagiere auf Export-Lock-Änderung während Modal geöffnet ist
  useEffect(() => {
    if (exportLocked && !exportLockedWasEnabled) {
      setExportLockedWasEnabled(true); // Nur einmalig zeigen
    }
  }, [exportLocked, exportLockedWasEnabled]);

  const handleFieldChange = (fieldName, value) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

  const handleCancel = () => {
    onCancel?.();
  };

  const handleSave = () => {
    // Phase 6: Speichern überschreibt content_status NICHT mehr direkt —
    // Freigabe wird ausschließlich über setReleaseStatusSecure gesetzt.
    const payload = { ...fieldValues };

    // Wenn gerade aus 'synced' Status kommt und jetzt geändert wird,
    // markiere automatisch für Re-Export
    if (initialFieldValues?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }

    onSave?.(payload);
  };

  // Phase 6: Freigabe / Rücknahme via Backend-Function.
  const handleToggleRelease = (next) => {
    if (!activity?.id) return;
    setReleaseStatus({
      targetType: 'activity',
      targetId: activity.id,
      release: next,
    });
  };

  const formSchema = catalogEntry?.form_schema || [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleCancel(); }}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border shrink-0">
          <DialogTitle className="text-lg font-semibold">
            {catalogEntry?.name || 'Inhalt bearbeiten'}
          </DialogTitle>
          {parentLernpaketName && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              Lernpaket: <span className="font-medium text-foreground/80">{parentLernpaketName}</span>
            </p>
          )}
        </DialogHeader>

        {/* Export-Lock Warning Banner */}
        {exportLocked && exportLockedWasEnabled && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-red-800">Einheit wurde für Moodle-Export gesperrt</p>
              <p className="text-xs text-red-700 mt-0.5">Speichern ist vorübergehend nicht möglich. Bitte warten Sie, bis der Export abgeschlossen ist.</p>
            </div>
          </div>
        )}

        {/* Phase 6: Freigabe-Sperre (Aktivität / Lernpaket / Einheit) */}
        {lockState.locked && (
          <ReleasedLockedBanner
            reason={lockState.reason}
            releasedAt={activity?.released_at}
            releasedBy={activity?.released_by}
            // Rücknahme nur erlaubt, wenn der Sperrgrund die Aktivität selbst
            // ist UND die Hierarchie offen ist (canToggle).
            onUnrelease={
              lockState.reason === 'activity_released' && canToggle.allowed && !isReleasePending
                ? () => handleToggleRelease(false)
                : null
            }
            isUnreleasing={isReleasePending}
            hardLocked={!canToggle.allowed}
          />
        )}

        {/* Scrollbarer Inhalt */}
         <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-0">
           {/* Bildbeschriftungs-Editor (wenn Aktivität vom Typ ist) */}
           {catalogEntry?.name?.toLowerCase().includes('bildbeschriftung') && (
             <ImageLabelingEditor
               initialData={fieldValues}
               onChange={(newData) => setFieldValues(prev => ({ ...prev, ...newData }))}
               readOnly={false}
               hideInternalFooter
             />
           )}

           {/* Rest der Felder: nur wenn NICHT Bildbeschriftung */}
           {!catalogEntry?.name?.toLowerCase().includes('bildbeschriftung') && (
             <>
           {/* Aufgabenstellung zuerst */}
          {formSchema.find(f => f.field_name === 'aufgabentext') && (
            <div className="space-y-1.5">
              <Label>Aufgabenstellung</Label>
              <textarea
                value={fieldValues.aufgabentext || ''}
                onChange={e => handleFieldChange('aufgabentext', e.target.value)}
                placeholder={formSchema.find(f => f.field_name === 'aufgabentext')?.placeholder || 'Aufgabenstellung...'}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
          )}

          {/* Reihenfolge: Aufgabenstellung (oben) → Medientyp → Link/URL → Transkript → Rest.
              Wir sortieren das form_schema dafür hier um, damit die didaktische Logik
              (erst die Auswahl der Medienart, dann die Quelle, dann das Transkript dazu)
              für die Lehrkraft sichtbar wird. */}
          {(() => {
            const inhaltTyp = fieldValues?.inhalt_typ;
            const isFieldVisible = (f) => {
              if (f.field_name === 'aufgabentext') return false; // schon oben gerendert
              if (f.field_name === 'inhalt' && inhaltTyp && inhaltTyp !== 'text') return false;
              if (f.field_name === 'dokument_url' && inhaltTyp !== 'datei') return false;
              return true;
            };

            const ORDER_PREFIX = ['medientyp', 'url'];
            const sortedFields = [...formSchema].filter(isFieldVisible).sort((a, b) => {
              const ai = ORDER_PREFIX.indexOf(a.field_name);
              const bi = ORDER_PREFIX.indexOf(b.field_name);
              const aRank = ai === -1 ? ORDER_PREFIX.length : ai;
              const bRank = bi === -1 ? ORDER_PREFIX.length : bi;
              return aRank - bRank;
            });

            const showTranskript = shouldShowTranskript(catalogEntry?.name);
            const transkriptInserted = !showTranskript;
            const out = [];

            sortedFields.forEach((field) => {
              // KI-Generator-Panel direkt VOR dem Textinhalt-Feld einblenden,
              // damit der Workflow optisch lautet: 1. Typ wählen → 2. KI nutzen
              // (optional) → 3. fertigen Text prüfen / nachbearbeiten.
              // Nur sichtbar bei „Text direkt eingeben".
              if (field.field_name === 'inhalt' && inhaltTyp === 'text') {
                out.push(
                  <TextLesenAIGeneratorPanel
                    key="__ai_generator__"
                    fach={einheitFach}
                    jahrgangsstufe={einheitJahrgangsstufe}
                    currentTitel={fieldValues?.titel || ''}
                    disabled={isSaving || exportLocked}
                    onApply={({ titel, text }) => {
                      // Titel nur überschreiben, wenn er leer ist — sonst
                      // respektieren wir die manuelle Eingabe der Lehrkraft.
                      setFieldValues((prev) => ({
                        ...prev,
                        ...(prev?.titel ? {} : { titel }),
                        inhalt: text,
                      }));
                    }}
                  />
                );
              }

              if (field.type === 'info') {
                out.push(
                  <div key={field.field_name} className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-800">
                    {field.label}
                  </div>
                );
              } else {
                out.push(
                  <div key={field.field_name} className="space-y-1.5">
                    <Label>
                      {field.label}
                      {field.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    <StandardInput
                      field={field}
                      value={fieldValues[field.field_name] || ''}
                      onChange={(val) => handleFieldChange(field.field_name, val)}
                    />
                  </div>
                );
              }

              // Transkript direkt NACH dem url-Feld einfügen — dann steht es
              // unter Medientyp + Link/URL und vor allen sonstigen Feldern.
              if (showTranskript && field.field_name === 'url') {
                out.push(
                  <TranskriptField
                    key="__transkript__"
                    value={fieldValues.transkript || ''}
                    onChange={(val) => handleFieldChange('transkript', val)}
                    disabled={isSaving || exportLocked}
                    sourceUrl={fieldValues.url || ''}
                  />
                );
              }
            });

            // Fallback: wenn die Aktivität kein url-Feld hat, Transkript ans Ende.
            if (showTranskript && !sortedFields.some(f => f.field_name === 'url')) {
              out.push(
                <TranskriptField
                  key="__transkript_fallback__"
                  value={fieldValues.transkript || ''}
                  onChange={(val) => handleFieldChange('transkript', val)}
                  disabled={isSaving || exportLocked}
                  sourceUrl={fieldValues.url || ''}
                />
              );
            }

            // Bild-Uploader nur für „Text lesen" und ans Ende der Felder.
            const isTextLesen = (catalogEntry?.name || '').toLowerCase().includes('text lesen');
            if (isTextLesen) {
              out.push(
                <TextLesenBilderUploader
                  key="__bilder_uploader__"
                  value={fieldValues.bilder || []}
                  onChange={(val) => handleFieldChange('bilder', val)}
                  disabled={isSaving || exportLocked}
                />
              );
            }

            return out;
          })()}
             </>
            )}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-border shrink-0 space-y-3">
          {/* Phase 6: Vollständigkeits-Indikator nur zeigen, wenn NICHT vollständig.
              Bei vollständig integriert ReleaseToggleSection die Bestätigung
              direkt in den Toggle-Button (eine Box statt zwei). */}
          {!isReleased && !lockState.locked && !completeness.isComplete && (
            <CompletenessIndicator result={completeness} />
          )}

          {/* Phase 6: Freigabe-Toggle. Versteckt im hart gesperrten Hierarchie-Fall
              (dort übernimmt der ReleasedLockedBanner oben die Anzeige). */}
          {!lockState.locked && (
            <ReleaseToggleSection
              isReleased={isReleased}
              canRelease={completeness.isComplete}
              hierarchyLocked={!canToggle.allowed}
              hierarchyLockMessage={
                canToggle.reason === 'einheit_final'
                  ? 'Einheit ist final freigegeben — Freigaben gesperrt'
                  : canToggle.reason === 'lernpaket_released'
                  ? 'Lernpaket ist freigegeben — erst dort Freigabe zurücknehmen'
                  : null
              }
              onToggle={handleToggleRelease}
              releasedAt={activity?.released_at}
              releasedBy={activity?.released_by}
              disabled={isSaving || isReleasePending || exportLocked}
            />
          )}

          {/* Action Buttons */}
           <div className="flex items-center justify-between gap-3 flex-wrap">
             <div className="flex items-center gap-2">
               {onReset && !isReleased && !lockState.locked && (
                 <ActivityResetButton
                   onReset={onReset}
                   disabled={isSaving || exportLocked}
                 />
               )}
             </div>
             <div className="flex items-center gap-2">
               <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                 {lockState.locked ? 'Schließen' : 'Abbrechen'}
               </Button>
              {!lockState.locked && (
                <Button
                  onClick={handleSave}
                  disabled={isSaving || exportLocked}
                  title={exportLocked ? 'Einheit ist zur Moodle-Synchronisation gesperrt' : ''}
                  className="gap-2"
                >
                  {isSaving
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Speichern…</>
                    : 'Speichern'}
                </Button>
              )}
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}