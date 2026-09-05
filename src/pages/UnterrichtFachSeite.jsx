/**
 * UnterrichtFachSeite.jsx
 *
 * Die Arbeitsseite EINER Unterrichts-Kachel (Fach + Jahrgangsstufe): hier liegt
 * alles, was die Lehrkraft für dieses Fach in dieser Stufe vorbereitet hat —
 * Unterrichtsstunden und Übungsblöcke, jeweils im gewohnten Bereich.
 *
 * Aufruf: /unterricht?fach=Mathematik&jg=6
 */
import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ArrowLeft } from 'lucide-react';
import { useRBAC } from '@/hooks/useRBAC';
import UnterrichtsstundenSektion from '@/components/unterrichtsstunden/UnterrichtsstundenSektion';
import UebungsbloeckeSektion from '@/components/uebungsbloecke/UebungsbloeckeSektion';

export default function UnterrichtFachSeite() {
  const navigate = useNavigate();
  const { authUser } = useRBAC();
  const params = new URLSearchParams(window.location.search);
  const fach = params.get('fach') || '';
  const jahrgang = params.get('jg') || '';

  const { data: einheiten = [], isLoading } = useQuery({
    queryKey: ['einheiten', 'privat'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getEinheitenListSecure', { page: 1, limit: 100, view: 'privat' });
      return res.data?.data || [];
    },
  });

  // Für diese Kachel zählt nur, was zu Fach UND Jahrgang passt.
  const passende = useMemo(
    () => einheiten.filter((e) => e.fach === fach && String(e.jahrgangsstufe) === String(jahrgang)),
    [einheiten, fach, jahrgang]
  );

  if (!fach || !jahrgang) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Kein Fach ausgewählt.</p>
        <Link to="/" className="text-sm font-medium text-primary hover:underline">Zurück zur Übersicht</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
          title="Zurück zu meinem Unterricht"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {fach} · Jg. {jahrgang}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Alles, was du für dieses Fach in dieser Jahrgangsstufe vorbereitet hast.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
        </div>
      ) : (
        <>
          <UnterrichtsstundenSektion
            einheiten={einheiten}
            besitzerEmail={authUser?.email}
            nurFach={fach}
            nurJahrgang={jahrgang}
          />
          <UebungsbloeckeSektion
            einheiten={passende}
            besitzerEmail={authUser?.email}
          />
        </>
      )}
    </div>
  );
}