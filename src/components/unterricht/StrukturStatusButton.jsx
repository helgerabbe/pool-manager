import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ListTree } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const STATUS = {
  keine: { punkt: 'bg-red-500', rahmen: 'border-red-200', titel: 'Noch keine Struktur angelegt' },
  begonnen: { punkt: 'bg-amber-400', rahmen: 'border-amber-300 bg-amber-50', titel: 'Struktur begonnen, Verlauf fehlt noch' },
  fertig: { punkt: 'bg-green-500', rahmen: 'border-green-300 bg-green-50', titel: 'Struktur mit Verlauf fertig' },
};

/** „Struktur der Einheit"-Knopf mit Ampel: rot = keine, gelb = begonnen, grün = Verlauf steht. */
export default function StrukturStatusButton({ unterrichtseinheitId }) {
  const navigate = useNavigate();
  const { data: planung } = useQuery({
    queryKey: ['unterrichtsPlanungStatus', unterrichtseinheitId],
    queryFn: async () => (await base44.entities.UnterrichtsPlanung.filter({ unterrichtseinheit_id: unterrichtseinheitId }))[0] || null,
  });
  const status = planung?.verlauf?.length ? 'fertig' : planung ? 'begonnen' : 'keine';
  const s = STATUS[status];

  return (
    <Button
      variant="outline"
      size="sm"
      title={s.titel}
      onClick={() => navigate(`/unterrichtseinheit/${unterrichtseinheitId}/struktur`)}
      className={`gap-2 ${s.rahmen}`}
    >
      <span className={`h-2.5 w-2.5 rounded-full ${s.punkt}`} />
      <ListTree className="w-4 h-4" /> Struktur der Einheit
    </Button>
  );
}