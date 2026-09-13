import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Layers, FileSearch } from 'lucide-react';
import { useEinheitStruktur } from '@/hooks/useImportCenter';
import AllgemeineAufgabenLeser from '@/components/importcenter/AllgemeineAufgabenLeser';

function IdChip({ id }) {
  return (
    <button
      type="button"
      title="ID kopieren"
      onClick={() => navigator.clipboard?.writeText(id)}
      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground hover:bg-secondary"
    >
      {id}
    </button>
  );
}

/**
 * Der Lesezugang auf eine Einheit — GETRIMMT: Struktur, Reihenfolge, Titel,
 * Typen, Status. Die tatsächlichen Inhalte einer Aktivität werden bewusst
 * einzeln angefordert ("Inhalte holen"), nicht pauschal mitgeliefert.
 */
export default function StrukturLeser() {
  const [einheitId, setEinheitId] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [schrittDetailId, setSchrittDetailId] = useState(null);

  const { data: einheiten = [] } = useQuery({
    queryKey: ['importCenterEinheiten'],
    queryFn: () => base44.entities.Einheiten.list('-updated_date', 300),
  });

  const { data, isLoading } = useEinheitStruktur(einheitId, detailId, schrittDetailId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Einheit auslesen</CardTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Grundlage jedes Änderungsauftrags: Wo genau soll etwas eingefügt oder geändert werden?
            Die IDs lassen sich mit einem Klick kopieren.
          </p>
        </CardHeader>
        <CardContent>
          <Select
            value={einheitId}
            onValueChange={(v) => {
              setEinheitId(v);
              setDetailId(null);
              setSchrittDetailId(null);
            }}
          >
            <SelectTrigger className="max-w-xl">
              <SelectValue placeholder="Einheit wählen" />
            </SelectTrigger>
            <SelectContent>
              {einheiten.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.titel_der_einheit} · {e.fach} · Jg. {e.jahrgangsstufe}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading && (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Struktur wird gelesen …
        </div>
      )}

      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {data.einheit.titel}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {data.einheit.fach} · Jg. {data.einheit.jahrgangsstufe} · {data.detailstufe}
              </span>
            </CardTitle>
            <IdChip id={data.einheit.einheit_id} />
          </CardHeader>
          <CardContent className="space-y-5">
            {data.themenfelder.length === 0 && (
              <p className="text-sm text-muted-foreground">Diese Einheit hat noch keine Themenfelder.</p>
            )}

            {data.themenfelder.map((tf) => (
              <div key={tf.themenfeld_id} className="rounded-lg border border-border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">Themenfeld {tf.position + 1}</Badge>
                  <span className="font-semibold text-foreground">{tf.titel}</span>
                  <IdChip id={tf.themenfeld_id} />
                </div>

                {tf.lernpakete.length === 0 && (
                  <p className="pl-2 text-sm text-muted-foreground">Keine Lernpakete.</p>
                )}

                <div className="space-y-3 pl-2">
                  {tf.lernpakete.map((lp) => (
                    <div key={lp.lernpaket_id} className="rounded-md bg-muted/40 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Lernpaket {lp.position + 1}</Badge>
                        <span className="font-medium text-foreground">{lp.titel}</span>
                        <Badge variant="outline" className="text-[11px]">{lp.freigabe}</Badge>
                        <IdChip id={lp.lernpaket_id} />
                      </div>

                      <div className="space-y-2">
                        {lp.phasen.map((ph) => (
                          <div key={ph.phase}>
                            <p className="text-xs font-semibold uppercase text-muted-foreground">
                              {ph.phase}
                              {ph.deaktiviert ? ' (deaktiviert)' : ''}
                            </p>
                            {ph.aktivitaeten.length === 0 ? (
                              <p className="text-xs text-muted-foreground/80">—</p>
                            ) : (
                              <ul className="space-y-1">
                                {ph.aktivitaeten.map((a) => (
                                  <li
                                    key={a.aktivitaet_instanz_id}
                                    className="flex flex-wrap items-center gap-2 text-sm"
                                  >
                                    <span className="text-muted-foreground">{a.position + 1}.</span>
                                    <span className="text-foreground">{a.aufgabenart}</span>
                                    <Badge
                                      variant="outline"
                                      className="text-[11px]"
                                    >
                                      {a.vollstaendig ? 'vollständig' : 'unvollständig'}
                                    </Badge>
                                    <IdChip id={a.aktivitaet_instanz_id} />
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 gap-1 px-2 text-xs"
                                      onClick={() => {
                                        setSchrittDetailId(null);
                                        setDetailId(a.aktivitaet_instanz_id);
                                      }}
                                    >
                                      <FileSearch className="h-3 w-3" /> Inhalte holen
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="border-t border-border pt-4">
              <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                Allgemeine Aufgaben
              </p>
              <AllgemeineAufgabenLeser
                aufgaben={data.allgemeine_aufgaben || []}
                IdChip={IdChip}
                onSchrittDetail={(id) => {
                  setDetailId(null);
                  setSchrittDetailId(id);
                }}
              />
            </div>

            {data.schritt_detail && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  Schritt aus „{data.schritt_detail.aufgabe_titel}"
                  {data.schritt_detail.aufgabenart ? ` · ${data.schritt_detail.aufgabenart}` : ''}
                </p>
                <pre className="max-h-80 overflow-auto rounded bg-card p-3 text-[11px] leading-relaxed">
                  {JSON.stringify(data.schritt_detail.schritt, null, 2)}
                </pre>
              </div>
            )}

            {data.aktivitaet_detail && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  Inhalte: {data.aktivitaet_detail.aufgabenart} · Phase {data.aktivitaet_detail.phase}
                </p>
                <pre className="max-h-80 overflow-auto rounded bg-card p-3 text-[11px] leading-relaxed">
                  {JSON.stringify(data.aktivitaet_detail.field_values, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}