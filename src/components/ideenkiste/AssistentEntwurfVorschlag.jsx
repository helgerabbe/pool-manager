import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Check, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Vom Aufgaben-Assistenten erarbeiteter Entwurf mit
 * "In die Ideenkiste übernehmen"-Aktion.
 */
export default function AssistentEntwurfVorschlag({ entwurf, einheitId, materialien = [], onUebernommen }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleUebernehmen = async () => {
    setSaving(true);
    try {
      await base44.entities.AufgabenIdee.create({
        einheit_id: einheitId,
        titel: entwurf.titel || 'Aufgaben-Idee',
        beschreibung: entwurf.beschreibung || '',
        aufgabentyp_vorschlag: entwurf.aufgabentyp_vorschlag || '',
        material_urls: materialien,
        status: 'offen',
      });
      queryClient.invalidateQueries({ queryKey: ['aufgaben-ideen', einheitId] });
      setSaved(true);
      toast.success('Entwurf in der Ideenkiste gespeichert.');
      onUebernommen?.();
    } catch (_err) {
      toast.error('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-amber-300 bg-amber-50/70 p-3 space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
        <Lightbulb className="w-3.5 h-3.5" />
        Entwurf des Assistenten
      </p>
      <p className="text-sm font-semibold">{entwurf.titel}</p>
      <p className="text-xs text-muted-foreground whitespace-pre-line">{entwurf.beschreibung}</p>
      {entwurf.aufgabentyp_vorschlag && (
        <p className="text-xs">
          <span className="font-medium">Empfohlene Aufgabenform:</span> {entwurf.aufgabentyp_vorschlag}
        </p>
      )}
      <Button size="sm" onClick={handleUebernehmen} disabled={saving || saved} className="w-full gap-1.5">
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        {saved ? 'In der Ideenkiste gespeichert' : 'In die Ideenkiste übernehmen'}
      </Button>
    </div>
  );
}