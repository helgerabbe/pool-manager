import React from 'react';
import { CalendarPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Einziger Einstieg zur Stundenplanung – die Weiche (Verlauf oder frei) folgt im Planer. */
export default function StundeAusVerlaufButton({ unterrichtseinheitId }) {
  const navigate = useNavigate();
  return (
    <Button
      size="sm"
      variant="outline"
      className="gap-2 border-primary text-primary"
      onClick={() => navigate(`/unterrichtseinheit/${unterrichtseinheitId}/stundenplaner`)}
    >
      <CalendarPlus className="w-4 h-4" /> Neue Stunde planen
    </Button>
  );
}