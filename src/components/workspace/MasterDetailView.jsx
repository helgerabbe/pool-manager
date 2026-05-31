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
import { Crown, Pencil, Loader2, CheckCircle2, Sparkles, Lock, Eye } from 'lucide-react';
import LueckentextPreviewModal from '@/components/workspace/preview/LueckentextPreviewModal';
import KITutorPreviewModal from '@/components/workspace/preview/KITutorPreviewModal';
import TestPreviewModal from '@/components/workspace/preview/TestPreviewModal';
import MatchTermsPreviewModal from '@/components/workspace/preview/MatchTermsPreviewModal';
import SortingListPreviewModal from '@/components/workspace/preview/SortingListPreviewModal';
import MiniQuizPreviewModal from '@/components/workspace/preview/MiniQuizPreviewModal';
import ReleaseToggleSection from '@/components/release/ReleaseToggleSection';
import { sanitizeHtml } from '@/lib/sanitize';
import { getFriendlyErrorMessage } from '@/lib/errorMapper';
import { resolveStatus } from '@/lib/statusUtils';
import KlonErstellenModal from '@/components/workspace/KlonErstellenModal';
import { useLernpaketLock } from '@/hooks/useLocks';
import LueckentextEditor from '@/components/workspace/LueckentextEditor';
import LueckentextWysiwygModal from '@/components/workspace/LueckentextWysiwygModal';
import SortingListModal from '@/components/workspace/SortingListModal';
import MatchTermsModal from '@/components/workspace/MatchTermsModal';
import MiniQuizModalDetail from '@/components/workspace/MiniQuizModalDetail';
import TestModal from '@/components/workspace/TestModal';
import MultipleChoiceModalDetail from '@/components/workspace/MultipleChoiceModalDetail';
import KITutorModalDetail from '@/components/workspace/KITutorModalDetail';
import ImageLabelingModalDetail from '@/components/workspace/ImageLabelingModalDetail';
import ImageLabelingEditor from '@/components/workspace/ImageLabelingEditor';
import OffeneAufgabeModal from '@/components/workspace/OffeneAufgabeModal';
import { toast } from 'sonner';
import { syncMasterStatusNow, refreshWorkspaceStatusQueries } from '@/lib/workspaceStatusRefresh';

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

