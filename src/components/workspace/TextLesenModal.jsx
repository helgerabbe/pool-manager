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
import BildEinfuegenFeld from '@/components/workspace/BildEinfuegenFeld';
import KompaktwissenGrafikFeld from '@/components/workspace/KompaktwissenGrafikFeld';
import StudyflixSucheField from '@/components/workspace/StudyflixSucheField';

import ReleasedLockedBanner from '@/components/release/ReleasedLockedBanner';
import { useActivityCompleteness } from '@/hooks/useCompleteness';
import { useActivityLockState } from '@/hooks/useReleaseLock';

/** Feste Aufgabenstellung der Kompaktwissen-Aktivität (nicht bearbeitbar). */
const KOMPAKTWISSEN_AUFGABENTEXT = 'Hier siehst du die wichtigsten Informationen zu diesem Lernpaket.';

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
  const [localActivity, setLocalActivity] = useState(activity);

  useEffect(() => {
    setLocalActivity(activity);
  }, [activity?.id, activity?.content_status, activity?.released_at, activity?.released_by]);

  // Live-Vollständigkeit + Sperrlogik (Sperre nur noch über Lernpaket/Einheit —
  // Aktivitäten haben seit 2026-08-11 keine eigene Freigabe mehr).
  const completeness = useActivityCompleteness(catalogEntry, fieldValues);
  const lockState = useActivityLockState(localActivity, parentLernpaket, parentEinheit);

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
      // Kompaktwissen: Die Aufgabenstellung ist immer dieselbe und wird
      // deshalb fest gesetzt (kein Eingabefeld im Editor).
      if (nameLower.includes('kompaktwissen')) {
        seeded.aufgabentext = KOMPAKTWISSEN_AUFGABENTEXT;
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

  const handleSave = async () => {
    const payload = { ...fieldValues };
    if (initialFieldValues?.moodle_sync_status === 'synced') {
      payload.moodle_sync_status = 'modified';
      payload.is_dirty_since_export = true;
    }

    onSave?.(payload);
  };

  const formSchema = catalogEntry?.form_schema || [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) handleCancel();
    }}>
      <DialogContent className="max-w-2xl max-h-[90dvh] min-h-[400px] flex flex-col p-0 gap-0 relative">
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
            releasedAt={localActivity?.released_at}
            releasedBy={localActivity?.released_by}
            /* Sperrgrund liegt immer bei Lernpaket oder Einheit — dort wird die
               Freigabe zurückgenommen, nicht hier. */
            onUnrelease={null}
            isUnreleasing={false}
            hardLocked
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
          {formSchema.find(f => f.field_name === 'aufgabentext') && !(catalogEntry?.name || '').toLowerCase().includes('kompaktwissen') && (
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
            const isVideoUploadMode = medientyp === 'upload';
            const isAudioUploadMode = medientyp === 'audio_upload';
            const isUploadMode = isVideoUploadMode || isAudioUploadMode;
            const isKompaktwissen = (catalogEntry?.name || '').toLowerCase().includes('kompaktwissen');
            const isFieldVisible = (f) => {
              if (f.field_name === 'aufgabentext') return false; // schon oben gerendert
              // Kompaktwissen: Die Übersichtsgrafik erhält einen eigenen Block
              // mit KI-Erstellung (siehe unten) statt des Standard-Uploads.
              if (isKompaktwissen && f.field_name === 'bild_url') return false;
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
            const nameLower = (catalogEntry?.name || '').toLowerCase();
            const isVideoAudioAktivitaet = nameLower.includes('video') || nameLower.includes('audio');
            const out = [];

            sortedFields.forEach((field) => {
              // Studyflix-Videosuche direkt VOR dem Link/URL-Feld der
              // Video/Audio-Aktivität (nur im Link-Modus, nicht bei Upload).
              if (field.field_name === 'url' && isVideoAudioAktivitaet && !isUploadMode) {
                out.push(
                  <StudyflixSucheField
                    key="__studyflix_suche__"
                    fach={einheitFach}
                    jahrgangsstufe={einheitJahrgangsstufe}
                    thema={parentLernpaketName}
                    disabled={isSaving || exportLocked}
                    onSelectUrl={(url) => handleFieldChange('url', url)}
                  />
                );
              }

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
                      {isAudioUploadMode ? 'Eigene Audiodatei' : 'Eigenes Video'}
                      <span className="text-destructive ml-1">*</span>
                    </Label>
                    <VideoUploadField
                      value={fieldValues.url || ''}
                      onChange={(val) => handleFieldChange('url', val)}
                      disabled={isSaving || exportLocked}
                      mode={isAudioUploadMode ? 'audio' : 'video'}
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

            // Kompaktwissen: optionale Übersichtsgrafik – hochladen, einfügen
            // oder per KI aus dem Kompaktwissen-Text erstellen lassen.
            if (isKompaktwissen) {
              out.push(
                <KompaktwissenGrafikFeld
                  key="__kompaktwissen_grafik__"
                  value={fieldValues.bild_url || ''}
                  kompaktwissenText={fieldValues.text || ''}
                  onChange={(val) => handleFieldChange('bild_url', val)}
                  disabled={isSaving || exportLocked}
                />
              );
            }

            // KI-Tutor-Aufgabe: optionales Bild (z. B. Screenshot einer Tabelle)
            // per Copy & Paste (Strg+V) oder Datei-Auswahl. Wird in
            // field_values.bild_url gespeichert.
            const isKITutor = (catalogEntry?.name || '').toLowerCase().includes('ki-tutor');
            if (isKITutor) {
              out.push(
                <div key="__ki_tutor_bild__" className="space-y-1.5">
                  <Label>
                    Bild zur Aufgabe <span className="text-muted-foreground font-normal">(optional, z. B. Screenshot)</span>
                  </Label>
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>
                      <span className="font-semibold">Wichtig:</span> Brian kennt diese Aufgabe (und das Bild) nicht.
                      Er bekommt sie nur, wenn der Schüler sie ihm selbst erklärt – z. B. indem er das Bild als
                      Screenshot in den Chat kopiert. Brian gibt keine Lösung vor, sondern unterstützt nur bei der Bearbeitung.
                      Soll eine Aufgabe wirklich ausführlich gemeinsam mit Brian gelöst werden, gehört sie eher zu den
                      allgemeinen Aufgaben (Tab 6).
                    </p>
                  </div>
                  <BildEinfuegenFeld
                    value={fieldValues.bild_url || ''}
                    onChange={(val) => handleFieldChange('bild_url', val)}
                    disabled={isSaving || exportLocked}
                  />
                </div>
              );
            }

            return out;
          })()}
             </>
            )}
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-border shrink-0 space-y-3">
          {/* Vollständigkeits-Hinweis. Eine eigene Aktivitäts-Freigabe gibt es
              nicht mehr — freigegeben wird das Lernpaket. */}
          {!lockState.locked && (
            completeness.isComplete ? (
              <p className="text-xs text-green-700 font-medium">✓ Vollständig — dieses Lernpaket kann freigegeben werden, sobald alle Aktivitäten vollständig sind.</p>
            ) : (
              <p className="text-xs text-amber-700 font-medium">
                Noch unvollständig: {completeness.missingFields.length} Pflichtangabe{completeness.missingFields.length !== 1 ? 'n' : ''} fehlt.
              </p>
            )
          )}

          {/* Action Buttons */}
           <div className="flex items-center justify-between gap-3 flex-wrap">
             <div className="flex items-center gap-2">
               {onReset && !lockState.locked && (
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