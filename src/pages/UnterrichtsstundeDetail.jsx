import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, KeyRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

/**
 * Moodle-Unterrichts-Generator, Paket 1: Grundgerüst der Stunden-Ansicht.
 * Das eigentliche Regieblatt (Phasen-Liste mit Codes, Material und
 * Aktivitäten) folgt in den Paketen 2-4.
 */
export default function UnterrichtsstundeDetail() {
  const { id } = useParams();

  const { data: stunde, isLoading } = useQuery({
    queryKey: ['unterrichtsstunde', id],
    queryFn: () => base44.entities.Unterrichtsstunde.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!stunde) {
    return <p className="text-sm text-muted-foreground py-10 text-center">Diese Unterrichtsstunde wurde nicht gefunden.</p>;
  }

  return (
    <div className="space-y-6">
      <Link to="/einheiten" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Zurück zur Privaten Bibliothek
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{stunde.arbeitstitel}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stunde.fach} · Jg. {stunde.jahrgangsstufe} ·{' '}
          {stunde.status === 'bereit' ? 'bereit für den Unterricht' : 'in Planung'}
        </p>
      </div>

      {stunde.notfall_code && (
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <KeyRound className="w-4 h-4 text-accent shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Notfall-Code dieser Stunde</p>
            <p className="text-xs text-muted-foreground">
              Schaltet jede Phase frei, falls Ihnen die Phasen-Codes gerade nicht vorliegen.
            </p>
          </div>
          <Badge className="ml-auto text-base px-3 py-1 font-mono">{stunde.notfall_code}</Badge>
        </div>
      )}

      <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-sm text-muted-foreground">
        Das Stunden-Regieblatt (Phasen, Freischalt-Codes, Material und Aktivitäten) entsteht in den nächsten
        Ausbauschritten: erst der KI-Stunden-Coach, dann die Arbeitsfläche.
      </div>
    </div>
  );
}