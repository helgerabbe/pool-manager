/**
 * components/workspace/lernpaketWizard/AufgabeneditorUebersicht.jsx
 *
 * Aufgabeneditor Etappe 1 (2026-07-27): Strukturierte Übersicht aller
 * Aktivitäten/Aufgaben eines Lernpakets — pro Aktivität: Aufgaben-
 * beschreibung vorhanden? Material vorhanden (+ Upload)? Status
 * leer / bearbeitet / vollständig. Bei masterfähigen Aktivitäten werden
 * alle Master-Aufgaben als eigene Zeilen angezeigt.
 */
import React, { useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Loader2, CheckCircle2, CircleDashed, MinusCircle, FileText, Layers, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import WizardBeschreibungEditor from './WizardBeschreibungEditor';

const PHASE_ORDER = ['Input', 'Übung', 'Abschluss'];
const PHASE_LABEL = { Input: '📚 Erarbeitung', 'Übung': '✏️ Übung', Abschluss: '🎯 Abschluss' };

const STATUS_META = {
  leer: { label: 'leer', klass: 'bg-slate-100 text-slate-600 border-slate-200' },
  bearbeitet: { label: 'bearbeitet', klass: 'bg-amber-50 text-amber-700 border-amber-200' },
  vollstaendig: { label: 'vollständig', klass: 'bg-green-50 text-green-700 border-green-200' },
};

function hatWerte(fieldValues) {
  if (!fieldValues || typeof fieldValues !== 'object') return false;
  return Object.values(fieldValues).some(
    (v) => v != null && v !== '' && !(Array.isArray(v) && v.length === 0)
  );
}

function aktivitaetStatus(a, masters, istMasterfaehig) {
  if (istMasterfaehig) {
    if (masters.length === 0) return 'leer';
    return a.is_complete ? 'vollstaendig' : 'bearbeitet';
  }
  if (a.is_complete) return 'vollstaendig';
  return hatWerte(a.field_values) ? 'bearbeitet' : 'leer';
}

function StatusBadge({ status }) {
  const m = STATUS_META[status];
  return <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', m.klass)}>{m.label}</Badge>;
}

function BoolZelle({ ok, titelJa, titelNein }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 text-green-700" title={titelJa}>
      <CheckCircle2 className="w-3.5 h-3.5" /> ja
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground" title={titelNein}>
      <MinusCircle className="w-3.5 h-3.5" /> —
    </span>
  );
}

