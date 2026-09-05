import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, CalendarDays, ChevronRight, PlaySquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import StundeErstellenModal from './StundeErstellenModal';
import StundenMoodleWegInfoBox from './StundenMoodleWegInfoBox';
import StundeLoeschenButton from './StundeLoeschenButton';

/**
 * Moodle-Unterrichts-Generator, Paket 1: Der Bereich "Meine Unterrichtsstunden"
 * ganz oben in der Privaten Bibliothek. Anzeige gruppiert nach Fach > Einheit >
 * Stunden, damit die chronologische Arbeitsweise (erst Stunden planen, später
 * daraus eine Einheit) sichtbar wird.
 */
export default function UnterrichtsstundenSektion({
  einheiten = [],
  besitzerEmail,
  // Optional: nur die Stunden EINES Fachs/Jahrgangs zeigen (Fach-Seite).
  nurFach,
  nurJahrgang,
}) {
  const [erstellenOffen, setErstellenOffen] = useState(false);
  const navigate = useNavigate();

  const { data: stunden = [] } = useQuery({
    queryKey: ['unterrichtsstunden', besitzerEmail],
    queryFn: () => base44.entities.Unterrichtsstunde.filter({ besitzer_email: besitzerEmail }, '-updated_date', 200),
    enabled: !!besitzerEmail,
  });

  const einheitById = new Map(einheiten.map((e) => [e.id, e]));

  // Gruppierung: Fach -> Einheit -> Stunden
  const faecher = {};
  const sichtbareStunden = stunden.filter((s) => {
    if (!nurFach && !nurJahrgang) return true;
    const einheit = einheitById.get(s.einheit_id);
    const fach = s.fach || einheit?.fach;
    const jg = s.jahrgangsstufe || einheit?.jahrgangsstufe;
    return (!nurFach || fach === nurFach) && (!nurJahrgang || String(jg) === String(nurJahrgang));
  });
  sichtbareStunden.forEach((s) => {
    const einheit = einheitById.get(s.einheit_id);
    const fach = s.fach || einheit?.fach || 'Ohne Fach';
    const einheitKey = s.einheit_id || 'ohne';
    faecher[fach] = faecher[fach] || {};
    faecher[fach][einheitKey] = faecher[fach][einheitKey] || {
      titel: einheit?.titel_der_einheit || 'Einheit nicht gefunden',
      items: [],
    };
    faecher[fach][einheitKey].items.push(s);
  });
  const fachNamen = Object.keys(faecher).sort((a, b) => a.localeCompare(b, 'de'));

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50/60 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <PlaySquare className="w-4 h-4 text-accent" />
            Meine Unterrichtsstunden
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Moodle-Unterrichts-Generator: Stunde für Stunde planen — daraus entsteht Schritt für Schritt deine Einheit.
          </p>
        </div>
        <Button size="sm" onClick={() => setErstellenOffen(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          Neue Stunde planen
        </Button>
      </div>

      {sichtbareStunden.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Noch keine Unterrichtsstunden geplant.
        </p>
      ) : (
        <div className="space-y-4">
          {fachNamen.map((fach) => (
            <div key={fach} className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{fach}</h3>
                <div className="flex-1 h-px bg-border" />
              </div>
              {Object.entries(faecher[fach]).map(([einheitId, gruppe]) => (
                <div key={einheitId} className="rounded-lg border bg-card overflow-hidden">
                  <div className="px-3 py-2 bg-muted/40 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{gruppe.titel}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">
                      {gruppe.items.length} Stunde{gruppe.items.length !== 1 ? 'n' : ''}
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {gruppe.items.map((s) => (
                      <div key={s.id} className="flex items-center gap-1 pr-2 hover:bg-muted/20 transition-colors">
                      <Link
                        to={`/unterrichtsstunde/${s.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 flex-1 min-w-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{s.arbeitstitel}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            {s.datum && (
                              <>
                                <CalendarDays className="w-3 h-3" />
                                {format(new Date(s.datum), 'dd. MMM yyyy', { locale: de })} ·
                              </>
                            )}
                            {s.status === 'bereit' ? 'bereit für den Unterricht' : 'in Planung'}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </Link>
                      <StundeLoeschenButton stunde={s} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <StundenMoodleWegInfoBox />

      <StundeErstellenModal
        open={erstellenOffen}
        onOpenChange={setErstellenOffen}
        einheiten={einheiten}
        besitzerEmail={besitzerEmail}
        onCreated={(stunde) => navigate(`/unterrichtsstunde/${stunde.id}`)}
      />
    </div>
  );
}