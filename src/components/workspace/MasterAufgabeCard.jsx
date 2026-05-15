/**
 * MasterAufgabeCard.jsx
 *
 * Eine einzelne Masteraufgaben-Karte innerhalb einer Aktivität.
 * Enthält: Titel-Editor, MatchTermsForm/ActivityDetailView, KlonGenerator, Löschen-Button.
 */

import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Crown, Trash2, Sparkles, Loader2, ChevronDown, ChevronUp, CheckCircle2, RotateCw, ChevronRight, Lock } from 'lucide-react';
import KlonErstellenModal from '@/components/workspace/KlonErstellenModal';
import LockBanner from '@/components/workspace/LockBanner';
import MatchTermsModal from '@/components/workspace/MatchTermsModal';
import LueckentextEditor, { LueckentextRenderer, validateBeforeSave } from '@/components/workspace/LueckentextEditor';
import LueckentextWysiwygModal from '@/components/workspace/LueckentextWysiwygModal';
import ImageLabelingEditor from '@/components/workspace/ImageLabelingEditor';
import SortingListEditor from '@/components/workspace/SortingListEditor';
import SortingListModal from '@/components/workspace/SortingListModal';
import MiniQuizEditor from '@/components/workspace/MiniQuizEditor';
import KITutorMasterForm from '@/components/workspace/KITutorMasterForm';
import MiniQuizModal from '@/components/workspace/MiniQuizModal';
import TestModal from '@/components/workspace/TestModal';
import { isLockExpired } from '@/hooks/useActivityLock';
import { useLernpaketLock } from '@/hooks/useLocks';
import { useSyncStatus, TASK_SYNC_STATUS } from '@/hooks/useSyncStatus';
import { TASK_STATUS_CONFIG } from '@/lib/stateMachine';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function isLockedByOther(master, myEmail) {
  if (!master?.lock_status) return false;
  if (master.locked_by_user === myEmail) return false;
  if (isLockExpired(master.locked_at)) return false;
  return true;
}

const MATCH_TERMS_NAMES = ['begriffe zuordnen', 'zuordnen', 'zuordnung', 'match terms'];
const LUECKENTEXT_NAMES = ['lückentext', 'lücken', 'lueckentext', 'cloze', 'fill in'];
const IMAGE_LABELING_NAMES = ['bildbeschriftung', 'bildbeschreibung', 'image labeling'];
const SORTING_NAMES = ['reihenfolge', 'sortierung', 'sequenzierung', 'sorting', 'sequence'];
const MINIQUIZ_NAMES = ['miniquiz', 'mini-quiz', 'quiz', 'quizze'];
const TEST_NAMES = ['test', 'abschlusstest'];

function getActivityType(name = '') {
  const lowerName = name.toLowerCase();
  if (MATCH_TERMS_NAMES.some(n => lowerName.includes(n))) return 'match';
  if (LUECKENTEXT_NAMES.some(n => lowerName.includes(n))) return 'lueckentext';
  if (IMAGE_LABELING_NAMES.some(n => lowerName.includes(n))) return 'imagelabeling';
  if (SORTING_NAMES.some(n => lowerName.includes(n))) return 'sorting';
  if (TEST_NAMES.some(n => lowerName === n || lowerName.includes(n))) return 'test';
  if (MINIQUIZ_NAMES.some(n => lowerName.includes(n))) return 'miniquiz';
  if (lowerName.includes('ki-tutor')) return 'kitutor';
  return null;
}

function isMatchTerms(name = '') {
  return MATCH_TERMS_NAMES.some(n => name.toLowerCase().includes(n));
}
function isLueckentext(name = '') {
  return LUECKENTEXT_NAMES.some(n => name.toLowerCase().includes(n));
}
function isImageLabelingType(name = '') {
  return IMAGE_LABELING_NAMES.some(n => name.toLowerCase().includes(n));
}
function isSorting(name = '') {
  return SORTING_NAMES.some(n => name.toLowerCase().includes(n));
}
function isMiniQuiz(name = '') {
  return MINIQUIZ_NAMES.some(n => name.toLowerCase().includes(n));
}
function isTest(name = '') {
  const lower = name.toLowerCase();
  return TEST_NAMES.some(n => lower === n || lower.includes(n));
}
function hasValidTestQuestion(fv = {}) {
  const questions = Array.isArray(fv.questions) ? fv.questions : [];
  return questions.some((q) => {
    if (!q || String(q.question || '').trim() === '') return false;
    if (q.type === 'text') return String(q.expectedAnswer || '').trim() !== '';
    const answers = Array.isArray(q.answers) ? q.answers : (Array.isArray(q.options) ? q.options : []);
    return answers.some((a) => (a?.isCorrect === true || a?.correct === true) && String(a.text || '').trim() !== '');
  });
}

