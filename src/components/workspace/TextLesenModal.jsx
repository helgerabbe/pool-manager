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
import VideoUploadField from '@/components/workspace/VideoUploadField';
import ImageLabelingEditor from '@/components/workspace/ImageLabelingEditor';
import ActivityResetButton from '@/components/workspace/ActivityResetButton';
import TranskriptField, { shouldShowTranskript } from '@/components/workspace/ki/TranskriptField';
import TextLesenAIGeneratorPanel from '@/components/workspace/TextLesenAIGeneratorPanel';
import TextLesenBilderUploader from '@/components/workspace/TextLesenBilderUploader';

// Phase 6 (Freigabe-Konzept 2026-05-14): Pilot-Integration.
import CompactReleaseRow from '@/components/release/CompactReleaseRow';
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
  const { setReleaseStatus, setReleaseStatusAsync, isPending: isReleasePending } = useSetReleaseStatus();
  // UX-Bugfix 2026-05-14: Wenn die Lehrkraft den Toggle benutzt, läuft
  // erst `onSave` (schließt das Modal) und dann der Release-Call. Damit
  // das Modal NICHT vorzeitig zugeht und die Lehrkraft sieht, was passiert,
  // sperren wir die UI lokal mit einem dedizierten "Wird freigegeben…"-State.
  const [isReleasingFromToggle, setIsReleasingFromToggle] = useState(false);

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
      const nameLower = (catalogEntry?.name || '').toLowerCase();
      const isTextLesen = nameLower.includes('text lesen');
      const isVideoAudio = nameLower.includes('video') || nameLower.includes('audio');
      if (isTextLesen) {
        if (!seeded.aufgabentext) {
          seeded.aufgabentext = 'Lies den folgenden Text aufmerksam durch.';
        }
        if (!seeded.titel && parentLernpaketName) {
          seeded.titel = parentLernpaketName;
        }
      }
      if (isVideoAudio && !seeded.aufgabentext) {
        seeded.aufgabentext = 'Schaue dir das Lernvideo aufmerksam an.';
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
  //
  // UX-Anforderung 2026-05-14: Das Modal bleibt offen, bis BEIDE Schritte
  // (Speichern + Freigabe + Cache-Refresh) durchgelaufen sind. Erst dann
  // schließt onSave das Modal. Während des Vorgangs zeigt ein Overlay
  // "Wird freigegeben…", damit die Lehrkraft eindeutiges Feedback hat
  // statt eine bis zu 15 s lange "tote Phase" zu sehen.
  //
  // Reihenfolge:
  //   1. setReleaseStatusAsync(release: true) → DB-Update läuft
  //      Backend liest field_values aus der DB → wir müssen vorher
  //      persistieren, sonst 422.
  //   So wird daraus:
  //   1. DB-Update über die Activity-Entity (Speichern)
  //   2. setReleaseStatusAsync (Freigabe)
  //   3. Cache-Invalidation + Modal-Schluss (passiert in onSave)
  const handleToggleRelease = async (next) => {
    if (!activity?.id) return;

    setIsReleasingFromToggle(true);
    try {
      if (next === true) {
        const payload = { ...fieldValues };
        if (initialFieldValues?.moodle_sync_status === 'synced') {
          payload.moodle_sync_status = 'modified';
          payload.is_dirty_since_export = true;
        }

        // Schritt 1: Speichern. onSave persistiert die field_values, lädt
        // den Cache neu und schließt das Modal (siehe ActivityMasterPanel
        // .handleModalSave). Wir warten auf Abschluss, damit die DB-Daten
        // beim Release-Call vorhanden sind.
        // ABER: onSave schließt das Modal sofort nach dem DB-Update — der
        // Release-Call würde dann im Hintergrund laufen. Genau das wollen
        // wir hier verhindern. Trick: Wir rufen onSave erst NACH der
        // Freigabe. Damit das Backend trotzdem die aktuellen Werte sieht,
        // schreiben wir vorher direkt einmal über die Entity-API.
        // Diese Direkt-Schreibvariante ist bewusst minimal — die volle
        // Logik (Cache, Lock-Release) übernimmt onSave im zweiten Schritt.
        const { base44 } = await import('@/api/base44Client');
        const { content_status: _ignored, moodle_sync_status, is_dirty_since_export, transkript, ...rest } = payload;
        await base44.entities.LernpaketPhaseAktivitaet.update(activity.id, {
          field_values: rest,
          ...(moodle_sync_status ? { moodle_sync_status } : {}),
          ...(is_dirty_since_export !== undefined ? { is_dirty_since_export } : {}),
          ...(transkript !== undefined ? { transkript } : {}),
        });

        // Schritt 2: Freigabe
        await setReleaseStatusAsync({
          targetType: 'activity',
          targetId: activity.id,
          release: true,
        });

        // Schritt 3: onSave aufrufen, damit Cache-Invalidation + Modal-
        // Schluss durch den Parent-Container passieren — exakt wie beim
        // normalen Speichern.
        await onSave?.(payload);
      } else {
        // Rücknahme: kein Speichern nötig, kein Modal-Schluss erzwingen.
        await setReleaseStatusAsync({
          targetType: 'activity',
          targetId: activity.id,
          release: false,
        });
      }
    } catch {
      // Fehler werden bereits über Toasts (in onSave bzw. im Hook) sichtbar.
      // Wir lassen das Modal offen, damit die Lehrkraft nachbessern kann.
    } finally {
      setIsReleasingFromToggle(false);
    }
  };

  const formSchema = catalogEntry?.form_schema || [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      // Während die Freigabe läuft, blockieren wir das implizite Schließen
      // (Escape, Backdrop-Klick) — sonst läuft der Vorgang im Hintergrund
      // weiter und die Lehrkraft sieht 10–15 s lang nichts.
      if (!isOpen && !isReleasingFromToggle) handleCancel();
    }}>
      <DialogContent className="max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 relative">
        {/* UX-Overlay während Toggle-Release (Speichern + Freigabe + Refresh) */}
        {isReleasingFromToggle && (
          <div className="absolute inset-0 z-50 bg-white/85 backdrop-blur-sm rounded-lg flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
            <p className="text-sm font-semibold text-foreground">Aufgabe wird freigegeben…</p>
            <p className="text-xs text-muted-foreground max-w-xs text-center">
              Inhalte werden gespeichert und gesperrt. Das kann bei großen Videos einen Moment dauern.
            </p>
          </div>
        )}
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
        {/* min-h: garantiert Mindesthöhe, damit der DialogContent auch dann
            sichtbar bleibt, wenn das Schema (vorübergehend) keine Felder
            rendert — sonst kann der Flex-Container auf 0 kollabieren und
            der User sieht nur einen dunklen Backdrop. */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 min-h-[120px]">
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
            const medientyp = fieldValues?.medientyp;
            const isUploadMode = medientyp === 'upload';
            const isFieldVisible = (f) => {
              if (f.field_name === 'aufgabentext') return false; // schon oben gerendert
              if (f.field_name === 'inhalt' && inhaltTyp && inhaltTyp !== 'text') return false;
              if (f.field_name === 'dokument_url' && inhaltTyp !== 'datei') return false;
              // Im Upload-Modus zeigen wir kein URL-Textfeld mehr — der
              // VideoUploadField übernimmt das Setzen der url komplett.
              if (f.field_name === 'url' && isUploadMode) return false;
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

              // Im Upload-Modus rendern wir direkt nach dem medientyp-Select
              // den Upload-Block ein. Das Transkript wird weiter unten über
              // den Fallback-Pfad genau einmal eingefügt.
              if (isUploadMode && field.field_name === 'medientyp') {
                out.push(
                  <div key="__video_upload__" className="space-y-1.5">
                    <Label>
                      Eigenes Video
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <VideoUploadField
                      value={fieldValues.url || ''}
                      onChange={(val) => handleFieldChange('url', val)}
                      disabled={isSaving || exportLocked}
                    />
                  </div>
                );
              }
            });

            // Fallback: Transkript ans Ende, wenn es oben noch nicht gerendert
            // wurde — entweder weil die Aktivität gar kein url-Feld hat ODER
            // weil der Upload-Modus das url-Feld ausblendet.
            const urlFieldRendered = sortedFields.some(f => f.field_name === 'url');
            if (showTranskript && !urlFieldRendered) {
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
          {/* UX-Iteration 2026-05-14: Vollständigkeit + Freigabe-Toggle in
              EINER kompakten Zeile. Welche Pflichtfelder fehlen, sieht die
              Lehrkraft oben an den roten Sternchen — wir wiederholen das
              hier bewusst nicht mehr. */}
          {!lockState.locked && (
            <CompactReleaseRow
              isReleased={isReleased}
              canRelease={completeness.isComplete}
              missingCount={completeness?.missingFields?.length || 0}
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
              disabled={isSaving || isReleasePending || isReleasingFromToggle || exportLocked}
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