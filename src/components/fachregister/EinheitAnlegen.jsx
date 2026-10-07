import React from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

/** Neue Einheit im Fachregister benennen und anlegen. */
export default function EinheitAnlegen({ onAnlegen }) {
  const [titel, setTitel] = React.useState('');
  const [laeuft, setLaeuft] = React.useState(false);
  const anlegen = async (e) => {
    e.preventDefault();
    if (!titel.trim()) return;
    setLaeuft(true);
    await onAnlegen(titel.trim());
    setTitel('');
    setLaeuft(false);
  };
  return (
    <form onSubmit={anlegen} className="flex gap-2">
      <Input value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="Neue Einheit, z. B. Kurzgeschichten" />
      <Button type="submit" disabled={laeuft || !titel.trim()} className="gap-2 shrink-0">
        {laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Anlegen
      </Button>
    </form>
  );
}