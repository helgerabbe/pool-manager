import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { useUnterrichtsPlanung } from '@/hooks/useUnterrichtsPlanung';
import RechercheSchritt from '@/components/unterrichtsplanung/RechercheSchritt';
import InhalteSchritt from '@/components/unterrichtsplanung/InhalteSchritt';
import VerlaufSchritt from '@/components/unterrichtsplanung/VerlaufSchritt';

/** Struktur einer Unterrichtseinheit: Recherche → Inhalte → Verlauf. */
export default function UnterrichtseinheitStruktur() {
  const { id } = useParams();
  const { authUser } = useRBAC();
  const { data: ue, isLoading: ueLaden } = useQuery({
    queryKey: ['unterrichtseinheit', id],
    queryFn: () => base44.entities.Unterrichtseinheit.get(id),
  });
  const { planung, isLoading, speichern, recherche, planen } = useUnterrichtsPlanung(id, authUser?.email);

  if (ueLaden || isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 overflow-y-auto">
      <div className="flex items-center gap-3">
        <Link to={`/unterricht?lg=${ue?.lerngruppe_id || ''}`} className="flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Struktur: {ue?.titel}</h1>
          <p className="text-sm text-muted-foreground">{ue?.fach} · Jg. {ue?.jahrgangsstufe}</p>
        </div>
      </div>
      <RechercheSchritt planung={planung} ue={ue} speichern={speichern} recherche={recherche} />
      {planung?.inhalte?.length > 0 && !recherche.isPending && (
        <InhalteSchritt planung={planung} speichern={speichern} planen={planen} />
      )}
      {planung?.verlauf?.length > 0 && !recherche.isPending && <VerlaufSchritt planung={planung} planen={planen} />}
    </div>
  );
}