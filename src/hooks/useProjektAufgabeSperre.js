import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { lockProjectTask, unlockProjectTask } from '@/services/ProjektaufgabeService';

/**
 * Bearbeitungssperre einer Projektaufgabe – dieselbe Sperre wie im Reiter
 * „Projekte", damit die Projekt-Reiter auch aus dem Projekt-Lernpaket heraus
 * bearbeitet werden können.
 */
export default function useProjektAufgabeSperre(aufgabe) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLocking, setIsLocking] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setEmail(u?.email ?? null)).catch(() => {});
  }, []);
  useEffect(() => { setIsEditMode(false); }, [aufgabe.id]);

  const neuLaden = () => queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
  const isLockedByOther = !!aufgabe.locked_by && !!email && aufgabe.locked_by !== email;

  const enterEditMode = async () => {
    setIsLocking(true);
    try {
      const res = await lockProjectTask(aufgabe.id);
      if (res?.success !== true) {
        toast.error(res?.error || 'Bearbeitungsmodus konnte nicht gestartet werden.');
        return;
      }
      setIsEditMode(true);
      neuLaden();
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Fehler beim Aktivieren des Bearbeitungsmodus: ' + err.message);
    } finally {
      setIsLocking(false);
    }
  };

  const exitEditMode = async () => {
    setIsLocking(true);
    try {
      await unlockProjectTask(aufgabe.id);
      setIsEditMode(false);
      neuLaden();
    } catch (err) {
      toast.error('Fehler beim Beenden des Bearbeitungsmodus: ' + err.message);
    } finally {
      setIsLocking(false);
    }
  };

  return { isEditMode, isLocking, isLockedByOther, lockedByEmail: isLockedByOther ? aufgabe.locked_by : null, enterEditMode, exitEditMode };
}