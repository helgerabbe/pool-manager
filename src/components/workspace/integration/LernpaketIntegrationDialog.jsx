/**
 * LernpaketIntegrationDialog.jsx
 *
 * Übernahme-Dialog der Fachschaftsleitung: Ziel-Themenfeld und Position
 * wählen, dann das angebotene Lernpaket als Kopie integrieren.
 * Dubletten-Titel müssen ausdrücklich bestätigt werden.
 */
import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Download, Loader2, AlertTriangle } from 'lucide-react';

export default function LernpaketIntegrationDialog({ open, onOpenChange, angebot, einheit, onIntegrated }) {
  const queryClient = useQueryClient();
  const [themenfeldId, setThemenfeldId] = useState('');
  const [position, setPosition] = useState('ende');
  const [busy, setBusy] = useState(false);
  const [dublettenWarnung, setDublettenWarnung] = useState('');

  const { data: themenfelder = [] } = useQuery({
    queryKey: ['integration-themenfelder', einheit?.id],
    queryFn: () => base44.entities.Themenfeld.filter({ einheit_id: einheit.id }),
    enabled: open && !!einheit?.id,
  });

  const { data: alleLernpakete = [] } = useQuery({
    queryKey: ['integration-lernpakete', einheit?.id],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: einheit.id }),
    enabled: open && !!einheit?.id,
  });

  const paketeImThemenfeld = useMemo(() => (
    alleLernpakete
      .filter(p => p.sync_status !== 'to_delete' && (themenfeldId ? p.themenfeld_id === themenfeldId : !p.themenfeld_id))
      .sort((a, b) => (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0))
  ), [alleLernpakete, themenfeldId]);

  const integrieren = async (force) => {
    setBusy(true);
    try {
      const res = await base44.functions.invoke('integrateLernpaketSecure', {
        lernpaket_id: angebot.paket.id,
        einheit_id: einheit.id,
        themenfeld_id: themenfeldId || null,
        position: position === 'ende' ? paketeImThemenfeld.length : Number(position),
        force: force === true,
      });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      toast.success(`„${data.titel}" wurde als neues Lernpaket integriert. Bitte Inhalte prüfen und freigeben.`);
      queryClient.invalidateQueries({ queryKey: ['workspace-data'] });
      queryClient.invalidateQueries({ queryKey: ['lernpakete'] });
      onIntegrated?.();
      onOpenChange(false);
    } catch (err) {
      const data = err?.response?.data;
      if (data?.code === 'DUPLICATE_TITLE') {
        setDublettenWarnung(data.error);
      } else {
        toast.error(data?.error || err?.message || 'Integration fehlgeschlagen.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" /> Lernpaket integrieren
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground">
            „<strong>{angebot?.paket?.titel_des_pakets}</strong>" wird als <strong>Kopie</strong> in diese Einheit
            übernommen. Die Kopie startet als Entwurf und muss danach geprüft und freigegeben werden.
            Später kommen keine Änderungen aus dem Original mehr nach.
          </p>

          <div className="space-y-2">
            <Label>Themenfeld</Label>
            <Select value={themenfeldId} onValueChange={(v) => { setThemenfeldId(v); setPosition('ende'); setDublettenWarnung(''); }}>
              <SelectTrigger><SelectValue placeholder="Themenfeld wählen…" /></SelectTrigger>
              <SelectContent>
                {themenfelder.map(tf => (
                  <SelectItem key={tf.id} value={tf.id}>{tf.titel}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Position</Label>
            <Select value={String(position)} onValueChange={setPosition}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">An erster Stelle</SelectItem>
                {paketeImThemenfeld.map((p, i) => (
                  <SelectItem key={p.id} value={String(i + 1)}>Nach „{p.titel_des_pakets}"</SelectItem>
                ))}
                <SelectItem value="ende">Am Ende</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Nicht mitkopiert werden: Verknüpfungen zu Allgemeinen Aufgaben und Basis-Lernzielen sowie
            Export-Zustände. Das Paket taucht als neues Element in den Lerntyp-Dashboards auf und muss
            dort noch eingeplant werden.
          </div>

          {dublettenWarnung && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{dublettenWarnung} Trotzdem integrieren?</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Abbrechen</Button>
          {dublettenWarnung ? (
            <Button variant="destructive" onClick={() => integrieren(true)} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
              Trotzdem integrieren
            </Button>
          ) : (
            <Button onClick={() => integrieren(false)} disabled={busy || !themenfeldId} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Integrieren
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}