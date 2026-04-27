import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Loader2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import HelpBadge from '@/components/ui/HelpBadge';

export default function GesamtzielManager({ einheitId, gesamtziele = [], onUpdate }) {
  const [ziele, setZiele] = useState(gesamtziele);
  const [newZiel, setNewZiel] = useState('');
  const [saving, setSaving] = useState(false);

  // Synchronisiere mit externen Props-Updates (z.B. nach Refetch durch Parent)
  // aber NUR wenn gerade kein Speichervorgang läuft (sonst würden lokale Änderungen überschrieben)
  const prevGesamtziele = useRef(gesamtziele);
  useEffect(() => {
    if (!saving && gesamtziele !== prevGesamtziele.current) {
      setZiele(gesamtziele);
    }
    prevGesamtziele.current = gesamtziele;
  }, [gesamtziele, saving]);

  const handleAddZiel = async () => {
    if (!newZiel.trim()) return;
    
    setSaving(true);
    try {
      const vollstaendigesZiel = `Du kannst ${newZiel.trim()}`;
      const updatedZiele = [...ziele, vollstaendigesZiel];
      await base44.entities.Einheiten.update(einheitId, { gesamtziele: updatedZiele });
      setZiele(updatedZiele);
      setNewZiel('');
      onUpdate?.(updatedZiele);
      toast.success('Gesamtziel hinzugefügt.');
    } catch {
      toast.error('Fehler beim Speichern des Gesamtziels.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveZiel = async (index) => {
    setSaving(true);
    try {
      const updatedZiele = ziele.filter((_, i) => i !== index);
      await base44.entities.Einheiten.update(einheitId, { gesamtziele: updatedZiele });
      setZiele(updatedZiele);
      onUpdate?.(updatedZiele);
      toast.success('Gesamtziel entfernt.');
    } catch {
      toast.error('Fehler beim Entfernen des Gesamtziels.');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddZiel();
    }
  };

  return (
    <div className="space-y-3">
      <Label className="flex items-center gap-1.5">
        Gesamtziele der Einheit
        <HelpBadge
          text="Gesamtziele sind die großen Grobziele dieser Einheit – nicht alle einzelnen Lernziele, die in der Einheit vorkommen. Sie bilden später die Kompetenzkarte und beschreiben in wenigen Sätzen, was Schüler nach Abschluss der Einheit übergreifend können."
        />
      </Label>
      
      {/* Bestehende Ziele */}
      {ziele.length > 0 && (
        <div className="space-y-2">
          {ziele.map((ziel, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-lg border bg-blue-50 border-blue-200 group"
            >
              <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <p className="text-sm text-foreground flex-1 pt-0.5">{ziel}</p>
              <button
                onClick={() => handleRemoveZiel(idx)}
                disabled={saving}
                className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                title="Ziel entfernen"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Satzanfang-Vorlage */}
      <p className="text-sm italic text-muted-foreground">Du kannst<span className="font-light">…</span></p>

      {/* Eingabefeld für neues Ziel */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Input
            placeholder="Eingabe vervollständigen (z.B. ‚Gedichte interpretieren')"
            value={newZiel}
            onChange={e => setNewZiel(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
            className="text-sm"
          />
        </div>
        <Button
          onClick={handleAddZiel}
          disabled={!newZiel.trim() || saving}
          size="sm"
          className="gap-1.5 shrink-0"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Check className="w-4 h-4" />
          )}
          Bestätigen
        </Button>
      </div>

      {ziele.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Noch keine Gesamtziele gesetzt. Diese bilden später die Kompetenz-Karte.
        </p>
      )}
    </div>
  );
}