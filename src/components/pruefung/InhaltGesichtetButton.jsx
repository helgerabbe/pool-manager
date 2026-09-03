/**
 * InhaltGesichtetButton — bestätigt, dass die Lehrkraft einen KI-erzeugten
 * Text angesehen hat.
 *
 * Hintergrund: Bis 2026-09-03 gingen KI-Texte ungesehen in den Kurs. Der
 * Knopf ist deshalb bewusst pro Stelle und nicht als Sammelaktion gebaut —
 * eine Sammelbestätigung wäre genau der Blick, der gefehlt hat.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InhaltGesichtetButton({ snapshotId, onGesichtet }) {
  const [laeuft, setLaeuft] = useState(false);

  const bestaetigen = async () => {
    setLaeuft(true);
    try {
      await base44.functions.invoke('markInhaltGesichtet', { snapshotId });
      toast.success('Als angesehen bestätigt.');
      onGesichtet?.();
    } catch (e) {
      toast.error('Fehler: ' + (e?.response?.data?.error || e.message));
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Button size="sm" onClick={bestaetigen} disabled={laeuft || !snapshotId}>
      {laeuft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
      Angesehen &amp; bestätigt
    </Button>
  );
}