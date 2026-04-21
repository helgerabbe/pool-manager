/**
 * MasterDetailView.jsx
 *
 * Ansicht B: Fokussierte Read-Only-Ansicht einer einzelnen Master-Aufgabe.
 * Zeigt den Inhalt im Lesemodus und bietet einen prominenten "Inhalt bearbeiten"-Button,
 * der den impliziten Lock-Workflow (Modal) triggert.
 */

import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Pencil, Loader2, CheckCircle2, Sparkles } from 'lucide-react';
import { useLernpaketLock } from '@/hooks/useLernpaketLock';
import LueckentextEditor from '@/components/workspace/LueckentextEditor';
import LueckentextWysiwygModal from '@/components/workspace/LueckentextWysiwygModal';
import { toast } from 'sonner';

const LUECKENTEXT_NAMES = ['lückentext', 'lücken', 'lueckentext', 'cloze', 'fill in'];
function isLueckentext(name = '') {
  return LUECKENTEXT_NAMES.some(n => name.toLowerCase().includes(n));
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
  if (['miniquiz', 'mini-quiz', 'quiz'].some(n => catalogName.toLowerCase().includes(n)) && fv.quizItems?.length > 0) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Fragen ({fv.quizItems.length})</p>
        <div className="bg-muted/30 rounded-lg p-3 space-y-2 text-sm max-h-64 overflow-y-auto">
          {fv.quizItems.map((q, i) => (
            <div key={i} className="pb-2 border-b border-border/30 last:border-0 last:pb-0">
              <p className="font-medium">{i + 1}. {q.question}</p>
              <p className="mt-1 text-xs text-green-700 font-medium">✓ {q.correctAnswer}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Multiple Choice
  if (['multiple choice', 'multiple-choice'].some(n => catalogName.toLowerCase().includes(n)) && fv.mcItems?.length > 0) {
    return (
      <div className="space-y-2">
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

  const { acquireLock, releaseLock } = useLernpaketLock(isLuecke ? master.lernpaket_id : null);
  const [acquiringLock, setAcquiringLock] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [fieldValues, setFieldValues] = useState(master.field_values || {});

  const saveMutation = useMutation({
    mutationFn: (fv) => base44.entities.MasterAufgabe.update(master.id, { field_values: fv }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterAufgaben'] });
      toast.success('Masteraufgabe gespeichert.');
    },
    onError: (err) => toast.error(err.message || 'Fehler beim Speichern.'),
  });

  const handleEdit = async () => {
    if (!isLuecke) return; // Andere Typen nutzen eigene Flows
    setAcquiringLock(true);
    const ok = await acquireLock();
    setAcquiringLock(false);
    if (!ok) return;
    onEditModeChange?.(true);
    setModalOpen(true);
  };

  const handleCloseModal = async () => {
    setModalOpen(false);
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
        {kannBearbeiten && isLuecke && (
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
          open={modalOpen}
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
    </div>
  );
}