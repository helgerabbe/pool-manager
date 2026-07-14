/**
 * LerntypNamenEditor
 * ────────────────────────────────────────────────────────────────────
 * Admin-Verwaltung: schulweite Anzeigenamen + Untertitel der vier
 * Lerntypen bearbeiten (LerntypDefinition-Entity, Overrides über die
 * System-Defaults). Die technischen Schlüssel bleiben fix — so bleibt
 * die Option offen, später (Stufe 2) frei definierbare Lerntypen zu bauen.
 */
import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { LERNTYPEN } from '@/lib/lerntypen';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function LerntypNamenEditor() {
  const queryClient = useQueryClient();
  const { data: defs = [], isLoading } = useQuery({
    queryKey: ['lerntypDefinitionen'],
    queryFn: () => base44.entities.LerntypDefinition.list(),
  });

  const [rows, setRows] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const next = {};
    for (const lt of LERNTYPEN) {
      const d = defs.find((x) => x.schluessel === lt.key);
      next[lt.key] = {
        anzeigename: d?.anzeigename ?? lt.name,
        untertitel: d?.untertitel ?? lt.untertitel,
      };
    }
    setRows(next);
  }, [defs]);

  const setField = (key, field, value) =>
    setRows((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const lt of LERNTYPEN) {
        const row = rows[lt.key] || {};
        const payload = {
          schluessel: lt.key,
          anzeigename: row.anzeigename?.trim() || lt.name,
          untertitel: row.untertitel?.trim() || lt.untertitel,
        };
        const existing = defs.find((x) => x.schluessel === lt.key);
        if (existing) await base44.entities.LerntypDefinition.update(existing.id, payload);
        else await base44.entities.LerntypDefinition.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['lerntypDefinitionen'] });
      toast.success('Lerntyp-Namen gespeichert. Sie gelten ab sofort schulweit.');
    } catch (err) {
      toast.error(`Speichern fehlgeschlagen: ${err?.message || 'Unbekannter Fehler'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Namen der Lerntypen</p>
          <p className="text-xs text-muted-foreground">
            Lege schulweit fest, wie die vier Lerntypen heißen (z. B. „Lernweg" statt „Lerntyp").
            Die technischen Schlüssel bleiben unverändert.
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving || isLoading} className="gap-1.5 shrink-0">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Speichern
        </Button>
      </div>
      <div className="space-y-2">
        {LERNTYPEN.map((lt) => (
          <div key={lt.key} className="flex flex-col sm:flex-row sm:items-center gap-2">
            <Badge variant="outline" className="w-28 justify-center shrink-0 font-mono text-[10px]">
              {lt.key}
            </Badge>
            <Input
              value={rows[lt.key]?.anzeigename ?? ''}
              onChange={(e) => setField(lt.key, 'anzeigename', e.target.value)}
              placeholder={lt.name}
              className="sm:w-48 h-8 text-sm"
            />
            <Input
              value={rows[lt.key]?.untertitel ?? ''}
              onChange={(e) => setField(lt.key, 'untertitel', e.target.value)}
              placeholder={lt.untertitel}
              className="flex-1 h-8 text-sm"
            />
          </div>
        ))}
      </div>
    </div>
  );
}