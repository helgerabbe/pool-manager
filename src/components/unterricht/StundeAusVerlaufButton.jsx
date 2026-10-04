import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

/** Erscheint, sobald der Verlauf der Unterrichtseinheit steht. Die Stundenplanung selbst folgt als nächster Ausbauschritt. */
export default function StundeAusVerlaufButton({ unterrichtseinheitId }) {
  const { data: planung } = useQuery({
    queryKey: ['unterrichtsPlanungStatus', unterrichtseinheitId],
    queryFn: async () => (await base44.entities.UnterrichtsPlanung.filter({ unterrichtseinheit_id: unterrichtseinheitId }))[0] || null,
  });
  if (!planung?.verlauf?.length) return null;

  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2 border-primary text-primary"
      onClick={() => toast.info('Die Stundenplanung aus dem Verlauf wird gerade gebaut.')}
    >
      <CalendarPlus className="w-4 h-4" /> Neue Stunde aus dem Verlauf planen
    </Button>
  );
}