// ── Master Approval Button ─────────────────────────────────────────────────────

function MasterApprovalButton({ master, queryClient, catalogName, fieldValues, setFieldValues }) {
  const [confirmDialog, setConfirmDialog] = React.useState(false);
  const [fillWithDefaults, setFillWithDefaults] = React.useState(false);
  
  const approveMutation = useMutation({
    mutationFn: async (action) => {
      // Validierung vor Approval
      const isQuiz = ['miniquiz', 'mini-quiz', 'quiz'].some(n => catalogName?.toLowerCase().includes(n));
      
      if (action === 'approve' && isQuiz && (!fieldValues.quizItems || fieldValues.quizItems.length === 0)) {
        // Zeige Dialog statt direkt zu speichern
        setConfirmDialog(true);
        return Promise.reject({ skipToast: true });
      }
      
      return base44.functions.invoke('approveMasterAufgabe', { masterId: master.id, action });
    },
    onSuccess: (_, action) => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
      toast.success(action === 'approve' ? '✓ Masteraufgabe freigegeben.' : 'Freigabe zurückgezogen.');
      setConfirmDialog(false);
    },
    onError: (err) => {
      if (!err.skipToast) {
        toast.error('Fehler: ' + (err.message || 'Unbekannter Fehler'));
      }
    },
  });

  const handleApproveWithDefaults = async () => {
    // Fülle mit Standarddaten wenn leer
    const isQuiz = ['miniquiz', 'mini-quiz', 'quiz'].some(n => catalogName?.toLowerCase().includes(n));
    
    if (isQuiz && (!fieldValues.quizItems || fieldValues.quizItems.length === 0)) {
      const defaultQuiz = {
        ...fieldValues,
        quizItems: [
          { question: 'Wie heißt die Hauptstadt von Italien?', correctAnswer: 'Rom' }
        ]
      };
      
      // Speichere die Standarddaten
      await base44.entities.MasterAufgabe.update(master.id, { field_values: defaultQuiz });
      setFieldValues(defaultQuiz);
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
    }
    
    // Approval durchführen
    approveMutation.mutate('approve');
  };

  const isApproved = master.content_status === 'approved';
  const isPending = approveMutation.isPending;

  if (isApproved) {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={() => approveMutation.mutate('unapprove')}
        disabled={isPending}
        className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50 text-xs h-7"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCw className="w-3 h-3" />}
        Freigabe zurückziehen
      </Button>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => approveMutation.mutate('approve')}
        disabled={isPending}
        className="gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs h-7"
      >
        {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
        Freigeben
      </Button>

      {/* Validierungs-Dialog für leere Mini-Quiz */}
      <AlertDialog open={confirmDialog} onOpenChange={setConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Mini-Quiz ist leer</AlertDialogTitle>
            <AlertDialogDescription>
              Es wurden noch keine Fragen hinzugefügt. Sollen die Felder mit einer Standardfrage gefüllt werden?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            <p className="font-semibold mb-1">Standardfrage:</p>
            <p className="mb-2">Wie heißt die Hauptstadt von Italien?</p>
            <p className="font-semibold mb-1">Standardantwort:</p>
            <p>Rom</p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveWithDefaults}
              className="bg-green-600 hover:bg-green-700"
            >
              Mit Standardfrage füllen & freigeben
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Haupt-Komponente ───────────────────────────────────────────────────────────

export default function MasterAufgabeCard({
  master,
  index,
  catalogName,
  klone,
  kannBearbeiten,
  userEmail,
  userRole,
  onDeleted,
  onKlonesCreated,
  onKlonSelected,
  onEditModeChange = null,
  autoExpand = false,
  autoOpenModal = false,
  onAutoOpenModalDone = null,
}) {
  const queryClient = useQueryClient();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  // State Machine für Moodle-Sync
  const syncStatus = useSyncStatus(
    master.id,
    master.sync_status || TASK_SYNC_STATUS.DRAFT,
    'MasterAufgabe',
    ['masterAufgaben']
  );

  // Neue Karte direkt im Bearbeitungsmodus öffnen
  const [editMode, setEditMode] = useState(autoExpand && kannBearbeiten);
  const [collapsed, setCollapsed] = useState(!autoExpand); // Bei autoExpand direkt aufgeklappt
  const [fieldValues, setFieldValues] = useState(master.field_values || {});
  const [titel, setTitel] = useState(master.titel || '');
  const [editingTitel, setEditingTitel] = useState(false);
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  const [klonModalOpen, setKlonModalOpen] = useState(false);
  const [lueckentextModalOpen, setLueckentextModalOpen] = useState(false);
  const [sortingListModalOpen, setSortingListModalOpen] = useState(false);
  const [miniQuizModalOpen, setMiniQuizModalOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [acquiringLock, setAcquiringLock] = useState(false);

  // Implizites Locking für Lückentext + Begriffe zuordnen (unabhängig vom globalen Bearbeitungsmodus)
  const isLuecke = isLueckentext(catalogName);
  const isMatchModal = isMatchTerms(catalogName);
  const isTestModal = isTest(catalogName);
  const { acquireLock, releaseLock } = useLernpaketLock((isLuecke || isMatchModal || isTestModal) ? master.lernpaket_id : null);

  const [matchTermsModalOpen, setMatchTermsModalOpen] = useState(false);

  const locked = isLockedByOther(master, userEmail);
  const activityType = getActivityType(catalogName);
  const isMatch = activityType === 'match';
  const isImageLabeling = activityType === 'imagelabeling';
  const isSort = activityType === 'sorting';
  const isKITutor = activityType === 'kitutor';
  const isTestType = activityType === 'test';
  const isQuiz = activityType === 'miniquiz';

  // Vollständigkeit der MasterAufgabe berechnen (Frontend-Spiegelung der Backend-Logik)
  const computeIsComplete = (fv = {}) => {
    const name = (catalogName || '').toLowerCase();
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
      return pairs.filter(p => p && String(p.left || '').trim() && String(p.right || '').trim()).length >= 1;
    }
    if (name.includes('reihenfolge') || name.includes('sortierung') || name.includes('sorting')) {
      return (Array.isArray(fv.orderedItems) ? fv.orderedItems : []).filter(i => String(i || '').trim() !== '').length >= 2;
    }
    if (name === 'test' || name.includes('abschlusstest')) {
      return hasValidTestQuestion(fv);
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
    mutationFn: ({ fv, closeEdit }) => {
      const newSyncStatus = syncStatus.getSyncStatusForSave();
      const isComplete = computeIsComplete(fv);
      return base44.entities.MasterAufgabe.update(master.id, {
        field_values: fv,
        titel,
        sync_status: newSyncStatus,
        is_complete: isComplete,
      });
    },
    onSuccess: (_, { closeEdit }) => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      setHasPendingChanges(false);
      if (closeEdit) {
        setEditMode(false);
        setCollapsed(true);
      }
      // Guardian läuft async — verzögert Activity + Lernpaket aktualisieren
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
        queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      }, 1500);
      toast.success('Masteraufgabe gespeichert.');
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Speichern.'),
  });

  const applyMasterReleaseStatus = async (contentStatus) => {
    if (!contentStatus) return;
    await base44.functions.invoke('approveMasterAufgabe', {
      masterId: master.id,
      action: contentStatus === 'approved' ? 'approve' : 'unapprove',
    });
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
    queryClient.invalidateQueries({ queryKey: ['workspace'] });
  };

  // Speichern und Bearbeitung beenden (kein Zwischenspeichern mehr)
  const handleSaveAndClose = (fv) => {
    saveMutation.mutate({ fv: fv ?? fieldValues, closeEdit: true });
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      // Klone zuerst löschen
      for (const k of klone) await base44.entities.Aufgabenbausteine.delete(k.id);
      return base44.entities.MasterAufgabe.delete(master.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      queryClient.invalidateQueries({ queryKey: ['klone'] });
      toast.success('Masteraufgabe gelöscht.');
      onDeleted?.();
      // Guardian läuft asynchron nach dem Delete — nach kurzer Verzögerung
      // Aktivitäts-Cache invalidieren damit Sidebar den neuen is_complete=false Wert zeigt.
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
        queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      }, 1500);
    },
  });

  const saveTitel = async () => {
    // Kein Titel-Update wenn freigegeben
    if (master.content_status === 'approved') {
      toast.error('Freigabe zuerst aufheben um den Titel zu bearbeiten.');
      setEditingTitel(false);
      setTitel(master.titel || '');
      return;
    }
    await base44.entities.MasterAufgabe.update(master.id, { titel });
    queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
    setEditingTitel(false);
  };

  // Implizites Locking: Lock erwerben → Modal öffnen → bei Schließen freigeben
  // Wenn kannBearbeiten=true, ist der Lock bereits aktiv (vom Panel gehalten) → direkt öffnen
  const handleEditLueckentext = async () => {
    if (kannBearbeiten) {
      // Lock bereits vom Panel gehalten – direkt öffnen
      onEditModeChange?.(true);
      setLueckentextModalOpen(true);
      return;
    }
    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    if (!ok) return;
    onEditModeChange?.(true);
    setLueckentextModalOpen(true);
  };

  const handleCloseLueckentextModal = () => {
    setLueckentextModalOpen(false);
    releaseLock();
    onEditModeChange?.(false);
  };

  const handleEditSortierung = async () => {
    if (kannBearbeiten) {
      // Lock bereits vom Panel gehalten – direkt öffnen
      onEditModeChange?.(true);
      setSortingListModalOpen(true);
      return;
    }
    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    if (!ok) return;
    onEditModeChange?.(true);
    setSortingListModalOpen(true);
  };

  const handleCloseSortierungModal = () => {
    setSortingListModalOpen(false);
    releaseLock();
    onEditModeChange?.(false);
  };

  const handleEditMatchTerms = async () => {
    if (kannBearbeiten) {
      onEditModeChange?.(true);
      setMatchTermsModalOpen(true);
      return;
    }
    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    if (!ok) return;
    onEditModeChange?.(true);
    setMatchTermsModalOpen(true);
  };

  const handleCloseMatchTermsModal = () => {
    setMatchTermsModalOpen(false);
    releaseLock();
    onEditModeChange?.(false);
  };

  // Auto-Modal öffnen nach Erstellung (Lock ist bereits vom Parent erworben)
  useEffect(() => {
    if (!autoOpenModal) return;
    // Erst aufklappen, dann mit kurzer Verzögerung Modal öffnen
    setCollapsed(false);
    const timer = setTimeout(() => {
      if (isLuecke) {
        // Lock bereits aktiv vom Parent – direkt öffnen, kein zweiter acquireLock
        onEditModeChange?.(true);
        setLueckentextModalOpen(true);
      } else if (isMatchModal) {
        onEditModeChange?.(true);
        setMatchTermsModalOpen(true);
      } else if (SORTING_NAMES.some(n => catalogName.toLowerCase().includes(n))) {
        onEditModeChange?.(true);
        setSortingListModalOpen(true);
      } else if (isTestModal) {
        onEditModeChange?.(true);
        setTestModalOpen(true);
      } else if (MINIQUIZ_NAMES.some(n => catalogName.toLowerCase().includes(n))) {
        setMiniQuizModalOpen(true);
      } else {
        setEditMode(true);
      }
      onAutoOpenModalDone?.();
    }, 200);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenModal]);

  // Zeige Klone wenn zugeklappt
  const showKloneWhenCollapsed = collapsed && klone.length > 0;

  return (
    <div className="space-y-0">
      <div className="rounded-xl border-2 border-primary bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/5 border-b border-primary/20">
        <Crown className="w-4 h-4 text-primary shrink-0" />
        <Badge variant="default" className="text-[11px] font-bold tracking-wide shrink-0">
          MASTER {index}
        </Badge>
        {TASK_STATUS_CONFIG[syncStatus.currentStatus] && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${TASK_STATUS_CONFIG[syncStatus.currentStatus].color}`}>
            {TASK_STATUS_CONFIG[syncStatus.currentStatus].label}
          </Badge>
        )}

        {/* Titel inline editierbar */}
        {editingTitel ? (
          <Input
            value={titel}
            onChange={e => setTitel(e.target.value)}
            onBlur={saveTitel}
            onKeyDown={e => e.key === 'Enter' && saveTitel()}
            className="h-6 text-xs flex-1 min-w-0"
            autoFocus
          />
        ) : (
          <button
            onClick={() => kannBearbeiten && setEditingTitel(true)}
            className={cn('flex-1 text-xs text-left truncate', kannBearbeiten ? 'text-muted-foreground hover:text-foreground cursor-text' : 'text-muted-foreground cursor-default')}
            title={kannBearbeiten ? 'Klicken zum Bearbeiten' : undefined}
          >
            {master.titel || ''}
          </button>
        )}

        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Freigabe-Badge wenn approved */}
          {master.content_status === 'approved' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-300 text-green-700 text-[11px] font-medium shrink-0">
              <Lock className="w-3 h-3" />
              Freigegeben
            </span>
          )}
          {/* Universal "Inhalt bearbeiten"-Button für alle Masteraufgaben-Typen */}
          {kannBearbeiten && !editMode && !locked && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                if (isLuecke) {
                  handleEditLueckentext();
                } else if (isMatch) {
                  handleEditMatchTerms();
                } else if (isSort) {
                  handleEditSortierung();
                } else if (isTestType) {
                  onEditModeChange?.(true);
                  setTestModalOpen(true);
                } else if (isQuiz) {
                  setMiniQuizModalOpen(true);
                } else {
                  setEditMode(true);
                }
              }}
              disabled={acquiringLock}
              className="gap-1.5 text-xs h-7 text-primary border-primary/30 hover:bg-primary/5"
              title="Inhalt dieser Masteraufgabe bearbeiten"
            >
              {acquiringLock
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Sperren…</>
                : <>Inhalt bearbeiten</>}
            </Button>
          )}
          {/* Fertig markieren / Zurücksetzen Button – nur im aktiven Bearbeitungsmodus */}
          {kannBearbeiten && editMode && (
            <MasterApprovalButton 
              master={master} 
              queryClient={queryClient}
              catalogName={catalogName}
              fieldValues={fieldValues}
              setFieldValues={setFieldValues}
            />
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="p-1 text-muted-foreground hover:text-foreground rounded"
            title={collapsed ? 'Aufklappen' : 'Einklappen'}
          >
            {collapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
          {kannBearbeiten && (
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={deleteMutation.isPending}
              className="p-1 text-muted-foreground hover:text-destructive rounded"
              title="Masteraufgabe löschen"
            >
              {deleteMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Trash2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div className="p-4 space-y-4">
          <LockBanner lockedByUser={locked ? master.locked_by_user : null} />



          {/* Formular */}
          {isMatch ? (
            /* ── Begriffe zuordnen: Modal-Flow (analog Lückentext) ── */
            <div className="space-y-3">
              {fieldValues.instruction && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Anweisung</p>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">{fieldValues.instruction}</div>
                </div>
              )}
              {fieldValues.pairs?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Begriffspaare ({fieldValues.pairs.length})
                  </p>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1.5">
                    {fieldValues.pairs.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 font-medium">{p.left}</span>
                        <span className="text-muted-foreground/40">→</span>
                        <span className="flex-1 text-muted-foreground">{p.right}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {fieldValues.distractors?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Distraktoren ({fieldValues.distractors.length})
                  </p>
                  <div className="bg-red-50/30 rounded-lg p-3 space-y-1 text-sm">
                    {fieldValues.distractors.map((d, i) => (
                      <div key={i} className="text-red-700/70 text-xs">× {typeof d === 'string' ? d : d?.value || d}</div>
                    ))}
                  </div>
                </div>
              )}
              {!fieldValues.pairs?.length && (
                <p className="text-sm text-muted-foreground italic">Noch kein Inhalt. Klicke „Inhalt bearbeiten".</p>
              )}
              {/* Button immer sichtbar – kein globaler Bearbeitungsmodus nötig */}
              {!locked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditMatchTerms}
                  disabled={acquiringLock}
                  className="gap-1.5"
                >
                  {acquiringLock ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sperren…</> : 'Inhalt bearbeiten'}
                </Button>
              )}
              <MatchTermsModal
                open={matchTermsModalOpen}
                onOpenChange={(isOpen) => { if (!isOpen) handleCloseMatchTermsModal(); }}
                initialData={{ ...fieldValues, content_status: master.content_status }}
                isSaving={saveMutation.isPending}
                exportLocked={false}
                onSave={(data) => {
                  const { content_status, ...fvData } = data;
                  const newFv = { ...fieldValues, ...fvData };
                  setFieldValues(newFv);
                  saveMutation.mutate({ fv: newFv, closeEdit: false }, {
                    onSuccess: async () => {
                      if (content_status) {
                        await applyMasterReleaseStatus(content_status);
                        queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                        queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
                      }
                      handleCloseMatchTermsModal();
                    },
                  });
                }}
                onDelete={async () => {
                  for (const k of klone) await base44.entities.Aufgabenbausteine.delete(k.id);
                  await base44.entities.MasterAufgabe.delete(master.id);
                  queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                  queryClient.invalidateQueries({ queryKey: ['klone'] });
                  await releaseLock();
                  onEditModeChange?.(false);
                  onDeleted?.();
                  setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
                    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
                  }, 1500);
                }}
                onCancel={handleCloseMatchTermsModal}
              />
            </div>
          ) : isImageLabeling ? (
            /* ── Bildbeschriftungs-Editor ── */
            <div className="space-y-3">
              {editMode ? (
                <>
                  <ImageLabelingEditor
                    initialData={fieldValues}
                    onSave={(data) => {
                      // Check completion: backgroundImage + mindestens 1 dropZone erforderlich
                      // Aufgabenstellung ist optional
                      const isComplete = !!(data.backgroundImage && data.dropZones?.length > 0);
                      const dataWithCompletion = { ...data, is_complete: isComplete };
                      setFieldValues(dataWithCompletion);
                      handleSaveAndClose(dataWithCompletion);
                    }}
                    onCancel={() => { setEditMode(false); setHasPendingChanges(false); }}
                    onChange={() => setHasPendingChanges(true)}
                  />
                </>
              ) : (
                <div className="space-y-3">
                  {fieldValues.aufgabenstellung && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aufgabenstellung</p>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm">{fieldValues.aufgabenstellung}</div>
                    </div>
                  )}
                  {fieldValues.backgroundImage && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Bild</p>
                      <img src={fieldValues.backgroundImage} alt="Hintergrundbild" className="max-w-full h-auto max-h-48 rounded-lg border border-border" />
                    </div>
                  )}
                  {fieldValues.dropZones?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Zielbegriffe ({fieldValues.dropZones.length})</p>
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                        {fieldValues.dropZones.map((zone, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <span>{zone.label}</span>
                            <span className="text-xs text-muted-foreground">{zone.x_percent?.toFixed(1)}% / {zone.y_percent?.toFixed(1)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {kannBearbeiten && !locked && (
                    <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
                      Inhalt bearbeiten
                    </Button>
                  )}
                  {!fieldValues.aufgabenstellung && !fieldValues.backgroundImage && (
                    <p className="text-sm text-muted-foreground italic">Noch kein Inhalt. Klicke „Inhalt bearbeiten".</p>
                  )}
                </div>
              )}
            </div>
          ) : isSort ? (
            /* ── Sortierungs-Editor (Modal mit Locking) ── */
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aufgabenstellung</p>
                {fieldValues.instruction ? (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm">{fieldValues.instruction}</div>
                ) : (
                  <p className="italic text-muted-foreground text-sm">Noch nicht ausgefüllt.</p>
                )}
              </div>
              {fieldValues.orderedItems?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sortierliste ({fieldValues.orderedItems.length})</p>
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                    {fieldValues.orderedItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-muted-foreground w-6">{i + 1}.</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {kannBearbeiten && !locked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSortingListModalOpen(true)}
                  className="gap-1.5"
                >
                  Inhalt bearbeiten
                </Button>
              )}
              {!fieldValues.instruction && !fieldValues.orderedItems?.length && (
                <p className="text-sm text-muted-foreground italic">Noch kein Inhalt. Klicke „Inhalt bearbeiten".</p>
              )}
              <SortingListModal
                open={sortingListModalOpen}
                onOpenChange={(isOpen) => {
                  if (!isOpen) handleCloseSortierungModal();
                }}
                initialData={{ ...fieldValues, content_status: master.content_status, moodle_sync_status: master.moodle_sync_status }}
                onSave={(data) => {
                  const { content_status, ...fvData } = data;
                  const newFv = { ...fieldValues, ...fvData };
                  setFieldValues(newFv);
                  saveMutation.mutate({ fv: newFv, closeEdit: false }, {
                    onSuccess: async () => {
                      if (content_status) {
                        await applyMasterReleaseStatus(content_status);
                        queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                        queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
                      }
                      handleCloseSortierungModal();
                    },
                  });
                }}
                onCancel={handleCloseSortierungModal}
                isSaving={saveMutation.isPending}
              />
            </div>
          ) : isKITutor ? (
            /* ── KI-Tutor-Editor ── */
            editMode ? (
              <KITutorMasterForm
                master={master}
                isInEditMode={true}
                userEmail={userEmail}
                einheitId={null}
                catalogEntry={{ name: 'KI-Tutor' }}
                onSaved={() => {
                  setEditMode(false);
                  setCollapsed(true);
                  queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                }}
              />
            ) : (
              <div className="space-y-3">
                {fieldValues.aufgabenstellung && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aufgabenstellung</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">{fieldValues.aufgabenstellung}</div>
                  </div>
                )}
                {fieldValues.material && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Begleitmaterial</p>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">{fieldValues.material}</div>
                  </div>
                )}
                {fieldValues.erwartungshorizont && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Musterlösung</p>
                    <div className="bg-muted/30 rounded-lg p-3 text-sm max-h-48 overflow-y-auto whitespace-pre-wrap">{fieldValues.erwartungshorizont}</div>
                  </div>
                )}
                {kannBearbeiten && !locked && (
                  <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
                    Inhalt bearbeiten
                  </Button>
                )}
                {!fieldValues.aufgabenstellung && (
                  <p className="text-sm text-muted-foreground italic">Noch kein Inhalt. Klicke „Inhalt bearbeiten".</p>
                )}
              </div>
            )
          ) : isTestType ? (
            /* ── Test-Editor (Modal mit Locking, analog Lückentext) ── */
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fragen</p>
                {fieldValues.questions?.length > 0 ? (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm max-h-48 overflow-y-auto">
                    {fieldValues.questions.map((q, i) => {
                      const answers = Array.isArray(q.answers) ? q.answers : (Array.isArray(q.options) ? q.options : []);
                      return (
                        <div key={q.id || i} className="pb-2 border-b border-border/30 last:border-0 last:pb-0">
                          <p className="font-medium">{i + 1}. {q.question}</p>
                          <div className="mt-1 space-y-0.5 text-xs">
                            {answers.map((ans, ai) => (
                              <div key={ai} className={ans.isCorrect || ans.correct ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                                {(ans.isCorrect || ans.correct) && '✓ '}{ans.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="italic text-muted-foreground text-sm">Noch nicht ausgefüllt.</p>
                )}
              </div>
              {kannBearbeiten && !locked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setTestModalOpen(true)}
                  className="gap-1.5"
                >
                  Inhalt bearbeiten
                </Button>
              )}
              <TestModal
                open={testModalOpen}
                onOpenChange={(isOpen) => {
                  if (!isOpen) {
                    setTestModalOpen(false);
                    releaseLock();
                    onEditModeChange?.(false);
                  }
                }}
                initialData={{ ...fieldValues, content_status: master.content_status }}
                onSave={(data) => {
                  const { content_status, ...fvData } = data;
                  const newFv = { ...fieldValues, ...fvData };
                  setFieldValues(newFv);
                  saveMutation.mutate({ fv: newFv, closeEdit: false }, {
                    onSuccess: async () => {
                      if (content_status) {
                        await applyMasterReleaseStatus(content_status);
                      }
                      setTestModalOpen(false);
                      releaseLock();
                      onEditModeChange?.(false);
                    },
                  });
                }}
                onCancel={() => {
                  setTestModalOpen(false);
                  releaseLock();
                  onEditModeChange?.(false);
                }}
                isSaving={saveMutation.isPending}
              />
            </div>
          ) : isQuiz ? (
            /* ── Mini-Quiz-Editor (Modal mit Locking) ── */
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fragen</p>
                {fieldValues.questions?.length > 0 ? (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm max-h-48 overflow-y-auto">
                    {fieldValues.questions.map((q, i) => (
                      <div key={i} className="pb-2 border-b border-border/30 last:border-0 last:pb-0">
                        <p className="font-medium">{i + 1}. {q.question}</p>
                        <div className="mt-1 space-y-0.5 text-xs">
                          {q.answers?.map((ans, ai) => (
                            <div key={ai} className={ans.isCorrect ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                              {ans.isCorrect && '✓ '}{ans.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="italic text-muted-foreground text-sm">Noch nicht ausgefüllt.</p>
                )}
              </div>
              {kannBearbeiten && !locked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMiniQuizModalOpen(true)}
                  className="gap-1.5"
                >
                  Inhalt bearbeiten
                </Button>
              )}
              <MiniQuizModal
                open={miniQuizModalOpen}
                onOpenChange={(isOpen) => {
                  if (!isOpen) setMiniQuizModalOpen(false);
                }}
                initialData={{ ...fieldValues, content_status: master.content_status, moodle_sync_status: master.moodle_sync_status }}
                onSave={(data) => {
                  const { content_status, ...fvData } = data;
                  const newFv = { ...fieldValues, ...fvData };
                  setFieldValues(newFv);
                  saveMutation.mutate({ fv: newFv, closeEdit: false }, {
                    onSuccess: async () => {
                      if (content_status) {
                        await applyMasterReleaseStatus(content_status);
                        queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                        queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
                      }
                      setMiniQuizModalOpen(false);
                    },
                  });
                }}
                onCancel={() => {
                  setMiniQuizModalOpen(false);
                }}
                isSaving={saveMutation.isPending}
              />
            </div>
          ) : isLuecke ? (
            /* ── Lückentext-Editor (WYSIWYG Modal, implizites Locking) ── */
            <div className="space-y-3">
              {fieldValues.lueckentext ? (
                <LueckentextEditor
                  value={fieldValues.lueckentext}
                  onChange={() => {}}
                  readOnly
                />
              ) : (
                <p className="text-sm text-muted-foreground italic">Noch kein Lückentext. Klicke „Inhalt bearbeiten".</p>
              )}
              {/* Button immer sichtbar für berechtigte Nutzer – kein globaler Bearbeitungsmodus nötig */}
              {!locked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleEditLueckentext}
                  disabled={acquiringLock}
                  className="gap-1.5"
                >
                  {acquiringLock
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Sperren…</>
                    : 'Inhalt bearbeiten'}
                </Button>
              )}
              <LueckentextWysiwygModal
                open={lueckentextModalOpen}
                onOpenChange={(isOpen) => {
                  if (!isOpen) handleCloseLueckentextModal();
                }}
                initialData={{ ...fieldValues, content_status: master.content_status }}
                isSaving={saveMutation.isPending}
                onSave={(data) => {
                  const { content_status, ...fvData } = data;
                  const newFv = { ...fieldValues, ...fvData };
                  setFieldValues(newFv);
                  saveMutation.mutate({ fv: newFv, closeEdit: false }, {
                    onSuccess: async () => {
                      // content_status separat auf MasterAufgabe speichern
                      if (content_status) {
                        await applyMasterReleaseStatus(content_status);
                        queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                        // Invalidiere auch Aktivitäts-Query damit Sidebar synchronisiert wird
                        queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
                      }
                      handleCloseLueckentextModal();
                    },
                  });
                }}
                onDelete={async () => {
                  // Klone zuerst löschen, dann den Master selbst
                  for (const k of klone) await base44.entities.Aufgabenbausteine.delete(k.id);
                  await base44.entities.MasterAufgabe.delete(master.id);
                  queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
                  queryClient.invalidateQueries({ queryKey: ['klone'] });
                  await releaseLock();
                  onEditModeChange?.(false);
                  onDeleted?.();
                  // Guardian läuft asynchron — nach kurzer Verzögerung Sidebar-Cache aktualisieren
                  setTimeout(() => {
                    queryClient.invalidateQueries({ queryKey: ['lernpaketPhaseAktivitaeten'] });
                    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
                  }, 1500);
                }}
              />
            </div>
          ) : (
            /* ── Generischer Fallback ── */
            <div className="space-y-3">
              {editMode ? (
                <div className="space-y-2">
                  <Textarea
                    value={fieldValues.task_description || ''}
                    onChange={e => {
                      setFieldValues(fv => ({ ...fv, task_description: e.target.value }));
                      setHasPendingChanges(true);
                    }}
                    placeholder="Aufgabenstellung..."
                    className="min-h-20 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => { setEditMode(false); setHasPendingChanges(false); }}>Abbrechen</Button>
                    {hasPendingChanges && (
                       <Button size="sm" variant="outline" onClick={() => handleSaveAndClose()} disabled={saveMutation.isPending}
                         className="gap-1.5 border-amber-300 hover:bg-amber-100 text-amber-800">
                         {saveMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                         Speichern
                       </Button>
                     )}
                    <Button size="sm" onClick={() => handleSaveAndClose()} disabled={saveMutation.isPending} className="gap-1.5 ml-auto">
                      {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />} Speichern & schließen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {isSort && fieldValues.instruction && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Aufgabenstellung</p>
                      <div className="bg-muted/50 rounded-lg p-3 text-sm">{fieldValues.instruction}</div>
                    </div>
                  )}
                  {isSort && fieldValues.orderedItems?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Sortierliste ({fieldValues.orderedItems.length})</p>
                      <div className="bg-muted/30 rounded-lg p-3 space-y-1">
                        {fieldValues.orderedItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <span className="font-semibold text-muted-foreground w-6">{i + 1}.</span>
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isSort && (
                    <div className="bg-muted/50 rounded-lg p-3 text-sm">
                      {fieldValues.task_description || <span className="italic text-muted-foreground">Noch kein Inhalt. Klicke „Inhalt bearbeiten".</span>}
                    </div>
                  )}
                  {kannBearbeiten && !locked && (
                    <Button size="sm" variant="outline" onClick={() => setEditMode(true)} className="gap-1.5">
                      Inhalt bearbeiten
                    </Button>
                  )}
                  {isSort && !fieldValues.instruction && !fieldValues.orderedItems?.length && (
                    <p className="text-sm text-muted-foreground italic">Noch kein Inhalt. Klicke „Inhalt bearbeiten".</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Klon erstellen – NICHT für KI-Tutor und Bildbeschriftung */}
          {!isKITutor && !isImageLabeling && (master.field_values?.lueckentext || master.field_values?.pairs?.length > 0 || master.field_values?.orderedItems?.length > 0 || master.field_values?.task_description || master.field_values?.questions?.length > 0) && !editMode && !testModalOpen && (
            <div className="border-t border-border/60 pt-4">
              <Button
                variant="ghost"
                size="default"
                onClick={() => setKlonModalOpen(true)}
                className="w-full gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-semibold"
              >
                <Sparkles className="w-4 h-4" />
                Kopien / KI-Klone erstellen
              </Button>
            </div>
          )}

          <KlonErstellenModal
            open={klonModalOpen}
            onClose={() => setKlonModalOpen(false)}
            master={master}
            klone={klone}
            onKlonesCreated={() => {
              onKlonesCreated?.();
              queryClient.invalidateQueries({ queryKey: ['klone'] });
            }}
          />
        </div>
      )}

      {/* Lösch-Bestätigungsdialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Masteraufgabe löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Masteraufgabe wird gelöscht, zusammen mit {klone.length} Klon{klone.length !== 1 ? 'en' : ''}.
              <br /><br />
              <strong>Diese Aktion kann nicht rückgängig gemacht werden.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setDeleteConfirmOpen(false);
                deleteMutation.mutate();
              }}
              className="bg-destructive hover:bg-destructive/90"
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>

    {/* Klone unterhalb wenn Masteraufgabe zugeklappt */}
    {showKloneWhenCollapsed && (
      <div className="ml-4 mt-2 space-y-2">
          {klone.map((k) => (
            <div
              key={k.id}
              onClick={() => onKlonSelected?.(k.id)}
              className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg border border-green-200 bg-green-50/50 hover:bg-green-100 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ChevronRight className="w-3.5 h-3.5 text-green-700 shrink-0" />
                <span className="text-xs font-medium text-green-900 truncate">
                  Kopie {k.klon_index || '?'}
                </span>
                {k.content_status === 'approved' && (
                  <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded shrink-0 font-medium">
                    Freigegeben
                  </span>
                )}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}