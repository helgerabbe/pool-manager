/**
 * ReplicaReviewModal.jsx
 *
 * Human-in-the-Loop Review Modal für generierte Replikate.
 * - Temporäre Vorschau der KI-generierten Klone
 * - "Verwerfen": Schließt ohne Speichern
 * - "Als Entwürfe übernehmen": Speichert alle mit status='draft', is_master=false
 */

import React, { useState, useEffect } from 'react';
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
import { AlertCircle, Loader2, Check, Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function ReplicaSkeleton() {
  return (
    <div className="space-y-3 p-4 rounded-lg border border-muted bg-muted/30 animate-pulse">
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-5/6 rounded bg-muted" />
    </div>
  );
}

function ReplicaPreviewItem({ index, replica, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(replica.aufgabentext);
  const [loesung, setLoesung] = useState(replica.loesung);

  const handleSave = () => {
    onUpdate(index, { aufgabentext: text, loesung });
    setEditing(false);
  };

  return (
    <div className="p-4 rounded-lg border bg-card space-y-2">
      <div className="flex items-center justify-between">
        <Badge variant="outline" className="text-[10px]">Entwurf {index + 1}</Badge>
        <button
          onClick={() => setEditing(!editing)}
          className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          {editing ? <X className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
        </button>
      </div>

      {editing ? (
        <div className="space-y-2">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Aufgabentext</label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="h-20 text-sm resize-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Lösungshinweis</label>
            <Textarea
              value={loesung}
              onChange={(e) => setLoesung(e.target.value)}
              className="h-14 text-sm resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Abbrechen</Button>
            <Button size="sm" onClick={handleSave} className="gap-1">
              <Check className="w-3 h-3" /> Übernehmen
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm text-foreground">{text}</p>
          {loesung && (
            <p className="text-xs text-muted-foreground italic line-clamp-1">
              💡 {loesung}
            </p>
          )}
        </>
      )}
    </div>
  );
}

export default function ReplicaReviewModal({
  open,
  onOpenChange,
  isLoading,
  replicas: initialReplicas = [],
  masterId,
  lernpaketId,
  lernzielId,
  masterData = {},
  error,
  onSaveSuccess,
}) {
  const [replicas, setReplicas] = useState([]);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Sync wenn neue Replikate reinkommen
  React.useEffect(() => {
    setReplicas(initialReplicas.map(r => ({ ...r })));
  }, [initialReplicas]);

  const handleUpdate = (index, updated) => {
    setReplicas(prev => prev.map((r, i) => i === index ? { ...r, ...updated } : r));
  };

  const handleDiscard = () => {
    onOpenChange(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await Promise.all(replicas.map(r =>
        base44.entities.Aufgabenbausteine.create({
          lernpaket_id: lernpaketId,
          lernziel_id: lernzielId || null,
          baustein_typ: masterData.baustein_typ || 'Ebene-1-Übung',
          aufgabentext_inhalt: r.aufgabentext,
          erwartungshorizont_ki_prompt: r.loesung,
          is_master: false,
          master_id: masterId,
          status: 'draft',
          export_to_moodle: false,
        })
      ));
      queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
      toast.success(`${replicas.length} Entwürfe gespeichert`);
      onOpenChange(false);
      if (onSaveSuccess) onSaveSuccess();
    } catch (e) {
      toast.error(`Speichern fehlgeschlagen: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              KI generiert Aufgabenvarianten…
            </DialogTitle>
            <DialogDescription>
              Die KI erstellt didaktisch gleichwertige Klone. Bitte warten.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <ReplicaSkeleton key={i} />)}
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
              <p className="font-semibold">Generierung fehlgeschlagen</p>
              <p className="text-xs mt-1">{error}</p>
              <p className="text-xs mt-2 text-red-600">Sie können das Modal schließen, den Zusatz-Prompt anpassen und erneut versuchen.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Schließen & anpassen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            {replicas.length} Aufgabenvarianten generiert
          </DialogTitle>
          <DialogDescription>
            Überprüfe die Entwürfe. Du kannst einzelne Texte bearbeiten (Stift-Icon). Erst nach "Als Entwürfe übernehmen" werden sie gespeichert.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 overflow-y-auto flex-1 pr-1">
          {replicas.map((replica, index) => (
            <ReplicaPreviewItem
              key={index}
              index={index}
              replica={replica}
              onUpdate={handleUpdate}
            />
          ))}
        </div>

        <DialogFooter className="gap-2 flex-row justify-between sm:justify-between border-t pt-4 shrink-0">
          <Button
            variant="outline"
            onClick={handleDiscard}
            className="gap-2 text-muted-foreground"
          >
            <X className="w-4 h-4" />
            Verwerfen
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={saving || replicas.length === 0}
            className="gap-2"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Speichert…</>
            ) : (
              <><Check className="w-4 h-4" /> Als Entwürfe übernehmen</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}