export default function AufgabeneditorUebersicht({
  aktivitaeten = [],
  katalog = [],
  masterAufgaben = [],
  disabled = false,
  onChanged,
}) {
  const [uploadingId, setUploadingId] = useState(null);
  // Etappe 3: Aktivität, deren Aufgabenbeschreibung gerade bearbeitet wird.
  const [editBeschreibungId, setEditBeschreibungId] = useState(null);
  const fileInputRef = useRef(null);
  const uploadTargetRef = useRef(null);

  const katalogById = new Map(katalog.map((k) => [k.id, k]));
  const mastersByActivity = new Map();
  masterAufgaben.forEach((m) => {
    if (!mastersByActivity.has(m.activity_id)) mastersByActivity.set(m.activity_id, []);
    mastersByActivity.get(m.activity_id).push(m);
  });

  const startUpload = (activity) => {
    uploadTargetRef.current = activity;
    fileInputRef.current?.click();
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    const activity = uploadTargetRef.current;
    if (!activity || files.length === 0) return;
    setUploadingId(activity.id);
    try {
      const neue = [];
      for (const file of files) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        neue.push({ url: file_url, name: file.name });
      }
      const bisher = Array.isArray(activity.material_urls) ? activity.material_urls : [];
      await base44.entities.LernpaketPhaseAktivitaet.update(activity.id, {
        material_urls: [...bisher, ...neue],
      });
      toast.success(`${neue.length} Material${neue.length !== 1 ? 'ien' : ''} an der Aktivität gespeichert.`);
      onChanged?.();
    } catch (err) {
      console.error('[AufgabeneditorUebersicht] upload failed', err);
      toast.error('Material-Upload fehlgeschlagen.');
    } finally {
      setUploadingId(null);
      uploadTargetRef.current = null;
    }
  };

  if (aktivitaeten.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic rounded-md border border-dashed border-border px-3 py-4 text-center">
        Noch keine Aktivitäten in diesem Lernpaket — erstelle unten neue Aufgabenvorschläge.
      </p>
    );
  }

  return (
    <div className="rounded-md border border-border overflow-hidden text-xs">
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFiles} />
      {/* Kopfzeile */}
      <div className="grid grid-cols-[1fr_90px_110px_90px] gap-2 px-3 py-1.5 bg-muted/60 font-medium text-muted-foreground uppercase tracking-wide text-[10px]">
        <span>Aktivität / Aufgabe</span>
        <span>Beschreibung</span>
        <span>Material</span>
        <span>Status</span>
      </div>

      {PHASE_ORDER.map((phase) => {
        const items = aktivitaeten.filter((a) => a.phase === phase);
        if (items.length === 0) return null;
        return (
          <React.Fragment key={phase}>
            <div className="px-3 py-1 bg-muted/30 font-semibold text-foreground text-[11px] border-t border-border">
              {PHASE_LABEL[phase]}
            </div>
            {items.map((a) => {
              const katalogEintrag = katalogById.get(a.aktivitaet_id);
              const istMasterfaehig = katalogEintrag?.supports_master === true;
              const masters = mastersByActivity.get(a.id) || [];
              const beschreibung =
                a.ki_briefing?.idee || a.ki_briefing?.offen?.funktionsweise || a.ki_briefing?.offen?.lernziel || '';
              const material = Array.isArray(a.material_urls) ? a.material_urls : [];
              const status = aktivitaetStatus(a, masters, istMasterfaehig);
              return (
                <React.Fragment key={a.id}>
                  <div className="grid grid-cols-[1fr_90px_110px_90px] gap-2 px-3 py-2 border-t border-border items-start bg-background">
                    <div className="min-w-0">
                      <span className="font-medium text-foreground">{katalogEintrag?.name || 'Unbekannt'}</span>
                      {beschreibung && (
                        <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2" title={beschreibung}>
                          💡 {beschreibung}
                        </p>
                      )}
                    </div>
                    <div className="pt-0.5 space-y-0.5">
                      <BoolZelle
                        ok={!!beschreibung}
                        titelJa="Aufgabenbeschreibung vorhanden"
                        titelNein="Keine Aufgabenbeschreibung — was sollen die Schüler:innen genau machen?"
                      />
                      <button
                        type="button"
                        onClick={() => setEditBeschreibungId(editBeschreibungId === a.id ? null : a.id)}
                        disabled={disabled}
                        className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50 text-[11px]"
                        title="Aufgabenbeschreibung bearbeiten — Pflicht für die KI-Aufgabenerstellung"
                      >
                        <Pencil className="w-3 h-3" />
                        {beschreibung ? 'bearbeiten' : 'ergänzen'}
                      </button>
                    </div>
                    <div className="pt-0.5 flex items-center gap-1.5 flex-wrap">
                      {material.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-foreground" title={material.map((m) => m.name).join(', ')}>
                          <FileText className="w-3.5 h-3.5 text-primary" /> {material.length}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => startUpload(a)}
                        disabled={disabled || uploadingId === a.id}
                        className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50 text-[11px]"
                        title="Material (Text, Bild, PDF …) hochladen — wird bei der KI-Aufgabenerstellung berücksichtigt"
                      >
                        {uploadingId === a.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Paperclip className="w-3 h-3" />}
                        hochladen
                      </button>
                    </div>
                    <div className="pt-0.5"><StatusBadge status={status} /></div>
                  </div>

                  {editBeschreibungId === a.id && (
                    <WizardBeschreibungEditor
                      activity={a}
                      disabled={disabled}
                      onDone={(saved) => {
                        setEditBeschreibungId(null);
                        if (saved) onChanged?.();
                      }}
                    />
                  )}

                  {/* Master-Aufgaben als eigene Zeilen */}
                  {istMasterfaehig && masters.map((m) => (
                    <div key={m.id} className="grid grid-cols-[1fr_90px_110px_90px] gap-2 px-3 py-1.5 border-t border-border/60 items-center bg-muted/20">
                      <span className="flex items-center gap-1.5 pl-4 text-muted-foreground min-w-0">
                        <Layers className="w-3 h-3 shrink-0" />
                        <span className="truncate">{m.titel || 'Master-Aufgabe'}</span>
                      </span>
                      <span />
                      <span />
                      <StatusBadge status={m.is_complete ? 'vollstaendig' : (hatWerte(m.field_values) ? 'bearbeitet' : 'leer')} />
                    </div>
                  ))}
                  {istMasterfaehig && masters.length === 0 && (
                    <div className="px-3 py-1.5 border-t border-border/60 bg-muted/20 pl-7 text-muted-foreground flex items-center gap-1.5">
                      <CircleDashed className="w-3 h-3" /> Noch keine Master-Aufgabe angelegt
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}
    </div>
  );
}