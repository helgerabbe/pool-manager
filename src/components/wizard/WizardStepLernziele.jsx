import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronRight, Loader2, RefreshCw, Check, AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { toast } from 'sonner';

export default function WizardStepLernziele({ einheitId, onDone, isFinalStep = false }) {
  const queryClient = useQueryClient();
  const [objectives, setObjectives] = useState([]);
  const [approved, setApproved] = useState(new Set()); // IDs der genehmigten Lernziele
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list('-created_date', 200),
  });

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  // Auto-Generierung beim Mount
  useEffect(() => {
    if (paketeFuerEinheit.length === 0) {
      setLoading(false);
      return;
    }
    generateObjectives(paketeFuerEinheit);
  }, [paketeFuerEinheit.length]);

  const generateObjectives = async (pakete, paketIdsToRegenerate = null) => {
    setLoading(true);
    setError(null);
    try {
      // Wenn nur bestimmte Pakete regeneriert werden, behalte die anderen bei
      let targetPakete = pakete;
      if (paketIdsToRegenerate) {
        targetPakete = pakete.filter(p => paketIdsToRegenerate.has(p.id));
      }

      const response = await base44.functions.invoke('generateLearningObjectives', {
        einheitId,
        lernpakete: targetPakete.map(p => ({ id: p.id, titel_des_pakets: p.titel_des_pakets })),
      });

      const newObjectives = response.data.objectives || [];

      if (paketIdsToRegenerate) {
        // Merge: Ersetze nur die neu generierten Pakete
        setObjectives(prev => {
          const updated = [...prev];
          newObjectives.forEach(newObj => {
            const idx = updated.findIndex(o => o.lernpaket_id === newObj.lernpaket_id);
            if (idx >= 0) {
              updated[idx] = { ...updated[idx], ...newObj };
            }
          });
          return updated;
        });
      } else {
        // Initiales Laden: Alle Pakete auto-genehmigt
        setObjectives(newObjectives);
        setApproved(new Set(newObjectives.map(o => o.lernpaket_id)));
      }
    } catch (err) {
      setError(err.message || 'Fehler bei der KI-Generierung');
      toast.error('Fehler beim Generieren der Lernziele');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    // Regeneriere nur die nicht-genehmigten Pakete
    const unapprovedIds = new Set(
      objectives
        .filter(obj => !approved.has(obj.lernpaket_id))
        .map(obj => obj.lernpaket_id)
    );

    if (unapprovedIds.size === 0) {
      toast.info('Alle Lernziele sind bereits genehmigt.');
      return;
    }

    setRegenerating(true);
    await generateObjectives(paketeFuerEinheit, unapprovedIds);
    setRegenerating(false);
  };

  const toggleApproved = (lernpaketId) => {
    setApproved(prev => {
      const next = new Set(prev);
      if (next.has(lernpaketId)) {
        next.delete(lernpaketId);
      } else {
        next.add(lernpaketId);
      }
      return next;
    });
  };

  const handleEdit = (index, field, value) => {
    setObjectives(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Lösche alte Lernziele für diese Lernpakete
      const existingLz = await base44.entities.Lernziele.list('-created_date', 500);
      const paketIds = new Set(paketeFuerEinheit.map(p => p.id));
      const toDelete = existingLz.filter(lz => paketIds.has(lz.lernpaket_id));
      
      for (const lz of toDelete) {
        await base44.entities.Lernziele.delete(lz.id);
      }

      // Erstelle alle Lernziele (genehmigte = alle mit Inhalt, nicht explizit abgelehnte)
      let savedCount = 0;
      for (const obj of objectives) {
        if (obj.ziel_fach?.trim()) {
          await base44.entities.Lernziele.create({
            lernpaket_id: obj.lernpaket_id,
            formulierung_fachsprache: obj.ziel_fach.trim(),
            kategorie: 'Fachwissen',
            schueler_uebersetzung: obj.ziel_schueler?.trim() || '',
          });
          savedCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      toast.success(`${savedCount} Lernziele gespeichert.`);
      onDone?.();
    } catch (err) {
      toast.error('Fehler beim Speichern der Lernziele');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading && paketeFuerEinheit.length > 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Schritt 4: Lernziele generieren</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Die KI erstellt automatisch Lernziele in Fach- und Schülersprache...
          </p>
        </div>
        <div className="space-y-3">
          {[...Array(Math.min(5, paketeFuerEinheit.length))].map((_, i) => (
            <div key={i} className="p-4 bg-muted/30 rounded-lg border border-border animate-pulse">
              <div className="h-6 bg-muted rounded mb-3" />
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Generiere Lernziele für {paketeFuerEinheit.length} Pakete...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Schritt 4: Lernziele generieren</h2>
        </div>
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-destructive">Fehler bei der KI-Generierung</p>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={handleRegenerate} disabled={regenerating} className="gap-2">
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Schritt 4: Lernziele für jedes Paket</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Die KI hat automatisch Lernziele vorgeschlagen. Sie können diese noch bearbeiten, bevor Sie sie speichern.
        </p>
      </div>

      {objectives.length === 0 ? (
        <p className="text-muted-foreground text-sm italic text-center py-8">
          Keine Lernpakete gefunden. Sie können diesen Schritt überspringen.
        </p>
      ) : (
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
          {objectives.map((obj, idx) => {
            const isApproved = approved.has(obj.lernpaket_id);
            return (
            <div 
              key={idx} 
              className={`p-4 border-2 rounded-lg space-y-3 transition-all ${
                isApproved 
                  ? 'border-green-300 bg-green-50/30' 
                  : 'border-border bg-card'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => toggleApproved(obj.lernpaket_id)}
                    className="flex-shrink-0 transition-colors hover:opacity-70"
                    title={isApproved ? 'Ablehnen' : 'Akzeptieren'}
                  >
                    {isApproved ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>
                  <h3 className="font-semibold text-sm truncate">{obj.lernpaket_titel}</h3>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded flex-shrink-0">
                  #{idx + 1}
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Lernziel (Fachsprache)
                </Label>
                <Textarea
                  value={obj.ziel_fach}
                  onChange={e => handleEdit(idx, 'ziel_fach', e.target.value)}
                  placeholder="Ich kann..."
                  className="text-sm h-16"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground">
                  Lernziel (Schülersprache)
                </Label>
                <Textarea
                  value={obj.ziel_schueler}
                  onChange={e => handleEdit(idx, 'ziel_schueler', e.target.value)}
                  placeholder="Ich kann... (für Schüler verständlich)"
                  className="text-sm h-16"
                />
              </div>
            </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-border gap-2">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRegenerate}
            disabled={regenerating || objectives.length === 0 || approved.size === objectives.length}
            className="gap-2"
          >
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Nur nicht-genehmigten neu generieren
          </Button>
          <span className="flex items-center text-xs text-muted-foreground px-2 py-1 rounded bg-muted">
            {approved.size} / {objectives.length} genehmigt
          </span>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || objectives.length === 0}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Speichert...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              {isFinalStep ? 'Einheit erstellen' : 'Speichern & Weiter'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}