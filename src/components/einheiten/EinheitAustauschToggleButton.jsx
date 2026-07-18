import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Library } from 'lucide-react';

/**
 * Schaltet eine PRIVATE Einheit für die Austausch-Bibliothek frei
 * (bzw. zieht die Freigabe zurück). Backend: setEinheitAustauschSecure
 * (Besitzer oder Administrator).
 */
export default function EinheitAustauschToggleButton({ einheit }) {
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();
  const istFreigegeben = einheit.im_austausch === true;

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsSaving(true);
    try {
      const res = await base44.functions.invoke('setEinheitAustauschSecure', {
        einheit_id: einheit.id,
        im_austausch: !istFreigegeben,
      });
      if (res.data?.success) {
        toast.success(
          istFreigegeben
            ? `„${einheit.titel_der_einheit}" wurde aus der Austausch-Bibliothek zurückgezogen.`
            : `„${einheit.titel_der_einheit}" ist jetzt für das Kollegium freigegeben.`
        );
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        toast.error(res.data?.error || 'Änderung fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Änderung fehlgeschlagen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isSaving}
      className={`p-1.5 rounded-md border transition-all flex items-center gap-1.5 ${
        istFreigegeben
          ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
          : 'bg-white/80 backdrop-blur-sm border-border text-muted-foreground hover:text-emerald-700 hover:border-emerald-400/50 hover:bg-emerald-50'
      } disabled:opacity-60`}
      title={
        istFreigegeben
          ? 'Freigabe zurückziehen — Einheit verschwindet aus der Austausch-Bibliothek (gezogene Kopien bleiben erhalten)'
          : 'Für Kollegium freigeben — Einheit erscheint in der Austausch-Bibliothek, Kolleg:innen können sich eine private Kopie ziehen'
      }
    >
      {isSaving
        ? <div className="w-4 h-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
        : <Library className="w-4 h-4" />
      }
    </button>
  );
}