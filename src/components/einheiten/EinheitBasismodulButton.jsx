import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Layers, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

/**
 * Button + Aufklärungs-Dialog, um eine PRIVATE Einheit in ein BASISMODUL
 * umzuwandeln. Dabei werden Dashboards sowie alle Allgemeinen Aufgaben und
 * Projektaufgaben unwiderruflich entfernt — nur die Lernpakete bleiben.
 * Backend: convertEinheitZuBasismodulSecure (nur Fachschaftsleitung im Fach / Admin).
 */
export default function EinheitBasismodulButton({ einheit }) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  const handleConvert = async () => {
    setIsSaving(true);
    try {
      const res = await base44.functions.invoke('convertEinheitZuBasismodulSecure', {
        einheit_id: einheit.id,
      });
      if (res.data?.success) {
        toast.success(`„${einheit.titel_der_einheit}" ist jetzt ein Basismodul.`);
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
        queryClient.invalidateQueries({ queryKey: ['basismodule'] });
      } else {
        toast.error(res.data?.error || 'Umwandlung fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Umwandlung fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="p-1.5 rounded-md bg-white/80 backdrop-blur-sm border border-border text-muted-foreground hover:text-amber-700 hover:border-amber-400/50 hover:bg-amber-50 transition-all flex items-center gap-1.5"
        title="Zum Basismodul machen — nur Fachschaftsleitung/Admin. Dashboards, Allgemeine Aufgaben und Projektaufgaben werden dabei entfernt; nur die Lernpakete bleiben erhalten."
      >
        <Layers className="w-4 h-4" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Zum Basismodul machen?</DialogTitle>
            <DialogDescription>
              „{einheit.titel_der_einheit}" verlässt den Privatbereich und wird zum
              Basismodul (Wissensspeicher für nachfolgende Jahrgänge).
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
            <p className="text-sm font-semibold text-amber-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Wichtig: Basismodule verfügen nur über Lernpakete
            </p>
            <ul className="text-sm text-amber-900 list-disc pl-5 space-y-1">
              <li>Alle <strong>Allgemeinen Aufgaben</strong> werden unwiderruflich entfernt.</li>
              <li>Alle <strong>Projektaufgaben</strong> werden unwiderruflich entfernt.</li>
              <li>Alle <strong>Lerntyp-Dashboards</strong> werden entfernt.</li>
              <li>Nur die <strong>Themenfelder und Lernpakete</strong> bleiben erhalten.</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Abbrechen</Button>
            <Button onClick={handleConvert} disabled={isSaving} className="gap-2 bg-amber-600 hover:bg-amber-700">
              {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <Layers className="w-4 h-4" />
              Zum Basismodul machen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}