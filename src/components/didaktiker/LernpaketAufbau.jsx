import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Boxes, Lightbulb } from 'lucide-react';
import AktivitaetZeile from '@/components/didaktiker/AktivitaetZeile';
import { useLernpaketPlan } from '@/hooks/useDidaktiker';

/**
 * Lernpaket für Lernpaket: planen und füllen.
 *
 * Bewusst EIN Lernpaket zur Zeit — ein Knopf, der eine ganze Einheit auf einmal
 * erzeugt, produziert Inhalte, die niemand mehr durchsieht. Der Baustand steht
 * an der Sitzung, deshalb kann die Arbeit jederzeit unterbrochen werden.
 */
export default function LernpaketAufbau({ sitzung }) {
  const plan = useLernpaketPlan();
  const stand = sitzung.lernpaket_stand || {};
  const aktuellId = sitzung.aktuelles_lernpaket_id || '';

  const { data: lernpakete = [] } = useQuery({
    queryKey: ['didaktikerLernpakete', sitzung.einheit_id],
    queryFn: () => base44.entities.Lernpakete.filter({ einheit_id: sitzung.einheit_id }, 'reihenfolge_nummer', 100),
    enabled: !!sitzung.einheit_id,
  });

  const aktuellerStand = stand[aktuellId] || {};
  const aktuellerPlan = aktuellerStand.plan || null;
  const gebaut = new Set((aktuellerStand.gebaut || []).map((g) => g.schluessel));
  const aktuellesPaket = lernpakete.find((lp) => lp.id === aktuellId);

  const waehlen = (id) => {
    if (stand[id]?.plan) {
      base44.entities.DidaktikerSitzung.update(sitzung.id, { aktuelles_lernpaket_id: id });
    }
    plan.mutate({ sitzung_id: sitzung.id, lernpaket_id: id });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Boxes className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Lernpakete füllen</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Wählen Sie ein Lernpaket. Der Didaktiker schlägt die Bausteine vor; jede Aufgabe sehen Sie
          vor der Übernahme in der Schüler-Vorschau.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={aktuellId} onValueChange={waehlen}>
            <SelectTrigger className="max-w-md">
              <SelectValue placeholder="Lernpaket wählen" />
            </SelectTrigger>
            <SelectContent>
              {lernpakete
                .filter((lp) => lp.sync_status !== 'to_delete')
                .map((lp) => (
                  <SelectItem key={lp.id} value={lp.id}>
                    {lp.titel_des_pakets}
                    {stand[lp.id]?.gebaut?.length ? ` · ${stand[lp.id].gebaut.length} fertig` : ''}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          {aktuellId && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={plan.isPending}
              onClick={() => plan.mutate({ sitzung_id: sitzung.id, lernpaket_id: aktuellId })}
            >
              {plan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {aktuellerPlan ? 'Plan neu erstellen' : 'Plan erstellen'}
            </Button>
          )}
        </div>

        {plan.isPending && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Der Plan wird erstellt …
          </div>
        )}

        {aktuellerPlan && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-foreground">
                {aktuellesPaket?.titel_des_pakets || aktuellerPlan.lernpaket_titel}
              </span>
              <Badge variant="outline" className="text-[11px]">
                {gebaut.size} von {aktuellerPlan.zeilen.filter((z) => !z.vorhanden).length} gebaut
              </Badge>
            </div>

            {aktuellerPlan.hinweis && (
              <div className="flex gap-2 rounded-lg bg-accent/10 p-3 text-sm">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-foreground">{aktuellerPlan.hinweis}</p>
              </div>
            )}

            {(aktuellerPlan.lernziele || []).length > 0 && (
              <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
                {aktuellerPlan.lernziele.map((z, i) => (
                  <li key={i}>{z}</li>
                ))}
              </ul>
            )}

            <div className="space-y-2">
              {aktuellerPlan.zeilen.map((zeile) =>
                zeile.vorhanden ? (
                  <div
                    key={zeile.schluessel}
                    className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground"
                  >
                    {zeile.label} — steht in diesem Lernpaket bereits.
                  </div>
                ) : (
                  <AktivitaetZeile
                    key={zeile.schluessel}
                    sitzungId={sitzung.id}
                    lernpaketId={aktuellId}
                    zeile={zeile}
                    erledigt={gebaut.has(zeile.schluessel)}
                  />
                )
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}