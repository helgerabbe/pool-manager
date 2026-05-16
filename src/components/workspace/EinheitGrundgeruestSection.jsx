import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { invokeFunction } from '@/utils/functionsHelper';
import { Brain, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import GrundgeruestAnalyseDialog from './GrundgeruestAnalyseDialog';

export default function EinheitGrundgeruestSection({ einheit, canEdit, onSaved }) {
  const [text, setText] = useState(einheit.grundgeruest_rohtext || '');
  const [structured, setStructured] = useState(einheit.grundgeruest_strukturiert || null);
  const [isSaving, setIsSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setText(einheit.grundgeruest_rohtext || '');
    setStructured(einheit.grundgeruest_strukturiert || null);
  }, [einheit.id, einheit.grundgeruest_rohtext, einheit.grundgeruest_strukturiert]);

  const status = text.trim() ? (structured ? 'analysiert' : 'entwurf') : 'leer';

  const handleSave = async () => {
    setIsSaving(true);
    await invokeFunction('updateEinheitSecure', {
      einheit_id: einheit.id,
      grundgeruest_rohtext: text,
      grundgeruest_strukturiert: structured,
      grundgeruest_status: status,
      grundgeruest_updated_at: new Date().toISOString(),
    });
    await onSaved?.();
    toast.success('Grundgerüst gespeichert.');
    setIsSaving(false);
  };

  return (
    <section className="space-y-4 p-5 rounded-xl border bg-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Grundgerüst der Einheit
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Didaktischer Gesamtkontext für spätere KI-Funktionen: Ziele, Material, Software, Grenzen und Besonderheiten.
          </p>
        </div>
        <Badge variant="outline">{status}</Badge>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!canEdit}
        className="min-h-[220px] text-sm"
        placeholder="Beschreibe hier frei, worum es in der Einheit geht: Was sollen Schüler lernen? Welche Materialien, Software oder Quellen werden genutzt? Was gehört ausdrücklich nicht dazu? Welche Begriffe und Grenzen sind wichtig?"
      />

      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Tipp: Du kannst einen Rohtext einfügen und ihn in der KI-Sandbox strukturieren lassen.
        </p>
        {canEdit && (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
              <Sparkles className="w-4 h-4" /> KI-Sandbox
            </Button>
            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Speichern
            </Button>
          </div>
        )}
      </div>

      <GrundgeruestAnalyseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        einheit={einheit}
        initialText={text}
        onApply={(nextText, nextStructured) => {
          setText(nextText);
          setStructured(nextStructured);
          toast.success('Sandbox-Ergebnis übernommen. Bitte noch speichern.');
        }}
      />
    </section>
  );
}