import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { raumStarten } from '@/lib/liveRaum';

/** Startet den gespeicherten Foliensatz genau so, wie er aussieht – mit Raum-Code für die Schüler. */
export default function UnterrichtStartenButton({ stunde }) {
  const navigate = useNavigate();
  const [laeuft, setLaeuft] = React.useState(false);
  const starten = async () => {
    setLaeuft(true);
    try {
      const [me, frisch] = await Promise.all([base44.auth.me(), base44.entities.Unterrichtsstunde.get(stunde.id)]);
      const raum = await raumStarten(frisch, me.email);
      if (!raum.schritte.length) toast.info('Die Stunde hat noch keine Folien – es wird nur der Raum-Code gezeigt.');
      navigate(`/praesentation/${raum.id}`);
    } finally { setLaeuft(false); }
  };
  return <Button size="sm" onClick={starten} disabled={laeuft}>{laeuft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Unterricht starten</Button>;
}