import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ChevronRight, Loader2, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function WizardStepLernziele({ einheitId, onDone }) {
  const queryClient = useQueryClient();
  const [objectives, setObjectives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
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

  const generateObjectives = async (pakete) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('generateLearningObjectives', {
        einheitId,
        lernpakete: pakete.map(p => ({ id: p.id, titel_des_pakets: p.titel_des_pakets })),
      });
      setObjectives(response.data.objectives || []);
    } catch (err) {
      setError(err.message || 'Fehler bei der KI-Generierung');
      toast.error('Fehler beim Generieren der Lernziele');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    await generateObjectives(paketeFuerEinheit);
    setRegenerating(false);
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
      const existingLz = await base44.entities.Lernziele.list();
      const paketIds = new Set(paketeFuerEinheit.map(p => p.id));
      const toDelete = existingLz.filter(lz => paketIds.has(lz.lernpaket_id));
      
      for (const lz of toDelete) {
        await base44.entities.Lernziele.delete(lz.id);
      }

      // Erstelle neue Lernziele
      for (const obj of objectives) {
        if (obj.ziel_fach?.trim()) {
          await base44.entities.Lernziele.create({
            lernpaket_id: obj.lernpaket_id,
            formulierung_fachsprache: obj.ziel_fach.trim(),
            kategorie: 'Fachwissen',
            schueler_uebersetzung: obj.ziel_schueler?.trim() || '',
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['lernziele'] });
      toast.success(`${objectives.length} Lernziele gespeichert.`);
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
          {objectives.map((obj, idx) => (
            <div key={idx} className="p-4 border border-border rounded-lg bg-card space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">{obj.lernpaket_titel}</h3>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
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
          ))}
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-border gap-2">
        <Button
          variant="outline"
          onClick={handleRegenerate}
          disabled={regenerating || objectives.length === 0}
          className="gap-2"
        >
          {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Neu generieren
        </Button>
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
              Speichern & Weiter
            </>
          )}
        </Button>
      </div>
    </div>
  );
}