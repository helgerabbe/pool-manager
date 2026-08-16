/**
 * Digitale Aufgabe einer Stunden-Phase inhaltlich ausarbeiten (MUG).
 *
 * Wiederverwendung statt Duplikat: Die Aufgaben-Editoren des Pool-Managers
 * sind bereits Dialogfenster mit dem Vertrag `initialData` → `onSave(fieldValues)`.
 * Diese Komponente wählt anhand der gewählten Aufgabenart den passenden Dialog
 * und schreibt das Ergebnis in StundenSequenz.field_values — die Lehrkraft
 * bleibt dabei im Regieblatt.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Pencil, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import LueckentextWysiwygModal from '@/components/workspace/LueckentextWysiwygModal';
import SortingListModal from '@/components/workspace/SortingListModal';
import MatchTermsModal from '@/components/workspace/MatchTermsModal';
import MiniQuizModalDetail from '@/components/workspace/MiniQuizModalDetail';
import MultipleChoiceModalDetail from '@/components/workspace/MultipleChoiceModalDetail';
import TestModal from '@/components/workspace/TestModal';
import KITutorModalDetail from '@/components/workspace/KITutorModalDetail';
import ImageLabelingModalDetail from '@/components/workspace/ImageLabelingModalDetail';
import OffeneAufgabeModal from '@/components/workspace/OffeneAufgabeModal';
import ActivityContentForm from '@/components/workspace/ActivityContentForm';

/** Aufgabenart → passender Editor-Dialog (gleiche Zuordnung wie im Pool-Manager). */
function editorTyp(name = '') {
  const n = name.toLowerCase();
  if (n.includes('test')) return 'test';
  if (n.includes('quiz')) return 'quiz';
  if (['lückentext', 'lueckentext', 'lücken', 'cloze'].some((k) => n.includes(k))) return 'lueckentext';
  if (['reihenfolge', 'sortierung', 'sequenzierung', 'sorting'].some((k) => n.includes(k))) return 'sortierung';
  if (n.includes('zuordnen') || n.includes('match terms')) return 'match';
  if (n.includes('multiple choice') || n.includes('multiple-choice')) return 'mc';
  if (n.includes('bildbeschriftung') || n.includes('bildbeschreibung')) return 'bild';
  if (n.includes('ki-tutor') || n.includes('ki-check')) return 'kitutor';
  if (n.includes('offene aufgabe')) return 'offen';
  return 'generisch';
}

export default function StundenAufgabeEditorButton({ phase, katalogEntry, stundeId }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const typ = editorTyp(katalogEntry?.name);
  const initialData = phase.field_values || {};
  const hatInhalt = Object.keys(initialData).length > 0;

  const speichern = useMutation({
    mutationFn: (fieldValues) =>
      base44.entities.StundenSequenz.update(phase.id, {
        field_values: fieldValues,
        is_complete: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stundenSequenzen', stundeId] });
      toast.success('Aufgabe gespeichert.');
      setOpen(false);
    },
    onError: (err) => toast.error(err?.message || 'Die Aufgabe konnte nicht gespeichert werden.'),
  });

  const onSave = (neueDaten) => {
    const { content_status, ...fv } = neueDaten || {};
    speichern.mutate({ ...initialData, ...fv });
  };

  const schliessen = (istOffen) => { if (!istOffen) setOpen(false); };
  const gemeinsam = {
    open,
    onOpenChange: schliessen,
    initialData,
    isSaving: speichern.isPending,
    onSave,
    onCancel: () => setOpen(false),
  };

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-blue-900">Inhalt der Aufgabe „{katalogEntry?.name}"</p>
        <p className="text-xs text-blue-800/80 inline-flex items-center gap-1">
          {hatInhalt ? (
            <><CheckCircle2 className="w-3.5 h-3.5" /> Aufgabe ist ausgearbeitet — jederzeit änderbar.</>
          ) : (
            'Noch kein Inhalt: Aufgabe jetzt ausarbeiten.'
          )}
        </p>
      </div>
      <Button size="sm" className="gap-2 shrink-0" onClick={() => setOpen(true)}>
        <Pencil className="w-3.5 h-3.5" />
        {hatInhalt ? 'Aufgabe bearbeiten' : 'Aufgabe jetzt erstellen'}
      </Button>

      {typ === 'lueckentext' && <LueckentextWysiwygModal {...gemeinsam} />}
      {typ === 'sortierung' && <SortingListModal {...gemeinsam} />}
      {typ === 'match' && <MatchTermsModal {...gemeinsam} />}
      {typ === 'quiz' && <MiniQuizModalDetail {...gemeinsam} />}
      {typ === 'mc' && <MultipleChoiceModalDetail {...gemeinsam} />}
      {typ === 'test' && <TestModal {...gemeinsam} />}
      {typ === 'kitutor' && <KITutorModalDetail {...gemeinsam} />}
      {typ === 'bild' && (
        <ImageLabelingModalDetail
          {...gemeinsam}
          trackingContext={{ sourceEntity: 'StundenSequenz', sourceRecordId: phase.id }}
        />
      )}
      {typ === 'offen' && <OffeneAufgabeModal {...gemeinsam} />}
      {typ === 'generisch' && (
        <ActivityContentForm
          open={open}
          onOpenChange={schliessen}
          aktivitaet={katalogEntry}
          initialData={initialData}
          onSave={({ content_data }) => speichern.mutate({ ...initialData, ...content_data })}
        />
      )}
    </div>
  );
}