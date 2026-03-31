import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2, Puzzle, Target, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';

// Templates pro Kategorie (Ebene-1-Bausteine)
const TEMPLATES = {
  'Fachwissen':          ['Fakten-Input', 'Drill-Übung'],
  'Fähigkeit/Fertigkeit':['Input/Erklärung', 'Infoseite/Cheat-Sheet', 'Musterlösung', 'Übungsaufgaben'],
};

export default function WizardStep4Bausteine({ einheitId, onDone }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['lernpakete'],
    queryFn: () => base44.entities.Lernpakete.list(),
  });
  const { data: lernziele = [] } = useQuery({
    queryKey: ['lernziele'],
    queryFn: () => base44.entities.Lernziele.list(),
  });
  const { data: aufgaben = [] } = useQuery({
    queryKey: ['aufgaben'],
    queryFn: () => base44.entities.Aufgabenbausteine.list(),
  });

  const paketeFuerEinheit = lernpakete
    .filter(lp => lp.einheit_id === einheitId)
    .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0));

  const zieleFuerEinheit = lernziele.filter(lz =>
    paketeFuerEinheit.some(lp => lp.id === lz.lernpaket_id)
  );

  const aufgabenIds = new Set(aufgaben.filter(a =>
    paketeFuerEinheit.some(lp => lp.id === a.lernpaket_id)
  ).map(a => a.lernziel_id + '_' + a.baustein_typ));

  // Preview: welche Bausteine würden angelegt?
  const preview = [];
  for (const ziel of zieleFuerEinheit) {
    const typen = TEMPLATES[ziel.kategorie] || [];
    for (const typ of typen) {
      const key = ziel.id + '_' + typ;
      if (!aufgabenIds.has(key)) {
        preview.push({ ziel, typ });
      }
    }
  }

  const handleGenerieren = async () => {
    setGenerating(true);
    let count = 0;
    for (const { ziel, typ } of preview) {
      await base44.entities.Aufgabenbausteine.create({
        lernpaket_id: ziel.lernpaket_id,
        lernziel_id: ziel.id,
        baustein_typ: typ,
        anforderungsebene: '1 - Basis',
        sync_status: 'new',
      });
      count++;
    }
    queryClient.invalidateQueries({ queryKey: ['aufgaben'] });
    toast.success(`${count} Aufgabenbausteine automatisch angelegt.`);
    setGenerating(false);
    setDone(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Schritt 4: Basis-Befüllung</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Für jedes Ebene-1-Lernziel werden automatisch Pflicht-Aktivitäten vorgeschlagen.
          Fachwissen → 2 Bausteine, Fähigkeit → 4 Bausteine.
        </p>
      </div>

      {paketeFuerEinheit.length === 0 ? (
        <p className="text-muted-foreground text-sm italic text-center py-8">
          Es wurden noch keine Lernpakete angelegt. Sie können diesen Schritt überspringen.
        </p>
      ) : (
        <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
          {paketeFuerEinheit.map(paket => {
            const ziele = zieleFuerEinheit.filter(lz => lz.lernpaket_id === paket.id);
            if (ziele.length === 0) return null;
            return (
              <div key={paket.id} className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/40">
                  <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                    {paket.reihenfolge_nummer}
                  </div>
                  <span className="text-sm font-medium truncate">{paket.titel_des_pakets}</span>
                </div>
                <div className="divide-y divide-border">
                  {ziele.map(ziel => {
                    const typen = TEMPLATES[ziel.kategorie] || [];
                    return (
                      <div key={ziel.id} className="px-3 py-2 flex items-start gap-2">
                        <Target className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground truncate">{ziel.formulierung_fachsprache}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {typen.map(typ => (
                              <Badge key={typ} className="text-[10px] bg-primary/10 text-primary gap-1">
                                <Puzzle className="w-2.5 h-2.5" />{typ}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {preview.length > 0 && !done && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-primary">
          <strong>{preview.length} Aufgabenbausteine</strong> werden automatisch angelegt.
        </div>
      )}

      <div className="flex justify-between pt-2 border-t border-border">
        <Button variant="outline" onClick={onDone} className="text-muted-foreground">
          Überspringen → Zum Workspace
        </Button>
        {!done ? (
          <Button onClick={handleGenerieren} disabled={generating || preview.length === 0} className="gap-2">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Puzzle className="w-4 h-4" />}
            {preview.length} Bausteine generieren
          </Button>
        ) : (
          <Button onClick={onDone} className="gap-2 bg-green-600 hover:bg-green-700">
            <Check className="w-4 h-4" />
            Zum Workspace
          </Button>
        )}
      </div>
    </div>
  );
}