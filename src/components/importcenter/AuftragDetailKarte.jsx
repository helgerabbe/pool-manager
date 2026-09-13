import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RotateCcw, Loader2 } from 'lucide-react';
import PruefergebnisListe from '@/components/importcenter/PruefergebnisListe';
import AuftragStatusBadge from '@/components/importcenter/AuftragStatusBadge';
import AuftragVorschauButton from '@/components/importcenter/AuftragVorschauButton';
import { useImportAuftragAktionen } from '@/hooks/useImportCenter';

const VORSCHAU_ARTEN = ['aktivitaet_einfuegen', 'aktivitaet_aendern'];

/**
 * Ein Auftrag in aufbereiteter Form: Was, Wohin, Womit, Prüfergebnis, Absender —
 * dazu das Freigabe-Tor. Aktivitäts-Aufträge lassen sich vorher in der
 * Schüler-Vorschau ansehen; Struktur-Aufträge haben nichts zu rendern und
 * zeigen nur ihre Zusammenfassung.
 */
export default function AuftragDetailKarte({ auftrag, aufgabenarten = [] }) {
  const { ausfuehren, entscheiden } = useImportAuftragAktionen();
  const [ablehnung, setAblehnung] = useState('');
  const [ablehnenOffen, setAblehnenOffen] = useState(false);

  const p = auftrag.parameter || {};
  const aufgabenartName =
    aufgabenarten.find((a) => a.id === p.aktivitaet_id)?.name || 'Aufgabe';
  const zeigtVorschau = VORSCHAU_ARTEN.includes(auftrag.auftrags_art) && !!p.field_values;
  const offen = auftrag.status === 'eingegangen' || auftrag.status === 'geprueft';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base">{auftrag.titel || auftrag.auftrags_art}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {auftrag.absender || 'unbekannt'} · Quelle {auftrag.quelle || 'intern'}
              {auftrag.geprueft_am
                ? ` · geprüft ${new Date(auftrag.geprueft_am).toLocaleString('de-DE')}`
                : ''}
            </p>
          </div>
          <AuftragStatusBadge status={auftrag.status} pruefstatus={auftrag.pruefstatus} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Was</p>
            <Badge variant="secondary" className="mt-1 font-mono text-[11px]">
              {auftrag.auftrags_art}
            </Badge>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Wohin</p>
            <p className="mt-1 text-foreground">
              {auftrag.ziel_typ === 'keines' ? (
                'neu, ohne Ziel'
              ) : (
                <>
                  {auftrag.ziel_typ}{' '}
                  <span className="font-mono text-xs text-muted-foreground">{auftrag.ziel_id}</span>
                </>
              )}
              {auftrag.position !== undefined && auftrag.position !== null
                ? ` · Position ${Number(auftrag.position) + 1}`
                : ''}
            </p>
          </div>
        </div>

        <div>
          <p className="mb-1 text-xs uppercase text-muted-foreground">Womit</p>
          <pre className="max-h-56 overflow-auto rounded bg-muted p-3 text-[11px] leading-relaxed">
            {JSON.stringify(p, null, 2)}
          </pre>
        </div>

        <PruefergebnisListe punkte={auftrag.pruefergebnis || []} />

        {(auftrag.ausfuehrung_protokoll || []).length > 0 && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
            <p className="mb-1 text-sm font-semibold text-emerald-900">Durchgeführt</p>
            <ul className="space-y-1 text-sm text-emerald-900">
              {auftrag.ausfuehrung_protokoll.map((s, idx) => (
                <li key={idx}>
                  {s.schritt}
                  {s.hinweis ? ` — ${s.hinweis}` : ''}{' '}
                  <span className="font-mono text-[11px] text-emerald-700/70">{s.record_id}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {auftrag.status === 'abgelehnt' && auftrag.begruendung && (
          <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm">
            <span className="font-semibold">Abgelehnt:</span> {auftrag.begruendung}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {zeigtVorschau && (
            <AuftragVorschauButton aufgabenartName={aufgabenartName} fieldValues={p.field_values} />
          )}

          {offen && (
            <>
              <Button
                size="sm"
                className="gap-2"
                disabled={auftrag.pruefstatus !== 'ausfuehrbar' || ausfuehren.isPending}
                onClick={() => ausfuehren.mutate(auftrag.id)}
              >
                {ausfuehren.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Durchführen
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setAblehnenOffen((v) => !v)}
              >
                <XCircle className="h-4 w-4" /> Ablehnen
              </Button>
            </>
          )}

          {auftrag.status === 'abgelehnt' && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => entscheiden.mutate({ auftragId: auftrag.id, entscheidung: 'wieder_oeffnen' })}
            >
              <RotateCcw className="h-4 w-4" /> Wieder öffnen
            </Button>
          )}
        </div>

        {ablehnenOffen && offen && (
          <div className="space-y-2">
            <Textarea
              rows={2}
              placeholder="Warum wird der Auftrag nicht durchgeführt?"
              value={ablehnung}
              onChange={(e) => setAblehnung(e.target.value)}
            />
            <Button
              size="sm"
              variant="destructive"
              disabled={!ablehnung.trim() || entscheiden.isPending}
              onClick={() =>
                entscheiden.mutate(
                  { auftragId: auftrag.id, entscheidung: 'abgelehnt', begruendung: ablehnung.trim() },
                  { onSuccess: () => { setAblehnung(''); setAblehnenOffen(false); } }
                )
              }
            >
              Ablehnung speichern
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}