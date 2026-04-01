/**
 * ReplicaReviewModal.jsx
 *
 * Phase 6.7: Review & Human-in-the-Loop Einzelspeicherung von Replikaten
 * 
 * Features:
 * - Zeige generierte Replikate in einer Liste
 * - Editierbar mit Textarea
 * - Einzelne "Speichern"-Buttons pro Replikat
 * - Loading Skeletons während Generierung
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
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Save, AlertCircle, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────
// STEP 1: Loading Skeleton
// ─────────────────────────────────────────────────────────────────────────

function ReplicaSkeleton() {
  return (
    <div className="space-y-3 p-4 rounded-lg border border-muted bg-muted/30 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-5/6 rounded bg-muted" />
      <div className="h-8 w-20 rounded bg-muted mt-4" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// STEP 2: Einzelnes Replikat mit Edit & Save
// ─────────────────────────────────────────────────────────────────────────

function ReplicaItem({
  index,
  replica,
  masterId,
  lernpaketId,
  lernzielId,
  onSaveSuccess,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTask, setEditedTask] = useState(replica.aufgabentext);
  const [editedSolution, setEditedSolution] = useState(replica.loesung);
  const queryClient = useQueryClient();

  // Mutation: Speichere dieses einzelne Replikat
  const saveMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.entities.Aufgabenbausteine.create({
        lernpaket_id: lernpaketId,
        lernziel_id: lernzielId || null,
        baustein_typ: 'Ebene-1-Übung',
        aufgabentext_inhalt: editedTask,
        erwartungshorizont_ki_prompt: editedSolution,
        is_master: false,
        master_id: masterId,
        export_to_moodle: true,
      });
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aufgaben', lernpaketId] });
      toast.success(`Replikat ${index + 1} gespeichert`);
      setIsEditing(false);
      if (onSaveSuccess) onSaveSuccess(data);
    },
    onError: (error) => {
      toast.error(`Speichern fehlgeschlagen: ${error.message}`);
    },
  });

  if (isEditing) {
    return (
      <div className="space-y-3 p-4 rounded-lg border border-primary/20 bg-primary/5">
        <div className="flex items-center justify-between mb-2">
          <Badge variant="secondary">Replikat {index + 1} (Editieren)</Badge>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Aufgabentext
          </label>
          <Textarea
            value={editedTask}
            onChange={(e) => setEditedTask(e.target.value)}
            className="h-20 text-sm resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Lösungsskizze
          </label>
          <Textarea
            value={editedSolution}
            onChange={(e) => setEditedSolution(e.target.value)}
            className="h-16 text-sm resize-none"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setEditedTask(replica.aufgabentext);
              setEditedSolution(replica.loesung);
              setIsEditing(false);
            }}
          >
            Abbrechen
          </Button>
          <Button
            size="sm"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="gap-1"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Speichert...
              </>
            ) : (
              <>
                <Check className="w-3 h-3" />
                Speichern
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <Badge variant="outline">Replikat {index + 1}</Badge>
      </div>

      <p className="text-sm font-medium line-clamp-2">{replica.aufgabentext}</p>
      <p className="text-xs text-muted-foreground line-clamp-1">
        📝 Lösung: {replica.loesung.substring(0, 60)}...
      </p>

      <div className="flex gap-2 pt-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(true)}
        >
          Bearbeiten
        </Button>
        <Button
          size="sm"
          onClick={() => saveMutation.mutate()}
          disabled={saveMutation.isPending}
          className="gap-1"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Speichert...
            </>
          ) : (
            <>
              <Save className="w-3 h-3" />
              Diese Aufgabe speichern
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────

export default function ReplicaReviewModal({
  open,
  onOpenChange,
  isLoading,
  replicas = [],
  masterId,
  lernpaketId,
  lernzielId,
  error,
  onSaveSuccess,
}) {
  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              Replikate werden generiert...
            </DialogTitle>
            <DialogDescription>
              Die KI erstellt didaktisch gleichwertige Aufgabenvarianten.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <ReplicaSkeleton key={i} />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fehler bei der Generierung</DialogTitle>
          </DialogHeader>

          <div className="flex items-start gap-3 p-3 rounded-lg border border-red-200 bg-red-50">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-semibold mb-1">Generierung fehlgeschlagen</p>
              <p className="text-xs">{error}</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            {replicas.length} Replikate generiert
          </DialogTitle>
          <DialogDescription>
            Überprüfen Sie die generierten Aufgabenvarianten und speichern Sie diese einzeln.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {replicas.map((replica, index) => (
            <ReplicaItem
              key={index}
              index={index}
              replica={replica}
              masterId={masterId}
              lernpaketId={lernpaketId}
              lernzielId={lernzielId}
              onSaveSuccess={onSaveSuccess}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Schließen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}