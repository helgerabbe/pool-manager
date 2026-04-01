/**
 * MasterTaskModal.jsx
 *
 * Phase 6.7: Dynamisches Modal für Masteraufgaben-Erstellung
 * 
 * Unterstützt verschiedene Activity-Types mit platzhalterbasierten Komponenten.
 * Abhängig vom `activity_type` wird die entsprechende Komponente geladen.
 */

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Save } from 'lucide-react';
import { toast } from 'sonner';

// Lazy-Import der Activity-Type Komponenten
import MatchTermsPlaceholder from './placeholders/MatchTermsPlaceholder';
import FreeTextPlaceholder from './placeholders/FreeTextPlaceholder';

// Mapping: activity_type -> Komponenten-Komponente
const ACTIVITY_COMPONENTS = {
  match_terms: MatchTermsPlaceholder,
  free_text: FreeTextPlaceholder,
  // Weitere Activity-Types können hier hinzugefügt werden
};

/**
 * MasterTaskModal
 * 
 * @param {string} open - Dialog offen?
 * @param {function} onOpenChange - Callback zum Öffnen/Schließen
 * @param {string} lernpaketId - ID des Lernpakets
 * @param {string} lernzielId - ID des Lernziels
 * @param {string} activityType - z.B. 'match_terms', 'free_text'
 * @param {object} contextData - Zusätzliche Kontextdaten (fach, jahrgangsstufe, etc.)
 * @param {function} onSuccess - Callback nach erfolgreicher Speicherung
 */
export default function MasterTaskModal({
  open,
  onOpenChange,
  lernpaketId,
  lernzielId,
  activityType = 'free_text',
  contextData = {},
  onSuccess,
}) {
  const [formData, setFormData] = useState({});
  const queryClient = useQueryClient();

  // Mutation: Masteraufgabe speichern
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.entities.Aufgabenbausteine.create({
        lernpaket_id: lernpaketId,
        lernziel_id: lernzielId || null,
        baustein_typ: 'Ebene-1-Übung',
        aufgabentext_inhalt: data.description || 'Masteraufgabe',
        erwartungshorizont_ki_prompt: data.solution || '',
        is_master: true,
        activity_type: activityType,
        activity_config: data.config || {},
        export_to_moodle: true,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben', lernpaketId] });
      toast.success('Masteraufgabe erstellt');
      onOpenChange(false);
      setFormData({});
      if (onSuccess) onSuccess(data);
    },
    onError: (error) => {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
    },
  });

  // Hole die Activity-Komponente basierend auf activity_type
  const ActivityComponent = ACTIVITY_COMPONENTS[activityType];

  if (!ActivityComponent) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masteraufgabe erstellen</DialogTitle>
          </DialogHeader>
          <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold">Fehler</p>
              <p className="text-xs">{`Unbekannter Activity-Type: ${activityType}`}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSave = () => {
    if (!formData.description?.trim()) {
      toast.error('Bitte füllen Sie das Beschreibungsfeld aus');
      return;
    }
    saveMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Masteraufgabe erstellen</DialogTitle>
          <DialogDescription>
            Diese Aufgabe wird als Master für KI-Replikation verwendet.
          </DialogDescription>
        </DialogHeader>

        {/* Activity-Type spezifische Komponente */}
        <ActivityComponent
          formData={formData}
          setFormData={setFormData}
          contextData={contextData}
        />

        {/* Footer Buttons */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveMutation.isPending}
          >
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="gap-2"
          >
            {saveMutation.isPending ? (
              'Speichert...'
            ) : (
              <>
                <Save className="w-4 h-4" />
                Masteraufgabe speichern
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}