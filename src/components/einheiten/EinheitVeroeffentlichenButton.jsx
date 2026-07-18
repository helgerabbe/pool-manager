import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

/**
 * Button + Bestätigungsdialog, um eine PRIVATE Einheit zur POOLZEIT-EINHEIT
 * zu machen (sichtbarkeit → 'oeffentlich', strenge Poolzeit-Regeln gelten).
 * Backend: setEinheitSichtbarkeitSecure (nur Fachschaftsleitung im Fach / Admin).
 */
export default function EinheitVeroeffentlichenButton({ einheit, showLabel = false }) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const handlePublish = async () => {
    setIsSaving(true);
    try {
      const res = await base44.functions.invoke('setEinheitSichtbarkeitSecure', {
        einheit_id: einheit.id,
        sichtbarkeit: 'oeffentlich',
      });
      if (res.data?.success) {
        toast.success(`„${einheit.titel_der_einheit}" ist jetzt eine Poolzeit-Einheit.`);
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        toast.error(res.data?.error || 'Veröffentlichen fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Veröffentlichen fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-emerald-700 hover:border-emerald-400/50 hover:bg-emerald-50 transition-all flex items-center gap-1.5"
        title="Zur Poolzeit-Einheit machen — nur Fachschaftsleitung/Admin. Die Einheit wird verbindlich und unterliegt den strengen Poolzeit-Regeln."
      >
        <Globe className="w-4 h-4" />
        {showLabel && <span className="text-xs font-medium">Zur Poolzeit-Einheit</span>}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zur Poolzeit-Einheit machen?</DialogTitle>
            <DialogDescription>
              „{einheit.titel_der_einheit}" verlässt den Privatbereich und wird zur
              verbindlichen Poolzeit-Einheit (sichtbar nach den üblichen Fach- und
              Rollen-Regeln). Ab dann gelten die strengen Regeln für Poolzeit-Einheiten.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Abbrechen</Button>
            <Button onClick={handlePublish} disabled={isSaving} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <Globe className="w-4 h-4" />
              Zur Poolzeit-Einheit machen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}