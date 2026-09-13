import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Wand2, Check, CheckCircle2 } from 'lucide-react';
import AuftragVorschauButton from '@/components/importcenter/AuftragVorschauButton';
import OffeneAufgabeVorschauButton from '@/components/didaktiker/OffeneAufgabeVorschauButton';
import UebungsPlanBlock from '@/components/didaktiker/UebungsPlanBlock';
import { useAktivitaetBauen, useAktivitaetUebernehmen } from '@/hooks/useDidaktiker';

/**
 * EINE Zeile des Lernpaket-Plans: erst bauen, dann ansehen, dann übernehmen.
 *
 * Die Reihenfolge ist Absicht — die Lehrkraft sieht den KI-Inhalt in der
 * Schüler-Vorschau, bevor er in den Datenbestand geht. Übernommen wird über das
 * Freigabe-Tor; weist die Prüfung den Inhalt zurück, bleibt das Lernpaket
 * unverändert.
 */
export default function AktivitaetZeile({ sitzungId, lernpaketId, zeile, erledigt }) {
  const [vorschlag, setVorschlag] = useState(null);
  const bauen = useAktivitaetBauen();
  const uebernehmen = useAktivitaetUebernehmen();

  const fertig = erledigt || uebernehmen.isSuccess;
  const varianten = vorschlag?.master_varianten || [];
  const vorschauWerte = varianten.length > 0 ? varianten[0] : vorschlag?.field_values || {};
  const snapshotHtml = vorschlag?.field_values?.approved_snapshot_html || '';
  const istOffen =
    zeile.form === 'offen' ||
    zeile.aufgabenart === 'Offene Aufgabe' ||
    vorschlag?.aufgabenart === 'Offene Aufgabe';

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-center gap-2">
        {fertig ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        ) : (
          <Badge variant="outline" className="text-[11px]">
            {zeile.phase}
          </Badge>
        )}
        <span className="font-medium text-foreground">{zeile.label}</span>
        <span className="text-xs text-muted-foreground">{zeile.aufgabenart}</span>

        <div className="ml-auto flex items-center gap-2">
          {!fertig && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={bauen.isPending}
              onClick={() =>
                bauen.mutate(
                  {
                    sitzung_id: sitzungId,
                    lernpaket_id: lernpaketId,
                    katalog_id: zeile.katalog_id,
                    absicht: zeile.absicht || zeile.zweck || '',
                    operation: zeile.operation || '',
                    aufgaben_idee: zeile.aufgaben_idee || '',
                  },
                  { onSuccess: setVorschlag }
                )
              }
            >
              {bauen.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              {vorschlag ? 'Neu erzeugen' : 'Inhalt erzeugen'}
            </Button>
          )}

          {vorschlag && !fertig && (
            <>
              {istOffen && snapshotHtml ? (
                <OffeneAufgabeVorschauButton snapshotHtml={snapshotHtml} titel={zeile.label} />
              ) : (
                <AuftragVorschauButton aufgabenartName={vorschlag.aufgabenart} fieldValues={vorschauWerte} />
              )}
              <Button
                size="sm"
                className="gap-2"
                disabled={uebernehmen.isPending}
                onClick={() =>
                  uebernehmen.mutate({
                    sitzung_id: sitzungId,
                    lernpaket_id: lernpaketId,
                    katalog_id: vorschlag.katalog_id,
                    phase: vorschlag.phase || zeile.phase,
                    schluessel: zeile.schluessel,
                    field_values: vorschlag.field_values || {},
                    master_varianten: varianten,
                  })
                }
              >
                {uebernehmen.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Übernehmen
              </Button>
            </>
          )}
        </div>
      </div>

      <p className="mt-1 text-xs text-muted-foreground">{zeile.absicht || zeile.zweck}</p>

      {!fertig && (
        <UebungsPlanBlock
          operation={zeile.operation}
          aufgabenIdee={zeile.aufgaben_idee}
          begruendung={zeile.form === 'katalog' ? zeile.begruendung : ''}
        />
      )}

      {varianten.length > 1 && !fertig && (
        <p className="mt-1 text-xs text-muted-foreground">{varianten.length} Varianten erzeugt.</p>
      )}
      {vorschlag?.quelle?.url && (
        <a
          href={vorschlag.quelle.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs text-primary hover:underline"
        >
          Gefundene Quelle: {vorschlag.quelle.titel || vorschlag.quelle.url}
        </a>
      )}
    </div>
  );
}