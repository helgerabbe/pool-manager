import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Rocket, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * PublishTaskButton.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * Globale Freigabe-Komponente für Aufgaben (Master & Klone) mit Force-Publish-Logik.
 * 
 * Props:
 *   - item: Das aktuelle Aufgaben-Objekt (Master oder Klon)
 *   - itemType: 'master' | 'klon' (bestimmt Entity-Name)
 *   - schema: Zod-Schema zur Validierung
 *   - onSuccess: Callback nach erfolgreichem Speichern
 * 
 * Verhalten:
 *   1. Klick → Validierung gegen schema.safeParse(item)
 *   2. Valid → Direkt speichern mit content_status: 'approved'
 *   3. Invalid → AlertDialog zeigen mit Fallback-Option
 *   4. Force-Publish → Fehlende Felder mit Platzhaltern füllen + speichern
 */

// ─────────────────────────────────────────────────────────────────────────────
// Hilfsfunktion: Fallback-Werte injizieren basierend auf Zod-Errors
// ─────────────────────────────────────────────────────────────────────────────

function injectFallbacks(item, zodErrors) {
  const filled = { ...item };

  // Iteriere über alle Zod-Issues
  zodErrors.forEach((issue) => {
    const fieldPath = issue.path[0]; // path ist ein Array [fieldName, ...]

    if (!fieldPath) return;

    // Erkenne URL-Felder anhand des Feldnamens oder Schema-Context
    const isUrlField =
      fieldPath.toString().toLowerCase().includes('url') ||
      fieldPath.toString().toLowerCase().includes('link');

    // Setze Fallback basierend auf Feldtyp
    const fallbackValue = isUrlField
      ? 'https://www.link-folgt.de'
      : '[Information wird noch ergänzt]';

    filled[fieldPath] = fallbackValue;
  });

  return filled;
}

// ─────────────────────────────────────────────────────────────────────────────
// Haupt-Komponente
// ─────────────────────────────────────────────────────────────────────────────

export default function PublishTaskButton({
  item,
  itemType = 'klon',
  schema,
  onSuccess,
  className = '',
}) {
  const [showModal, setShowModal] = useState(false);
  const [zodIssues, setZodIssues] = useState([]);
  const queryClient = useQueryClient();

  // Entity-Namen basierend auf itemType
  const entityMap = {
    master: 'MasterAufgabe',
    klon: 'Aufgabenbausteine',
  };
  const entityName = entityMap[itemType] || 'Aufgabenbausteine';

  // Mutation zum Update mit content_status: 'approved'
  const publishMutation = useMutation({
    mutationFn: async (dataToSave) => {
      return await base44.entities[entityName].update(item.id, {
        ...dataToSave,
        content_status: 'approved',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [entityName.toLowerCase()] });
      toast.success('✅ Aufgabe für Export freigegeben!');
      setShowModal(false);
      setZodIssues([]);
      onSuccess?.();
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
      // Kein Schema → direkt speichern
      publishMutation.mutate(item);
      return;
    }

    // Validiere item gegen schema
    const validation = schema.safeParse(item);

    if (validation.success) {
      // ✅ Valid: Direkt speichern
      publishMutation.mutate(item);
    } else {
      // ❌ Invalid: Modal zeigen mit Fallback-Option
      setZodIssues(validation.error.issues || []);
      setShowModal(true);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Force-Publish: Befülle fehlende Felder mit Fallbacks
  // ─────────────────────────────────────────────────────────────────────────

  const handleForcePublish = () => {
    const filledData = injectFallbacks(item, zodIssues);
    publishMutation.mutate(filledData);
  };

  return (
    <>
      {/* Freigabe-Button */}
      <Button
        onClick={handlePublish}
        disabled={publishMutation.isPending}
        className={cn(
          'bg-green-600 hover:bg-green-700 text-white font-semibold gap-2',
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
            Für Export freigeben
          </>
        )}
      </Button>

      {/* AlertDialog bei Validierungsfehlern */}
      <AlertDialog open={showModal} onOpenChange={setShowModal}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex gap-3 items-start">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <AlertDialogTitle>Einige Pflichtfelder fehlen</AlertDialogTitle>
                <AlertDialogDescription className="text-sm leading-relaxed">
                  Moodle benötigt diese Daten für einen erfolgreichen Export. Willst du die
                  Aufgabe trotzdem freigeben? Die fehlenden Felder werden automatisch mit
                  Platzhaltern gefüllt.
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          {/* Auflistung fehlender Felder */}
          {zodIssues.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
              <p className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                Betroffene Felder:
              </p>
              <ul className="text-xs text-amber-800 dark:text-amber-400 space-y-1">
                {zodIssues.map((issue, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-amber-600 dark:text-amber-500 mt-0.5">→</span>
                    <span>
                      <strong>{issue.path.join('.')}</strong> {issue.message}
                    </span>
                  </li>
                ))}
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
              {publishMutation.isPending ? '⏳ Wird freigegeben...' : 'Trotzdem freigeben'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}