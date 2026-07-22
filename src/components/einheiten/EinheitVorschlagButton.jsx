import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';

/**
 * Button + Dialog: Eine PRIVATE Einheit der Fachschaftsleitung "zur
 * Veröffentlichung als Poolzeit-Einheit" vorschlagen (bzw. den Vorschlag
 * zurückziehen). Die Einheit erscheint dann im Poolzeit-Bereich des Fachs
 * in der Sektion "Zur Veröffentlichung vorgeschlagen" — nur im Ansichtsmodus.
 * Backend: setEinheitVeroeffentlichungVorschlagSecure.
 */
export default function EinheitVorschlagButton({ einheit }) {
  const [open, setOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const istVorgeschlagen = einheit.zur_veroeffentlichung_vorgeschlagen === true;

  const handleToggle = async () => {
    setIsSaving(true);
    try {
      const res = await base44.functions.invoke('setEinheitVeroeffentlichungVorschlagSecure', {
        einheit_id: einheit.id,
        vorgeschlagen: !istVorgeschlagen,
      });
      if (res.data?.success) {
        toast.success(
          istVorgeschlagen
            ? 'Vorschlag zurückgezogen.'
            : `„${einheit.titel_der_einheit}" wurde der Fachschaftsleitung zur Veröffentlichung vorgeschlagen.`
        );
        setOpen(false);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        toast.error(res.data?.error || 'Aktion fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Aktion fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className={`p-1.5 rounded-md backdrop-blur-sm border transition-all flex items-center gap-1.5 ${
          istVorgeschlagen
            ? 'bg-sky-50 border-sky-300 text-sky-700 hover:bg-sky-100'
            : 'bg-white/80 border-border text-muted-foreground hover:text-sky-700 hover:border-sky-400/50 hover:bg-sky-50'
        }`}
        title={
          istVorgeschlagen
            ? 'Diese Einheit ist der Fachschaftsleitung zur Veröffentlichung vorgeschlagen. Klicken, um den Vorschlag zurückzuziehen.'
            : 'Der Fachschaftsleitung zur Veröffentlichung als Poolzeit-Einheit vorschlagen. Die Einheit erscheint dann im Poolzeit-Bereich zur Ansicht — die Freigabe trifft die Fachschaftsleitung.'
        }
      >
        {istVorgeschlagen ? <Undo2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {istVorgeschlagen ? 'Vorschlag zurückziehen?' : 'Zur Veröffentlichung vorschlagen?'}
            </DialogTitle>
            <DialogDescription>
              {istVorgeschlagen
                ? `„${einheit.titel_der_einheit}" wird aus der Sektion „Zur Veröffentlichung vorgeschlagen" entfernt und bleibt eine private Einheit.`
                : `„${einheit.titel_der_einheit}" erscheint für die Kolleg:innen des Fachs im Poolzeit-Bereich unter „Zur Veröffentlichung vorgeschlagen" — dort nur im Ansichtsmodus. Ob sie tatsächlich Poolzeit-Einheit wird, entscheidet die Fachschaftsleitung (oder ein Administrator). Ihre Einheit bleibt bis dahin privat und Sie können weiter daran arbeiten.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>Abbrechen</Button>
            <Button onClick={handleToggle} disabled={isSaving} className="gap-2 bg-sky-600 hover:bg-sky-700">
              {isSaving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {istVorgeschlagen ? <Undo2 className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              {istVorgeschlagen ? 'Vorschlag zurückziehen' : 'Vorschlagen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}