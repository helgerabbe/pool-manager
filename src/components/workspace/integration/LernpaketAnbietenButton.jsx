/**
 * LernpaketAnbietenButton.jsx
 *
 * Privat-Bereich: Ein fertiges Lernpaket einer gemeinschaftlichen
 * Poolzeit-Einheit zur Integration anbieten (bzw. Angebot zurückziehen).
 * Die Übernahme entscheidet dort die Fachschaftsleitung.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Send, Loader2, Share2, Undo2 } from 'lucide-react';

export default function LernpaketAnbietenButton({ paket, einheit }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [zielId, setZielId] = useState('');
  const [busy, setBusy] = useState(false);

  const istAngeboten = paket?.integration_status === 'angeboten';

  const { data: poolzeitEinheiten = [] } = useQuery({
    queryKey: ['poolzeit-einheiten-fach', einheit?.fach],
    queryFn: () => base44.entities.Einheiten.filter({ fach: einheit.fach, sichtbarkeit: 'oeffentlich' }),
    enabled: open && !!einheit?.fach,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['workspace-data'] });
    queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
  };

  const call = async (zielEinheitId) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('offerLernpaketIntegrationSecure', {
        lernpaket_id: paket.id,
        ziel_einheit_id: zielEinheitId,
      });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      toast.success(zielEinheitId
        ? `Lernpaket wurde „${data.ziel_einheit_titel}" zur Integration angeboten.`
        : 'Angebot zurückgezogen.');
      setOpen(false);
      invalidate();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Aktion fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  if (istAngeboten) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => call(null)}
        disabled={busy}
        className="gap-2 border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100"
        title="Das Lernpaket ist zur Integration angeboten — Angebot zurückziehen"
      >
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Undo2 className="w-3.5 h-3.5" />}
        Angebot zurückziehen
      </Button>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100"
        title="Dieses Lernpaket einer gemeinschaftlichen Einheit zur Integration anbieten"
      >
        <Share2 className="w-3.5 h-3.5" /> Zur Integration anbieten
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-teal-700" /> Lernpaket zur Integration anbieten
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Die Fachschaftsleitung der gewählten Einheit sieht dein Lernpaket, kann es prüfen und
              als Kopie in ein Themenfeld übernehmen. Dein Original bleibt unverändert bei dir.
            </p>
            <div className="space-y-2">
              <Label>Ziel-Einheit ({einheit?.fach})</Label>
              <Select value={zielId} onValueChange={setZielId}>
                <SelectTrigger><SelectValue placeholder="Gemeinschaftliche Einheit wählen…" /></SelectTrigger>
                <SelectContent>
                  {poolzeitEinheiten.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.titel_der_einheit} <span className="text-muted-foreground">· Jg. {e.jahrgangsstufe}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {poolzeitEinheiten.length === 0 && (
                <p className="text-xs text-muted-foreground">Keine gemeinschaftliche Einheit in diesem Fach vorhanden.</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>Abbrechen</Button>
            <Button onClick={() => call(zielId)} disabled={!zielId || busy} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Anbieten
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}