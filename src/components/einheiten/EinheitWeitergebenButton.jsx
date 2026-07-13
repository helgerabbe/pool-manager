import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

/**
 * "An Kollegen weitergeben": erstellt eine unabhängige, private Kopie
 * dieser Einheit im Privatbereich der ausgewählten Person
 * (Backend: duplicateEinheitSecure mit target_email).
 */
export default function EinheitWeitergebenButton({ einheit }) {
  const [open, setOpen] = useState(false);
  const [targetEmail, setTargetEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();

  const { data: kollegen = [], isLoading } = useQuery({
    queryKey: ['kollegen-liste'],
    queryFn: async () => {
      const res = await base44.functions.invoke('listKollegen', {});
      return res.data?.kollegen || [];
    },
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const handleSend = async () => {
    setIsSending(true);
    try {
      const res = await base44.functions.invoke('duplicateEinheitSecure', {
        einheit_id: einheit.id,
        target_email: targetEmail,
      });
      if (res.data?.success) {
        const empfaenger = kollegen.find((k) => k.email === targetEmail);
        toast.success(`Kopie an ${empfaenger?.full_name || targetEmail} weitergegeben.`);
        setOpen(false);
        setTargetEmail('');
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        toast.error(res.data?.error || 'Weitergeben fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Weitergeben fehlgeschlagen.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-blue-50 transition-all"
        title="An Kollegen weitergeben — eigene Kopie im Privatbereich des Empfängers"
      >
        <Send className="w-4 h-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>An Kollegen weitergeben</DialogTitle>
            <DialogDescription>
              „{einheit.titel_der_einheit}" wird als unabhängige Kopie in den Privatbereich
              der ausgewählten Person gelegt. Ihr Original bleibt unverändert bei Ihnen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Empfänger:in *</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={targetEmail}
              onChange={(e) => setTargetEmail(e.target.value)}
            >
              <option value="" disabled>
                {isLoading ? 'Kollegen werden geladen...' : 'Kolleg:in auswählen...'}
              </option>
              {kollegen.map((k) => (
                <option key={k.email} value={k.email}>
                  {k.full_name} ({k.rolle})
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSending}>Abbrechen</Button>
            <Button onClick={handleSend} disabled={!targetEmail || isSending} className="gap-2">
              {isSending && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <Send className="w-4 h-4" />
              Weitergeben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}