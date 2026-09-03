/**
 * InternenInhaltErzeugenButton — erzeugt GENAU EINEN vorab per KI erstellbaren
 * Inhalt direkt aus seiner Befund-Kachel (z. B. eine Themenfeld-Einführung).
 *
 * Bewusst kein Sammel-Knopf: Jede Erzeugung kostet, also entscheidet die
 * Lehrkraft Stelle für Stelle — erzeugen oder bewusst der MBK überlassen.
 * Nach Erfolg wird der Befund automatisch auf „behoben" gesetzt.
 */
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function InternenInhaltErzeugenButton({ einheitId, zielId, onErzeugt }) {
  const [laeuft, setLaeuft] = useState(false);
  const [lerntyp, instanceId] = String(zielId || '').split('::');

  const erzeugen = async () => {
    setLaeuft(true);
    try {
      const res = await base44.functions.invoke('generateInterneInhalte', {
        einheitId,
        force: true,
        nur: { lerntyp, instanceId },
      });
      if ((res?.data?.erzeugt || 0) < 1) {
        toast.error('Es konnte kein Inhalt erzeugt werden.');
        return;
      }
      toast.success('KI-Inhalt wurde erstellt.');
      onErzeugt?.();
    } catch (e) {
      toast.error('Fehler beim Erzeugen: ' + (e?.response?.data?.error || e.message));
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <Button size="sm" onClick={erzeugen} disabled={laeuft || !lerntyp || !instanceId}>
      {laeuft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      Jetzt erzeugen
    </Button>
  );
}