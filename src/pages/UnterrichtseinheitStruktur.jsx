import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ZeitplanungSchritt from '@/components/unterrichtsplanung/ZeitplanungSchritt';
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
  const [tab, setTab] = useState(null);
  const hatInhalte = planung?.inhalte?.length > 0 && !recherche.isPending;
  const hatVerlauf = planung?.verlauf?.length > 0 && !recherche.isPending;
  const aktiv = tab || (hatVerlauf ? 'verlauf' : hatInhalte ? 'inhalte' : 'recherche');

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
      <Tabs value={aktiv} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="recherche">1 · Material & Recherche</TabsTrigger>
          <TabsTrigger value="inhalte" disabled={!hatInhalte}>2 · Inhalte</TabsTrigger>
          <TabsTrigger value="verlauf" disabled={!hatVerlauf}>3 · Verlauf</TabsTrigger>
          <TabsTrigger value="zeit" disabled={!hatVerlauf}>4 · Zeitplanung</TabsTrigger>
        </TabsList>
        <TabsContent value="recherche">
          <RechercheSchritt planung={planung} ue={ue} speichern={speichern} recherche={recherche} />
        </TabsContent>
        {hatInhalte && (
          <TabsContent value="inhalte">
            <InhalteSchritt planung={planung} speichern={speichern} planen={planen} onFertig={() => setTab('verlauf')} />
          </TabsContent>
        )}
        {hatVerlauf && (
          <>
            <TabsContent value="verlauf"><VerlaufSchritt planung={planung} planen={planen} speichern={speichern} /></TabsContent>
            <TabsContent value="zeit"><ZeitplanungSchritt planung={planung} planen={planen} speichern={speichern} /></TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}