import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Rocket, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * PublishTaskButton
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * Props:
 * - taskData: Objekt mit aktuellen Aufgaben-Daten
 * - taskId: ID der Aufgabe (für Update)
 * - entityType: Name der Entity ('Aufgabenbausteine', 'MasterAufgabe' etc.)
 * - schema: Zod-Schema zur Validierung
 * - onPublish: Callback nach erfolgreicher Freigabe
 * 
 * Verhalten:
 * 1. Validierung gegen schema
 * 2. Falls gültig: Direkt speichern mit content_status = 'approved'
 * 3. Falls ungültig: Modal zeigen mit Fallback-Option
 * 4. Bei Fallback: Fehlende Felder mit Defaults füllen und speichern
 */

// ─────────────────────────────────────────────────────────────────────────────
// Fallback-Logik: Identifiziere fehlende Felder und befülle sie
// ─────────────────────────────────────────────────────────────────────────────

function injectFallbacks(taskData, validationErrors) {
  const filled = { ...taskData };
  const schema = taskData._schema;

  // Iteriere über alle Fehler und befülle mit Defaults
  validationErrors.forEach((error) => {
    const { path, code } = error;
    const fieldPath = path[0];

    if (!fieldPath) return;

    // Standard-Fallbacks
    let fallbackValue;

    // Versuche zu erraten, ob es eine URL sein sollte
    if (code === 'invalid_string' || code === 'too_small') {
      // Wenn das Feld "url" heißt oder ".url" enthält
      if (fieldPath.toLowerCase().includes('url') || fieldPath.toLowerCase().includes('link')) {
        fallbackValue = 'https://www.link-folgt.de';
      } else {
        fallbackValue = '[Information wird noch ergänzt]';
      }
    } else {
      // Default für alle anderen Fehlertypen
      fallbackValue = '[Information wird noch ergänzt]';
    }

    // Setze den Fallback-Wert
    filled[fieldPath] = fallbackValue;
  });

  return filled;
}

// ─────────────────────────────────────────────────────────────────────────────
// Haupt-Komponente
// ─────────────────────────────────────────────────────────────────────────────

export default function PublishTaskButton({
  taskData,
  taskId,
  entityType = 'Aufgabenbausteine',
  schema,
  onPublish,
  className = '',
}) {
  const [showModal, setShowModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [isForcePublish, setIsForcePublish] = useState(false);
  const queryClient = useQueryClient();

  // Mutation zum Speichern
  const publishMutation = useMutation({
    mutationFn: async (dataToSave) => {
      return await base44.entities[entityType].update(taskId, {
        ...dataToSave,
        content_status: 'approved',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityType.toLowerCase()] });
      toast.success('✅ Aufgabe freigegeben!');
      setShowModal(false);
      setValidationErrors([]);
      setIsForcePublish(false);
      onPublish?.();
    },
    onError: (error) => {
      toast.error('Fehler beim Freigeben: ' + (error.message || 'Unbekannter Fehler'));
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Hauptlogik: Validierung + Entscheidung
  // ─────────────────────────────────────────────────────────────────────────

  const handlePublish = () => {
    if (!schema) {
      // Fallback, wenn kein Schema vorhanden
      publishMutation.mutate(taskData);
      return;
    }

    // Validiere taskData gegen schema
    const validation = schema.safeParse(taskData);

    if (validation.success) {
      // ✅ Valid: Direkt speichern
      publishMutation.mutate(taskData);
    } else {
      // ❌ Invalid: Modal zeigen mit Fallback-Option
      const errors = validation.error.errors || [];
      setValidationErrors(errors);
      setShowModal(true);
      setIsForcePublish(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Fallback-Publish: Befülle fehlende Felder und speichere
  // ─────────────────────────────────────────────────────────────────────────

  const handleForcePublish = () => {
    const filledData = injectFallbacks(taskData, validationErrors);
    publishMutation.mutate(filledData);
    setIsForcePublish(true);
  };

  return (
    <>
      {/* Freigabe-Button */}
      <Button
        onClick={handlePublish}
        disabled={publishMutation.isPending}
        className={cn(
          'w-full bg-green-600 hover:bg-green-700 text-white font-semibold gap-2',
          className
        )}
      >
        {publishMutation.isPending ? (
          <>
            <span className="animate-spin inline-block">⏳</span>
            Wird freigegeben...
          </>
        ) : (
          <>
            <Rocket className="w-4 h-4" />
            🚀 Aufgabe für Export freigeben
          </>
        )}
      </Button>

      {/* Validierungs-Modal */}
      <AlertDialog open={showModal} onOpenChange={setShowModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex gap-2 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <AlertDialogTitle>Fehlende Informationen</AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  Diese Aufgabe ist noch nicht vollständig ausgefüllt. Möchtest du sie trotzdem für
                  den Export freigeben? Fehlende Felder werden mit Platzhaltern aufgefüllt.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Fehlerliste für Transparenz */}
          {validationErrors.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400">
                Fehlende/ungültige Felder:
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-300 space-y-1">
                {validationErrors.slice(0, 5).map((err, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    <span>
                      {err.path.join('.')} — {err.message}
                    </span>
                  </li>
                ))}
                {validationErrors.length > 5 && (
                  <li className="text-amber-600 dark:text-amber-400 italic">
                    + {validationErrors.length - 5} weitere...
                  </li>
                )}
              </ul>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <AlertDialogCancel disabled={publishMutation.isPending}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleForcePublish}
              disabled={publishMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {publishMutation.isPending && isForcePublish ? (
                '⏳ Wird freigegeben...'
              ) : (
                'Trotzdem freigeben'
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}