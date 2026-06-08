import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, BookOpen } from 'lucide-react';

/**
 * Hülle: Übersichtsseite für ein einzelnes Unterrichtsfach.
 * Der Fachname kommt aus der URL (?fach=…). Inhalt folgt später.
 */
export default function FachSeite() {
  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list('reihenfolge'),
  });

  const urlParams = new URLSearchParams(window.location.search);
  const fachId = urlParams.get('fach');
  const fach = faecher.find((f) => f.id === fachId);
  const fachName = fach?.name || 'Fach';

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10">
        <Link
          to="/lernen"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Dashboard
        </Link>

        <div className="flex flex-col items-center text-center gap-4 py-16">
          <span
            className="flex items-center justify-center w-16 h-16 rounded-full"
            style={{ backgroundColor: `${fach?.farbe || '#64748b'}1a`, color: fach?.farbe || '#64748b' }}
          >
            <BookOpen className="w-7 h-7" />
          </span>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">{fachName}</h1>
          <p className="text-muted-foreground max-w-md">Hier siehst du Informationen zu deinem Unterrichtsfach.</p>
        </div>
      </div>
    </div>
  );
}