function isOffeneAufgabe(name = '') {
  return name.toLowerCase().includes('offene aufgabe');
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
            <div className="bg-muted/50 rounded-lg p-3 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(fv.instruction) }} />
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
            <div className="bg-muted/50 rounded-lg p-3 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(fv.instruction) }} />
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

  // Test (eigenständig wie Quiz, nutzt aber eigenes Test-Format)
  if (['test'].some(n => catalogName.toLowerCase().includes(n))) {
    return (
      <div className="space-y-2">
        {fv.questions?.length > 0 ? (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fragen ({fv.questions.length})</p>
            <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm max-h-64 overflow-y-auto">
              {fv.questions.map((q, i) => {
                const answers = Array.isArray(q.answers) ? q.answers : (Array.isArray(q.options) ? q.options : []);
                return (
                  <div key={q.id || i} className="pb-2 border-b border-border/30 last:border-0 last:pb-0">
                    <p className="font-medium">{i + 1}. {q.question}</p>
                    <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                      {q.type === 'true_false' ? (
                        <div className="text-green-600 font-medium">✓ {q.correctAnswer ? 'Richtig' : 'Falsch'}</div>
                      ) : (q.type === 'solution_word' || q.type === 'text') ? (
                        <div className="text-green-600 font-medium">✓ {q.expectedAnswer}</div>
                      ) : (
                        answers.map((ans, ai) => (
                          <div key={ai} className={ans.isCorrect || ans.correct ? 'text-green-600 font-medium' : ''}>
                            {(ans.isCorrect || ans.correct) && '✓ '}{ans.text}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
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

  // Bildbeschriftung
  if (isImageLabeling(catalogName)) {
    const hasContent = fv.backgroundImage || fv.aufgabenstellung || (fv.dropZones?.length > 0);
    return hasContent
      ? <ImageLabelingEditor initialData={fv} readOnly onSave={() => {}} onCancel={() => {}} />
      : <p className="text-sm text-muted-foreground italic">Noch kein Inhalt vorhanden.</p>;
  }

  // KI-Tutor
  if (catalogName.toLowerCase().includes('ki-tutor')) {
    return (
      <div className="space-y-3">
        {fv.aufgabenstellung && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aufgabenstellung</p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(fv.aufgabenstellung) }} />
          </div>
        )}
        {fv.erwartungshorizont && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Musterlösung</p>
            <div className="bg-muted/30 rounded-lg p-3 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: sanitizeHtml(fv.erwartungshorizont) }} />
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
        ? <div className="bg-muted/50 rounded-lg p-3 text-sm" dangerouslySetInnerHTML={{ __html: sanitizeHtml(fv.task_description) }} />
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
  
  // 1. ZUERST auf Test prüfen
  const isTest = ['test'].some(n => catalogName.toLowerCase().includes(n));
  
  // 2. Quiz darf NUR true sein, wenn es KEIN Test ist
  const isQuiz = !isTest && ['miniquiz', 'mini-quiz', 'quiz'].some(n => catalogName.toLowerCase().includes(n));
  
  const isLuecke = isLueckentext(catalogName);
  const matchTerms = isMatch(catalogName);
  const isMCType = isMC(catalogName);
  const isKITutorType = isKITutor(catalogName);
  const isImageLabelingType = isImageLabeling(catalogName);
  const isSort = isSorting(catalogName);
  const isOffeneType = isOffeneAufgabe(catalogName);

  const isSupportedType = isLuecke || isSort || matchTerms || isQuiz || isMCType || isKITutorType || isImageLabelingType || isTest || isOffeneType;

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
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [offeneAufgabeModalOpen, setOffeneAufgabeModalOpen] = useState(false);
  const [lueckentextPreviewOpen, setLueckentextPreviewOpen] = useState(false);
  const [kiTutorPreviewOpen, setKiTutorPreviewOpen] = useState(false);
  const [testPreviewOpen, setTestPreviewOpen] = useState(false);
  const [matchTermsPreviewOpen, setMatchTermsPreviewOpen] = useState(false);
  const [sortingPreviewOpen, setSortingPreviewOpen] = useState(false);
  const [quizPreviewOpen, setQuizPreviewOpen] = useState(false);
  const [fieldValues, setFieldValues] = useState(master.field_values || {});
  const [localContentStatus, setLocalContentStatus] = useState(master.content_status || 'draft');
  const [localReleasedAt, setLocalReleasedAt] = useState(master.released_at || null);
  const [localReleasedBy, setLocalReleasedBy] = useState(master.released_by || null);

  // Klon-Bearbeitung
  const [editingKlonId, setEditingKlonId] = useState(null);
  const [klonFieldValues, setKlonFieldValues] = useState({});

  // Re-Hydration: fieldValues immer aktualisieren wenn master sich ändert
  useEffect(() => {
    setFieldValues(master.field_values || {});
    setLocalContentStatus(master.content_status || 'draft');
    setLocalReleasedAt(master.released_at || null);
    setLocalReleasedBy(master.released_by || null);
  }, [master.field_values, master.content_status, master.released_at, master.released_by]);

  // Vollständigkeit der MasterAufgabe berechnen (Frontend-Spiegelung der Backend-Logik)
  const computeMasterIsComplete = (fv = {}) => {
    const name = catalogName.toLowerCase();
    if (name.includes('lückentext') || name.includes('lueckentext') || name.includes('cloze')) {
      const lt = fv.lueckentext;
      if (!lt) return false;
      if (typeof lt === 'object' && lt.text) {
        const gaps = Array.isArray(lt.gaps) ? lt.gaps : [];
        return String(lt.text).trim() !== '' && gaps.filter(g => g && g.correct && String(g.correct).trim() !== '').length >= 1;
      }
      if (typeof lt === 'string') return lt.trim().length > 10 && /\[[^\]]+\]/.test(lt);
      return false;
    }
    if (name.includes('begriffe zuordnen') || name.includes('zuordnen') || name.includes('match')) {
      const pairs = Array.isArray(fv.pairs) ? fv.pairs : [];
      return pairs.filter(p => p && String(p.left || '').trim() && String(p.right || '').trim()).length >= 3;
    }
    if (name.includes('reihenfolge') || name.includes('sortierung') || name.includes('sorting')) {
      const items = Array.isArray(fv.orderedItems) ? fv.orderedItems : [];
      return items.filter(i => String(i || '').trim() !== '').length >= 2;
    }
    if (name === 'test' || name.includes('abschlusstest')) {
      const questions = Array.isArray(fv.questions) ? fv.questions : [];
      return questions.some((q) => {
        if (!q || String(q.question || '').trim() === '') return false;
        if (q.type === 'solution_word' || q.type === 'text') return String(q.expectedAnswer || '').trim() !== '';
        if (q.type === 'true_false') return typeof q.correctAnswer === 'boolean';
        const answers = Array.isArray(q.answers) ? q.answers : (Array.isArray(q.options) ? q.options : []);
        return answers.some((a) => (a?.isCorrect === true || a?.correct === true) && String(a.text || '').trim() !== '');
      });
    }
    if (name.includes('quiz')) {
      return (Array.isArray(fv.questions) ? fv.questions : []).length >= 1;
    }
    if (name.includes('bildbeschriftung') || name.includes('image labeling')) {
      return !!(fv.backgroundImage && Array.isArray(fv.dropZones) && fv.dropZones.length >= 1);
    }
    if (name.includes('ki-tutor')) {
      return !!(fv.aufgabenstellung && String(fv.aufgabenstellung).trim() !== '');
    }
    return Object.values(fv).some(v => {
      if (!v) return false;
      if (typeof v === 'string') return v.trim() !== '';
      if (Array.isArray(v)) return v.length > 0;
      return true;
    });
  };

  const saveMutation = useMutation({
    mutationFn: (fv) => {
      const isComplete = computeMasterIsComplete(fv);
      return base44.entities.MasterAufgabe.update(master.id, { field_values: fv, is_complete: isComplete });
    },
    onSuccess: async (_, fv) => {
      // syncMasterStatusNow ruft eine Backend-Touch-Funktion auf und kann
      // fehlschlagen. Wirft sie hier (unverpackt), bricht react-query die
      // Callback-Kette ab und die per-Call-onSuccess (mit handleCloseModal)
      // laeuft nie -> der Dialog bleibt offen, obwohl gespeichert wurde.
      try {
        await syncMasterStatusNow({ queryClient, master, fieldValues: fv });
      } catch (err) {
        console.warn('[MasterDetailView] syncMasterStatusNow failed:', err?.message);
      }
      toast.success('Masteraufgabe gespeichert.');
    },
    onError: (err) => toast.error(getFriendlyErrorMessage(err)),
  });

  const handleOpenKlonModal = async () => {
    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    if (!ok) return;
    onEditModeChange?.(true);
    setKlonModalOpen(true);
  };

  const handleCloseKlonModal = async () => {
    setKlonModalOpen(false);
    await releaseLock();
    onEditModeChange?.(false);
  };

  const handleEdit = async () => {
    if (!isSupportedType) return;

    // Vor dem Öffnen immer die aktuell gespeicherten Master-Daten ins Modal geben.
    // Sonst kann ein leerer lokaler Zwischenstand angezeigt werden, obwohl Daten gespeichert sind.
    setFieldValues(master.field_values || {});
    setLocalContentStatus(master.content_status || 'draft');
    setLocalReleasedAt(master.released_at || null);
    setLocalReleasedBy(master.released_by || null);

    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    
    if (!ok) return;
    onEditModeChange?.(true);
    
    if (isLuecke) setLueckeModalOpen(true);
    else if (isSort) setSortingModalOpen(true);
    else if (isTest) setTestModalOpen(true);
    else if (isQuiz) setQuizModalOpen(true);
    else if (isMCType) setMcModalOpen(true);
    else if (matchTerms) setMatchModalOpen(true);
    else if (isImageLabelingType) setImageLabelingModalOpen(true);
    else if (isKITutorType) setKiTutorModalOpen(true);
    else if (isOffeneType) setOffeneAufgabeModalOpen(true);
  };

  const handleCloseModal = async () => {
    setLueckeModalOpen(false);
    setSortingModalOpen(false);
    setMatchModalOpen(false);
    setQuizModalOpen(false);
    setMcModalOpen(false);
    setKiTutorModalOpen(false);
    setImageLabelingModalOpen(false);
    setTestModalOpen(false);
    setOffeneAufgabeModalOpen(false);
    setEditingKlonId(null);
    setKlonFieldValues({});
    
    await releaseLock();
    onEditModeChange?.(false);
  };

  const handleEditKopie = async (klon) => {
    if (!isSupportedType) return;
    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    if (!ok) return;
    onEditModeChange?.(true);
    // Lade Klon-Daten: Klone speichern ihre Daten in aufgabentext_inhalt (JSON-String)
    let parsed = {};
    try {
      parsed = typeof klon.aufgabentext_inhalt === 'string'
        ? JSON.parse(klon.aufgabentext_inhalt)
        : klon.aufgabentext_inhalt || {};
    } catch { parsed = {}; }
    setEditingKlonId(klon.id);
    setKlonFieldValues(parsed);
    if (isLuecke) setLueckeModalOpen(true);
    else if (isSort) setSortingModalOpen(true);
    else if (matchTerms) setMatchModalOpen(true);
    else if (isTest) setTestModalOpen(true);
    else if (isQuiz) setQuizModalOpen(true);
    else if (isMCType) setMcModalOpen(true);
    else if (isImageLabelingType) setImageLabelingModalOpen(true);
    else if (isKITutorType) setKiTutorModalOpen(true);
    else if (isOffeneType) setOffeneAufgabeModalOpen(true);
    };

  const saveKlonMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Aufgabenbausteine.update(id, {
      aufgabentext_inhalt: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      toast.success('Kopie gespeichert.');
    },
    onError: (err) => toast.error(getFriendlyErrorMessage(err)),
  });

  const masterReleaseMutation = useMutation({
    mutationFn: (release) => base44.functions.invoke('approveMasterAufgabe', {
      masterId: master.id,
      action: release ? 'approve' : 'unapprove',
    }),
    onMutate: (release) => {
      const previousStatus = localContentStatus;
      const previousReleasedAt = localReleasedAt;
      const previousReleasedBy = localReleasedBy;
      const nextStatus = release ? 'approved' : 'draft';
      setLocalContentStatus(nextStatus);
      setLocalReleasedAt(release ? new Date().toISOString() : null);
      setLocalReleasedBy(release ? userEmail : null);
      return { previousStatus, previousReleasedAt, previousReleasedBy };
    },
    onSuccess: (response, release) => {
      const nextStatus = response?.data?.newContentStatus || (release ? 'approved' : 'draft');
      setLocalContentStatus(nextStatus);
      setLocalReleasedAt(nextStatus === 'approved' ? new Date().toISOString() : null);
      setLocalReleasedBy(nextStatus === 'approved' ? userEmail : null);
      refreshWorkspaceStatusQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      toast.success('Freigabe aktualisiert.');
    },
    onError: (err, _release, context) => {
      if (context) {
        setLocalContentStatus(context.previousStatus);
        setLocalReleasedAt(context.previousReleasedAt);
        setLocalReleasedBy(context.previousReleasedBy);
      }
      toast.error(getFriendlyErrorMessage(err));
    },
  });

  const handleDelete = async () => {
    // Bisher schluckte diese Funktion stillschweigend alle Fehler — wenn
    // RLS, Lock-Check oder die Aggregat-Automation den Delete blockierten,
    // sah der User nichts. Daher jetzt mit Try/Catch + Toast.
    try {
      // Klone zuerst (referenzieren den Master).
      const klonResults = await Promise.allSettled(
        klone.map((k) => base44.entities.Aufgabenbausteine.delete(k.id))
      );
      const klonFailed = klonResults.filter((r) => r.status === 'rejected');
      if (klonFailed.length > 0) {
        const reason = klonFailed[0].reason?.message || 'unbekannt';
        throw new Error(`${klonFailed.length} Kopie(n) konnten nicht gelöscht werden: ${reason}`);
      }
      await base44.entities.MasterAufgabe.delete(master.id);
      refreshWorkspaceStatusQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      queryClient.invalidateQueries({ queryKey: ['aufgabenbausteine'] });
      toast.success('Masteraufgabe gelöscht.');
      await releaseLock();
      onEditModeChange?.(false);
      onDeleted?.();
    } catch (err) {
      toast.error('Löschen fehlgeschlagen: ' + (err?.message || 'unbekannt'));
    }
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
              {localContentStatus === 'approved' ? (
                <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300 gap-1">
                  <Lock className="w-3 h-3" /> Freigegeben
                </Badge>
              ) : computeMasterIsComplete(fieldValues) ? (
                <Badge className="text-[10px] bg-green-100 text-green-700 border-green-300">
                  Vollständig
                </Badge>
              ) : (
                <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-300">
                  Unvollständig
                </Badge>
              )}
              {klone.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">{klone.length} Kopie{klone.length !== 1 ? 'n' : ''}</Badge>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ── Action-Reihe: Vorschau + Inhalt bearbeiten (unter der Infobox) ── */}
      {(kannBearbeiten || (isLuecke && fieldValues.lueckentext)) && (
        <div className="flex justify-end gap-2">
          {isLuecke && fieldValues.lueckentext && (
            <Button
              variant="outline"
              onClick={() => setLueckentextPreviewOpen(true)}
              className="gap-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
              title="So bearbeiten Schüler:innen diese Aufgabe"
            >
              <Eye className="w-4 h-4" /> Vorschau
            </Button>
          )}
          {isKITutorType && fieldValues.aufgabenstellung && (
            <Button
              variant="outline"
              onClick={() => setKiTutorPreviewOpen(true)}
              className="gap-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
              title="So sieht der Schüler diese KI-Tutor-Aufgabe"
            >
              <Eye className="w-4 h-4" /> Vorschau
            </Button>
          )}
          {isTest && Array.isArray(fieldValues.questions) && fieldValues.questions.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setTestPreviewOpen(true)}
              className="gap-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
              title="So sieht der Schüler diesen Test"
            >
              <Eye className="w-4 h-4" /> Vorschau
            </Button>
          )}
          {matchTerms && Array.isArray(fieldValues.pairs) && fieldValues.pairs.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setMatchTermsPreviewOpen(true)}
              className="gap-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
              title="So bearbeitet der Schüler diese Zuordnungs-Aufgabe"
            >
              <Eye className="w-4 h-4" /> Vorschau
            </Button>
          )}
          {isSort && Array.isArray(fieldValues.orderedItems) && fieldValues.orderedItems.length >= 2 && (
            <Button
              variant="outline"
              onClick={() => setSortingPreviewOpen(true)}
              className="gap-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
              title="So bearbeitet der Schüler diese Sortier-Aufgabe"
            >
              <Eye className="w-4 h-4" /> Vorschau
            </Button>
          )}
          {isQuiz && Array.isArray(fieldValues.questions) && fieldValues.questions.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setQuizPreviewOpen(true)}
              className="gap-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
              title="So bearbeitet der Schüler dieses Mini-Quiz"
            >
              <Eye className="w-4 h-4" /> Vorschau
            </Button>
          )}
          {kannBearbeiten && isSupportedType && (
            <Button
              onClick={handleEdit}
              disabled={acquiringLock}
              className="gap-2"
            >
              {acquiringLock
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Sperren…</>
                : <><Pencil className="w-4 h-4" /> Inhalt bearbeiten</>}
            </Button>
          )}
        </div>
      )}



      {/* ── Aufgabentext aus Aktivität ── */}
      {master.field_values?.aufgabentext && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Aufgabenstellung</p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-900" dangerouslySetInnerHTML={{ __html: sanitizeHtml(master.field_values.aufgabentext) }} />
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
          onClick={handleOpenKlonModal}
          disabled={acquiringLock}
          className="gap-2 w-full bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold"
          variant="ghost"
          size="default"
        >
          {acquiringLock ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Kopien / KI-Klone erstellen
        </Button>
      )}

      {/* ── Klone-Liste mit Bearbeiten-Buttons ── */}
      {klone.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Kopien ({klone.length})
          </p>
          {klone.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium text-green-900">Kopie {k.klon_index}</span>
                {k.content_status && (
                  <Badge className={`text-[10px] ${resolveStatus(k).bgColor} ${resolveStatus(k).color} border-current`}>
                    {resolveStatus(k).icon} {resolveStatus(k).label}
                  </Badge>
                )}
              </div>
              {kannBearbeiten && isSupportedType && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleEditKopie(k)}
                  disabled={acquiringLock}
                  className="h-7 text-xs text-green-700 hover:text-green-800 hover:bg-green-100 gap-1 shrink-0"
                >
                  {acquiringLock
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Pencil className="w-3 h-3" />}
                  Kopie bearbeiten
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Helper: Aktuelle initialData für Modals (Master oder Klon) */}
      {(() => {
        const activeData = editingKlonId
          ? klonFieldValues
          : { ...(master.field_values || {}), ...fieldValues, content_status: localContentStatus };
        const isSavingAny = saveMutation.isPending || saveKlonMutation.isPending;

        const masterIsReleased = !editingKlonId && localContentStatus === 'approved';
        const canReleaseMaster = computeMasterIsComplete(fieldValues);
        const testReleaseFooter = !editingKlonId && isTest ? (
          <ReleaseToggleSection
            isReleased={localContentStatus === 'approved'}
            canRelease={canReleaseMaster}
            hierarchyLocked={false}
            hierarchyLockMessage={null}
            onToggle={(next) => masterReleaseMutation.mutate(next)}
            disabled={isSavingAny || masterReleaseMutation.isPending}
            releasedAt={localReleasedAt}
            releasedBy={localReleasedBy}
          />
        ) : null;

        const handleModalSave = (newData) => {
          const { content_status, ...fvData } = newData;
          if (editingKlonId) {
            // Klon speichern
            const updatedKlonFv = { ...klonFieldValues, ...fvData };
            setKlonFieldValues(updatedKlonFv);
            saveKlonMutation.mutate({ id: editingKlonId, data: updatedKlonFv }, {
              onSuccess: () => handleCloseModal(),
            });
          } else {
            // Master speichern
            const updatedFv = { ...fieldValues, ...fvData };
            setFieldValues(updatedFv);
            saveMutation.mutate(updatedFv, {
              onSuccess: async () => {
                // Freigabe-Status nur dann anfassen, wenn er sich wirklich
                // geaendert hat. Ein unnoetiger approve/unapprove-Call (z. B.
                // bei einem Entwurf, der Entwurf bleibt) konnte fehlschlagen
                // und verhinderte dann das Schliessen des Dialogs.
                if (content_status && content_status !== localContentStatus) {
                  try {
                    await base44.functions.invoke('approveMasterAufgabe', {
                      masterId: master.id,
                      action: content_status === 'approved' ? 'approve' : 'unapprove',
                    });
                  } catch (err) {
                    toast.error(getFriendlyErrorMessage(err));
                  }
                }
                try {
                  await syncMasterStatusNow({ queryClient, master, fieldValues: updatedFv });
                } catch (err) {
                  console.warn('[MasterDetailView] syncMasterStatusNow failed:', err?.message);
                }
                handleCloseModal();
              },
            });
          }
        };

        return (
          <>
            {/* ── Lückentext-Modal ── */}
            {isLuecke && (
              <LueckentextWysiwygModal
                open={lueckeModalOpen}
                onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
                initialData={activeData}
                isSaving={isSavingAny}
                isCopy={!!editingKlonId}
                readOnly={masterIsReleased}
                onSave={(newData) => {
                  const { content_status, ...fvData } = newData;
                  if (editingKlonId) {
                    const updatedKlonFv = { ...klonFieldValues, ...fvData };
                    setKlonFieldValues(updatedKlonFv);
                    saveKlonMutation.mutate({ id: editingKlonId, data: updatedKlonFv }, {
                      onSuccess: () => handleCloseModal(),
                    });
                  } else {
                    const newFv = { ...fieldValues, ...fvData };
                    setFieldValues(newFv);
                    saveMutation.mutate(newFv, {
                      onSuccess: async () => {
                        if (content_status) {
                          await base44.functions.invoke('approveMasterAufgabe', {
                            masterId: master.id,
                            action: content_status === 'approved' ? 'approve' : 'unapprove',
                          });
                        }
                        await syncMasterStatusNow({ queryClient, master, fieldValues: newFv });
                        handleCloseModal();
                      },
                    });
                  }
                }}
                onDelete={editingKlonId || masterIsReleased ? undefined : handleDelete}
              />
            )}

            {/* ── Sortierung-Modal ── */}
            {isSort && (
              <SortingListModal
                open={sortingModalOpen}
                onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
                initialData={activeData}
                isSaving={isSavingAny}
                onDelete={editingKlonId ? undefined : handleDelete}
                onSave={handleModalSave}
                onCancel={handleCloseModal}
              />
            )}

            {/* ── Match Terms-Modal ── */}
            {matchTerms && (
              <MatchTermsModal
                open={matchModalOpen}
                onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
                initialData={activeData}
                isSaving={isSavingAny}
                onDelete={editingKlonId ? undefined : handleDelete}
                onSave={handleModalSave}
                onCancel={handleCloseModal}
              />
            )}

            {/* ── Mini-Quiz-Modal (Nur wenn es WIRKLICH ein Quiz ist) ── */}
             {isQuiz && (
               <MiniQuizModalDetail
                 open={quizModalOpen}
                 onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
                 initialData={activeData}
                 isSaving={isSavingAny}
                 onDelete={editingKlonId ? undefined : handleDelete}
                 onSave={handleModalSave}
                 onCancel={handleCloseModal}
               />
             )}

             {/* ── Multiple Choice-Modal ── */}
             {isMCType && (
               <MultipleChoiceModalDetail
                 open={mcModalOpen}
                 onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
                 initialData={activeData}
                 isSaving={isSavingAny}
                 onDelete={editingKlonId ? undefined : handleDelete}
                 onSave={handleModalSave}
                 onCancel={handleCloseModal}
               />
             )}

             {/* ── KI-Tutor-Modal ── */}
             {isKITutorType && (
               <KITutorModalDetail
                 open={kiTutorModalOpen}
                 onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
                 initialData={activeData}
                 isSaving={isSavingAny}
                 master={master}
                 onDelete={editingKlonId ? undefined : handleDelete}
                 onSave={handleModalSave}
                 onCancel={handleCloseModal}
               />
             )}

             {/* ── Bildbeschriftung-Modal ── */}
              {isImageLabelingType && (
                <ImageLabelingModalDetail
                  open={imageLabelingModalOpen}
                  onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
                  initialData={activeData}
                  isSaving={isSavingAny}
                  onDelete={editingKlonId ? undefined : handleDelete}
                  onSave={handleModalSave}
                  onCancel={handleCloseModal}
                  trackingContext={editingKlonId
                    ? {
                        sourceEntity: 'Aufgabenbausteine',
                        sourceRecordId: editingKlonId,
                        lernpaketId: master?.lernpaket_id,
                      }
                    : {
                        sourceEntity: 'MasterAufgabe',
                        sourceRecordId: master?.id,
                        lernpaketId: master?.lernpaket_id,
                      }}
                />
              )}

              {/* ── Test-Modal ── */}
              {isTest && (
                <TestModal
                  open={testModalOpen}
                  onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
                  initialData={activeData}
                  isSaving={isSavingAny}
                  footerExtra={testReleaseFooter}
                  readOnly={masterIsReleased}
                  lockedMessage="Diese Masteraufgabe ist freigegeben und kann nicht bearbeitet werden. Hebe die Freigabe unten auf, um Änderungen vorzunehmen."
                  onDelete={editingKlonId ? undefined : handleDelete}
                  onSave={handleModalSave}
                  onCancel={handleCloseModal}
                />
              )}

              {/* ── Offene Aufgabe-Modal ── */}
              {isOffeneType && (
                <OffeneAufgabeModal
                  open={offeneAufgabeModalOpen}
                  onOpenChange={(isOpen) => { if (!isOpen) handleCloseModal(); }}
                  initialData={activeData}
                  isSaving={isSavingAny}
                  onDelete={editingKlonId ? undefined : handleDelete}
                  onSave={handleModalSave}
                  onCancel={handleCloseModal}
                />
              )}
            </>
            );
            })()}

      {/* ── Schüler-Vorschau Modal (KI-Tutor) ── */}
      {isKITutorType && (
        <KITutorPreviewModal
          open={kiTutorPreviewOpen}
          onOpenChange={setKiTutorPreviewOpen}
          activityRecord={{ field_values: { aufgabentext: master?.field_values?.aufgabentext || '' }, phase: master?.phase }}
          master={master}
          catalogName={catalogName}
          phase={master?.phase}
        />
      )}

      {/* ── Schüler-Vorschau Modal (Lückentext) ── */}
      {isLuecke && (
        <LueckentextPreviewModal
          open={lueckentextPreviewOpen}
          onOpenChange={setLueckentextPreviewOpen}
          fieldValues={fieldValues}
          catalogName={catalogName}
          phase={master?.phase}
        />
      )}

      {/* ── Schüler-Vorschau Modal (Test) ── */}
      {isTest && (
        <TestPreviewModal
          open={testPreviewOpen}
          onOpenChange={setTestPreviewOpen}
          fieldValues={fieldValues}
          catalogName={catalogName}
          phase={master?.phase || 'Abschluss'}
        />
      )}

      {/* ── Schüler-Vorschau Modal (Begriffe zuordnen) ── */}
      {matchTerms && (
        <MatchTermsPreviewModal
          open={matchTermsPreviewOpen}
          onOpenChange={setMatchTermsPreviewOpen}
          fieldValues={fieldValues}
          catalogName={catalogName}
          phase={master?.phase || 'Übung'}
        />
      )}

      {/* ── Schüler-Vorschau Modal (Reihenfolge / Sortierung) ── */}
      {isSort && (
        <SortingListPreviewModal
          open={sortingPreviewOpen}
          onOpenChange={setSortingPreviewOpen}
          fieldValues={fieldValues}
          catalogName={catalogName}
          phase={master?.phase || 'Übung'}
        />
      )}

      {/* ── Schüler-Vorschau Modal (Mini-Quiz) ── */}
      {isQuiz && (
        <MiniQuizPreviewModal
          open={quizPreviewOpen}
          onOpenChange={setQuizPreviewOpen}
          fieldValues={fieldValues}
          catalogName={catalogName}
          phase={master?.phase || 'Übung'}
        />
      )}

      {/* ── Klon-Modal ── */}
      <KlonErstellenModal
        open={klonModalOpen}
        onClose={handleCloseKlonModal}
        master={master}
        klone={klone}
        onKlonesCreated={() => {
          queryClient.invalidateQueries({ queryKey: ['klone'] });
          queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
          handleCloseKlonModal();
        }}
      />
    </div>
  );
}