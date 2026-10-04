/**
 * EinheitenMeldungen — Reiter „Einheiten" im Import-Center.
 * Zählt pro Einheit, was vom Kursbau zurückgekommen und noch offen ist
 * (MBK-Hinweise, eigene Prüfbefunde, Admin-Punkte) und verlinkt in die Taskliste.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

async function ladeUebersicht() {
  const [befunde, todos] = await Promise.all([
    base44.entities.Pruefbefund.filter({ entscheidung: 'offen' }, '-created_date', 5000),
    base44.entities.MbkAdminTodo.filter({ status: 'offen' }, '-gemeldet_am', 1000),
  ]);
  const proEinheit = {};
  const zeile = (id) => (proEinheit[id] ||= { id, mbk: 0, eigen: 0, blockiert: 0, admin: 0 });
  for (const b of befunde || []) {
    const z = zeile(b.einheit_id);
    if (b.quelle === 'mbk') { if (b.dublette_status !== 'dublette') z.mbk += 1; } else z.eigen += 1;
    if (b.schwere === 'blockiert') z.blockiert += 1;
  }
  for (const t of todos || []) zeile(t.einheit_id).admin += 1;
  const ids = Object.keys(proEinheit);
  const einheiten = ids.length ? await base44.entities.Einheiten.filter({ id: { $in: ids } }) : [];
  const titel = Object.fromEntries((einheiten || []).map((e) => [e.id, e]));
  return Object.values(proEinheit)
    .filter((z) => titel[z.id])
    .map((z) => ({ ...z, einheit: titel[z.id] }))
    .sort((a, b) => b.mbk + b.eigen + b.admin - (a.mbk + a.eigen + a.admin));
}

export default function EinheitenMeldungen() {
  const { data = [], isLoading } = useQuery({ queryKey: ['importEinheitenMeldungen'], queryFn: ladeUebersicht });

  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 text-sm text-emerald-900">
        <CheckCircle2 className="w-5 h-5" /> Zu keiner Einheit liegen offene Meldungen vor.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Offene Meldungen je Einheit. Bearbeitet werden sie in der Taskliste der Einheit (Vollständigkeitsprüfung).
      </p>
      {data.map((z) => (
        <div key={z.id} className="rounded-xl border bg-card p-4 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="font-semibold text-foreground">{z.einheit.titel_der_einheit}</p>
            <p className="text-xs text-muted-foreground">{z.einheit.fach} · Jg. {z.einheit.jahrgangsstufe}</p>
          </div>
          {z.mbk > 0 && <Badge variant="outline" className="bg-red-50 text-red-800 border-red-200">{z.mbk} vom Kursbau</Badge>}
          {z.eigen > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">{z.eigen} aus eigener Prüfung</Badge>}
          {z.admin > 0 && <Badge variant="outline">{z.admin} für die Administration</Badge>}
          {z.blockiert > 0 && <Badge variant="destructive">{z.blockiert} blockierend</Badge>}
          <Button asChild size="sm" variant="outline">
            <Link to={`/workspace?einheit=${z.id}&tab=pruefung`}>Zur Taskliste <ArrowRight className="w-3.5 h-3.5" /></Link>
          </Button>
        </div>
      ))}
    </div>
  );
}