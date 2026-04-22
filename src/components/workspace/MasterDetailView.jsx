/**
 * MasterDetailView.jsx
 *
 * Ansicht B: Fokussierte Read-Only-Ansicht einer einzelnen Master-Aufgabe.
 * Zeigt den Inhalt im Lesemodus und bietet einen prominenten "Inhalt bearbeiten"-Button,
 * der den impliziten Lock-Workflow (Modal) triggert.
 */

import React, { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Pencil, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import KlonErstellenModal from '@/components/workspace/KlonErstellenModal';
import { useLernpaketLock } from '@/hooks/useLernpaketLock';
import LueckentextEditor from '@/components/workspace/LueckentextEditor';
import LueckentextWysiwygModal from '@/components/workspace/LueckentextWysiwygModal';
import SortingListModal from '@/components/workspace/SortingListModal';
import MatchTermsModal from '@/components/workspace/MatchTermsModal';
import MiniQuizModalDetail from '@/components/workspace/MiniQuizModalDetail';
import MultipleChoiceModalDetail from '@/components/workspace/MultipleChoiceModalDetail';
import KITutorModalDetail from '@/components/workspace/KITutorModalDetail';
import ImageLabelingModalDetail from '@/components/workspace/ImageLabelingModalDetail';
import { toast } from 'sonner';

const LUECKENTEXT_NAMES = ['lückentext', 'lücken', 'lueckentext', 'cloze', 'fill in'];
function isLueckentext(name = '') {
  return LUECKENTEXT_NAMES.some(n => name.toLowerCase().includes(n));
}

const SORTING_NAMES = ['reihenfolge', 'sortierung', 'sequenzierung', 'sorting', 'sequence'];
function isSorting(name = '') {
  return SORTING_NAMES.some(n => name.toLowerCase().includes(n));
}

const MATCH_TERMS_NAMES = ['begriffe zuordnen', 'zuordnen', 'match terms'];
function isMatch(name = '') {
  return MATCH_TERMS_NAMES.some(n => name.toLowerCase().includes(n));
}

const MINIQUIZ_NAMES = ['miniquiz', 'mini-quiz', 'quiz'];
function isQuiz(name = '') {
  return MINIQUIZ_NAMES.some(n => name.toLowerCase().includes(n));
}

const MC_NAMES = ['multiple choice', 'multiple-choice'];
function isMC(name = '') {
  return MC_NAMES.some(n => name.toLowerCase().includes(n));
}

const IMAGE_LABELING_NAMES = ['bildbeschriftung', 'bildbeschreibung', 'image labeling'];
function isImageLabeling(name = '') {
  return IMAGE_LABELING_NAMES.some(n => name.toLowerCase().includes(n));
}

function isKITutor(name = '') {
  return name.toLowerCase().includes('ki-tutor');
}

function MasterContentReadOnly({ master, catalogName }) {
  const fv = master.field_values || {};

  if (isLueckentext(catalogName)) {
    return fv.lueckentext
      ? <LueckentextEditor value={fv.lueckentext} onChange={() => {}} readOnly />
      : <p className="text-sm text-muted-foreground italic">Noch kein Inhalt vorhanden.</p>;
  }

  // Match Terms
  if (['begriffe zuordnen', 'zuordnen', 'match terms'].some(n => catalogName.toLowerCase().includes(n))) {
    return (
      <div className="space-y-3">
        {fv.instruction && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Anweisung</p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">{fv.instruction}</div>
          </div>
        )}
        {fv.pairs?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Begriffspaare ({fv.pairs.length})</p>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
              {fv.pairs.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 font-medium">{p.left}</span>
                  <span className="text-muted-foreground/40">→</span>
                  <span className="flex-1 text-muted-foreground">{p.right}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {fv.distractors?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Distraktoren</p>
            <div className="flex flex-wrap gap-1.5">
              {fv.distractors.map((d, i) => (
                <span key={i} className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs">{d}</span>
              ))}
            </div>
          </div>
        )}
        {!fv.instruction && !fv.pairs?.length && (
          <p className="text-sm text-muted-foreground italic">Noch kein Inhalt vorhanden.</p>
        )}
      </div>
    );
  }

  // Sortierung
  if (['reihenfolge', 'sortierung', 'sorting'].some(n => catalogName.toLowerCase().includes(n))) {
    return (
      <div className="space-y-3">
        {fv.instruction && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aufgabenstellung</p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">{fv.instruction}</div>
          </div>
        )}
        {fv.orderedItems?.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sortierliste ({fv.orderedItems.length})</p>
            <div className="bg-muted/30 rounded-lg p-3 space-y-1">
              {fv.orderedItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-muted-foreground w-6">{i + 1}.</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {!fv.instruction && !fv.orderedItems?.length && (
          <p className="text-sm text-muted-foreground italic">Noch kein Inhalt vorhanden.</p>
        )}
      </div>
    );
  }

  // Quiz
  if (['miniquiz', 'mini-quiz', 'quiz'].some(n => catalogName.toLowerCase().includes(n))) {
    return (
      <div className="space-y-2">
        {fv.questions?.length > 0 ? (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fragen ({fv.questions.length})</p>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm max-h-64 overflow-y-auto">
              {fv.questions.map((q, i) => (
                <div key={i} className="pb-2 border-b border-border/30 last:border-0 last:pb-0">
                  <p className="font-medium">{i + 1}. {q.question}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {q.answers?.map((ans, ai) => (
                      <div key={ai} className={ans.isCorrect ? 'text-green-600 font-medium' : ''}>
                        {ans.isCorrect && '✓ '}{ans.text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">Noch kein Inhalt vorhanden.</p>
        )}
      </div>
    );
  }

  // Multiple Choice
  if (['multiple choice', 'multiple-choice'].some(n => catalogName.toLowerCase().includes(n))) {
    return (
      <div className="space-y-2">
        {fv.mcItems?.length > 0 ? (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fragen ({fv.mcItems.length})</p>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm max-h-64 overflow-y-auto">
              {fv.mcItems.map((q, i) => (
                <div key={i} className="pb-2 border-b border-border/30 last:border-0 last:pb-0">
                  <p className="font-medium">{i + 1}. {q.question}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {q.options?.map((opt, oi) => (
                      <div key={oi} className={opt.isCorrect ? 'text-green-600 font-medium' : ''}>
                        {opt.isCorrect && '✓ '}{opt.text}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground italic">Noch kein Inhalt vorhanden.</p>
        )}
      </div>
    );
  }

  // KI-Tutor
  if (catalogName.toLowerCase().includes('ki-tutor')) {
    return (
      <div className="space-y-3">
        {fv.aufgabenstellung && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aufgabenstellung</p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">{fv.aufgabenstellung}</div>
          </div>
        )}
        {fv.erwartungshorizont && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Musterlösung</p>
            <div className="bg-muted/30 rounded-lg p-3 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">{fv.erwartungshorizont}</div>
          </div>
        )}
        {!fv.aufgabenstellung && <p className="text-sm text-muted-foreground italic">Noch kein Inhalt vorhanden.</p>}
      </div>
    );
  }

  // Generischer Fallback
  return (
    <div>
      {fv.task_description
        ? <div className="bg-muted/50 rounded-lg p-3 text-sm">{fv.task_description}</div>
        : <p className="text-sm text-muted-foreground italic">Noch kein Inhalt vorhanden.</p>}
    </div>
  );
}

export default function MasterDetailView({
  master,
  index,
  catalogEntry,
  klone = [],
  kannBearbeiten,
  userEmail,
  parentLernpaketName = null,
  onDeleted,
  onEditModeChange,
}) {
  const queryClient = useQueryClient();
  const catalogName = catalogEntry?.name || '';
  const isLuecke = isLueckentext(catalogName);
  const isSort = isSorting(catalogName);
  const isMatchTerms = isMatch(catalogName);
  const isQuizType = isQuiz(catalogName);
  const isMCType = isMC(catalogName);
  const isKITutorType = isKITutor(catalogName);
  const isImageLabelingType = isImageLabeling(catalogName);

  const isSupportedType = isLuecke || isSort || isMatchTerms || isQuizType || isMCType || isKITutorType || isImageLabelingType;

  const { acquireLock, releaseLock } = useLernpaketLock(isSupportedType ? master.lernpaket_id : null);
  const [acquiringLock, setAcquiringLock] = useState(false);
  const [klonModalOpen, setKlonModalOpen] = useState(false);
  const [lueckeModalOpen, setLueckeModalOpen] = useState(false);
  const [sortingModalOpen, setSortingModalOpen] = useState(false);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [quizModalOpen, setQuizModalOpen] = useState(false);
  const [mcModalOpen, setMcModalOpen] = useState(false);
  const [kiTutorModalOpen, setKiTutorModalOpen] = useState(false);
  const [imageLabelingModalOpen, setImageLabelingModalOpen] = useState(false);
  const [fieldValues, setFieldValues] = useState(master.field_values || {});

  // Re-Hydration: fieldValues immer aktualisieren wenn master sich ändert
  useEffect(() => {
    setFieldValues(master.field_values || {});
  }, [master.field_values]);

  const saveMutation = useMutation({
    mutationFn: (fv) => base44.entities.MasterAufgabe.update(master.id, { field_values: fv }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      toast.success('Masteraufgabe gespeichert.');
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Speichern.'),
  });

  const handleEdit = async () => {
    if (!isSupportedType) return;

    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    
    if (!ok) return;
    onEditModeChange?.(true);
    
    if (isLuecke) setLueckeModalOpen(true);
    else if (isSort) setSortingModalOpen(true);
    else if (isMatchTerms) setMatchModalOpen(true);
    else if (isQuizType) setQuizModalOpen(true);
    else if (isMCType) setMcModalOpen(true);
    else if (isKITutorType) setKiTutorModalOpen(true);
    else if (isImageLabelingType) setImageLabelingModalOpen(true);
  };

  const handleCloseModal = async () => {
    setLueckeModalOpen(false);
    setSortingModalOpen(false);
    setMatchModalOpen(false);
    setQuizModalOpen(false);
    setMcModalOpen(false);
    setKiTutorModalOpen(false);
    setImageLabelingModalOpen(false);
    
    await releaseLock();
    onEditModeChange?.(false);
  };

  const handleDelete = async () => {
    for (const k of klone) await base44.entities.Aufgabenbausteine.delete(k.id);
    await base44.entities.MasterAufgabe.delete(master.id);
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
    queryClient.invalidateQueries({ queryKey: ['klone'] });
    await releaseLock();
    onEditModeChange?.(false);
    onDeleted?.();
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="rounded-xl border border-primary/30 bg-card px-5 py-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            {parentLernpaketName && (
              <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide mb-0.5 truncate">
                {parentLernpaketName}
              </p>
            )}
            <h2 className="text-base font-bold truncate">{master.titel || `Masteraufgabe ${index}`}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">{catalogName}</p>
              {master.content_status === 'approved' && (
                <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Fertig
                </Badge>
              )}
              {klone.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{klone.length} Kopie{klone.length !== 1 ? 'n' : ''}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Bearbeiten-Button */}
        {kannBearbeiten && isSupportedType && (
          <Button
            onClick={handleEdit}
            disabled={acquiringLock}
            className="gap-2 shrink-0"
          >
            {acquiringLock
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Sperren…</>
              : <><Pencil className="w-4 h-4" /> Inhalt bearbeiten</>}
          </Button>
        )}
      </div>

      {/* ── Aufgabentext aus Aktivität ── */}
      {master.field_values?.aufgabentext && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aufgabenstellung</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900">
            {master.field_values.aufgabentext}
          </div>
        </div>
      )}

      {/* ── Inhalt (Read-Only) ── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Aufgaben-Inhalt</p>
        <MasterContentReadOnly master={master} catalogName={catalogName} />
      </div>

      {/* ── Klon-Button ── */}
      {kannBearbeiten && Object.keys(master.field_values || {}).length > 0 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setKlonModalOpen(true)}
          className="gap-2 border-dashed border-primary/50 text-primary hover:bg-primary/5 w-full"
        >
          <Sparkles className="w-4 h-4" />
          Kopien / Klone erstellen
        </Button>
      )}

      {/* ── Klone-Übersicht ── */}
      {klone.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Kopien ({klone.length})
          </p>
          <div className="space-y-1.5">
            {klone.map((k) => (
              <div key={k.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-sm">
                <span className="font-medium text-green-900">Kopie {k.klon_index}</span>
                {k.content_status === 'approved' && (
                  <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">✓ Fertig</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Lückentext-Modal ── */}
      {isLuecke && (
        <LueckentextWysiwygModal
          open={lueckeModalOpen}
          onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
          initialData={fieldValues}
          isSaving={saveMutation.isPending}
          isCopy={false}
          onSave={(newData) => {
            const newFv = { ...fieldValues, ...newData };
            setFieldValues(newFv);
            saveMutation.mutate(newFv, {
              onSuccess: () => handleCloseModal(),
            });
          }}
          onDelete={handleDelete}
        />
      )}

      {/* ── Sortierung-Modal ── */}
      {isSort && (
       <SortingListModal
         open={sortingModalOpen}
         onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
         initialData={fieldValues}
         isSaving={saveMutation.isPending}
         onDelete={handleDelete}
         onSave={(newData) => {
           const { content_status, ...fvData } = newData;
           const updatedFv = { ...fieldValues, ...fvData };
           setFieldValues(updatedFv);
           saveMutation.mutate(updatedFv, {
             onSuccess: async () => {
               if (content_status) {
                 await base44.entities.MasterAufgabe.update(master.id, { content_status });
               }
               queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
               handleCloseModal();
             },
           });
         }}
         onCancel={handleCloseModal}
       />
      )}

      {/* ── Match Terms-Modal ── */}
      {isMatchTerms && (
        <MatchTermsModal
          open={matchModalOpen}
          onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
          initialData={fieldValues}
          isSaving={saveMutation.isPending}
          onDelete={handleDelete}
          onSave={(newData) => {
            const { content_status, ...fvData } = newData;
            const updatedFv = { ...fieldValues, ...fvData };
            setFieldValues(updatedFv);
            saveMutation.mutate(updatedFv, {
              onSuccess: async () => {
                if (content_status) {
                  await base44.entities.MasterAufgabe.update(master.id, { content_status });
                }
                queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                handleCloseModal();
              },
            });
          }}
          onCancel={handleCloseModal}
        />
      )}

      {/* ── Mini Quiz-Modal ── */}
      {isQuizType && (
        <MiniQuizModalDetail
          open={quizModalOpen}
          onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
          initialData={fieldValues}
          isSaving={saveMutation.isPending}
          onDelete={handleDelete}
          onSave={(newData) => {
            const { content_status, ...fvData } = newData;
            const updatedFv = { ...fieldValues, ...fvData };
            setFieldValues(updatedFv);
            saveMutation.mutate(updatedFv, {
              onSuccess: async () => {
                if (content_status) {
                  await base44.entities.MasterAufgabe.update(master.id, { content_status });
                }
                queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                handleCloseModal();
              },
            });
          }}
          onCancel={handleCloseModal}
        />
      )}

      {/* ── Multiple Choice-Modal ── */}
      {isMCType && (
        <MultipleChoiceModalDetail
          open={mcModalOpen}
          onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
          initialData={fieldValues}
          isSaving={saveMutation.isPending}
          onDelete={handleDelete}
          onSave={(newData) => {
            const { content_status, ...fvData } = newData;
            const updatedFv = { ...fieldValues, ...fvData };
            setFieldValues(updatedFv);
            saveMutation.mutate(updatedFv, {
              onSuccess: async () => {
                if (content_status) {
                  await base44.entities.MasterAufgabe.update(master.id, { content_status });
                }
                queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                handleCloseModal();
              },
            });
          }}
          onCancel={handleCloseModal}
        />
      )}

      {/* ── KI-Tutor-Modal ── */}
      {isKITutorType && (
        <KITutorModalDetail
          open={kiTutorModalOpen}
          onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
          initialData={fieldValues}
          isSaving={saveMutation.isPending}
          master={master}
          onDelete={handleDelete}
          onSave={(newData) => {
            const { content_status, ...fvData } = newData;
            const updatedFv = { ...fieldValues, ...fvData };
            setFieldValues(updatedFv);
            saveMutation.mutate(updatedFv, {
              onSuccess: async () => {
                if (content_status) {
                  await base44.entities.MasterAufgabe.update(master.id, { content_status });
                }
                queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                handleCloseModal();
              },
            });
          }}
          onCancel={handleCloseModal}
        />
      )}

      {/* ── Klon-Modal ── */}
      <KlonErstellenModal
        open={klonModalOpen}
        onClose={() => setKlonModalOpen(false)}
        master={master}
        klone={klone}
        onKlonesCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['klone'] });
          queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
        }}
      />

      {/* ── Bildbeschriftung-Modal ── */}
      {isImageLabelingType && (
        <ImageLabelingModalDetail
          open={imageLabelingModalOpen}
          onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
          initialData={fieldValues}
          isSaving={saveMutation.isPending}
          onDelete={handleDelete}
          onSave={(newData) => {
            const { content_status, ...fvData } = newData;
            const updatedFv = { ...fieldValues, ...fvData };
            setFieldValues(updatedFv);
            saveMutation.mutate(updatedFv, {
              onSuccess: async () => {
                if (content_status) {
                  await base44.entities.MasterAufgabe.update(master.id, { content_status });
                }
                queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                handleCloseModal();
              },
            });
          }}
          onCancel={handleCloseModal}
        />
      )}
    </div>
  );
}