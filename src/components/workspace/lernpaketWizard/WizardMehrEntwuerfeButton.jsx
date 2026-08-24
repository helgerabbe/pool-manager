/**
 * components/workspace/lernpaketWizard/WizardMehrEntwuerfeButton.jsx
 *
 * Legt für eine masterfähige Aktivität direkt im Lernpaket-Wizard weitere
 * KI-Entwürfe (Master-Aufgaben) an — 1 bis 5 Stück am Stück.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';

export default function WizardMehrEntwuerfeButton({ activity, disabled = false, onChanged }) {
  const [anzahl, setAnzahl] = useState(3);
  const [laeuft, setLaeuft] = useState(false);

  const erstellen = async () => {
    setLaeuft(true);
    try {
      const res = await base44.functions.invoke('generateWizardAktivitaetInhalt', {
        activityId: activity.id,
        varianten: anzahl,
        zusaetzlich: true,
      });
      const data = res?.data || {};
      if (data.success) {
        toast.success(`${data.varianten || anzahl} neue KI-Entwürfe erstellt.`);
        onChanged?.();
      } else {
        toast.error(data.reason || data.error || 'Es konnten keine neuen Entwürfe erstellt werden.');
      }
    } catch (err) {
      console.error('[WizardMehrEntwuerfeButton] failed', err);
      toast.error('Erstellung fehlgeschlagen.');
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="flex items-center gap-2 pl-7 py-1.5 px-3 border-t border-border/60 bg-muted/20 text-[11px]">
      <select
        value={anzahl}
        onChange={(e) => setAnzahl(Number(e.target.value))}
        disabled={disabled || laeuft}
        className="h-6 rounded border border-input bg-background px-1.5 text-[11px] disabled:opacity-50"
        title="Wie viele neue KI-Entwürfe sollen erstellt werden?"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>{n}</option>
        ))}
      </select>
      <button
        type="button"
        onClick={erstellen}
        disabled={disabled || laeuft}
        className="inline-flex items-center gap-1 text-primary hover:underline disabled:opacity-50"
        title="Weitere Master-Aufgaben (KI-Entwürfe) mit anderen Inhalten erstellen"
      >
        {laeuft ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
        {laeuft ? 'Entwürfe werden erstellt …' : 'mehr KI-Entwürfe erstellen'}
      </button>
    </div>
  );
}