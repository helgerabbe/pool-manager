import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, MailPlus, Mail, Wand2 } from 'lucide-react';
import { useAustauschNachrichten, useAustauschDurcharbeiten } from '@/hooks/useAustausch';
import AustauschNachrichtKarte from '@/components/austausch/AustauschNachrichtKarte';
import AustauschAntwortDialog from '@/components/austausch/AustauschAntwortDialog';

/**
 * Briefkasten `austausch/`: erst die Nachrichten, die einen Menschen brauchen,
 * dann die noch ungelesenen, darunter der Verlauf.
 *
 * „Einmal lesen" arbeitet die offenen Nachrichten chronologisch durch: reine
 * Bestätigungen werden abgehakt, Fragen beantwortet, alles Heikle bleibt mit
 * Begründung im Bereich „Muss gesichtet werden" liegen. Ohne das lief der
 * Posteingang voll, weil der Kursbau auf jede Antwort antwortet.
 */
export default function AustauschPosteingang() {
  const { data, isLoading, isFetching, refetch, error } = useAustauschNachrichten();
  const durcharbeiten = useAustauschDurcharbeiten();
  const nachrichten = data?.nachrichten || [];
  const eingehend = (n) => n.an === 'pm';
  const sichtung = nachrichten.filter((n) => eingehend(n) && n.status === 'sichtung');
  const offen = nachrichten.filter((n) => eingehend(n) && n.status === 'offen');
  const rest = nachrichten.filter((n) => !sichtung.includes(n) && !offen.includes(n));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-foreground">Nachrichten des Kursbaus</h2>
        <span className="text-xs text-muted-foreground">
          Repository IGS-Seevetal/Poolzeit · austausch/
          {data?.abgerufen_am ? ` · zuletzt gelesen ${new Date(data.abgerufen_am).toLocaleTimeString('de-DE')}` : ''}
        </span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" className="gap-2" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Neu laden
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="gap-2"
            onClick={() => durcharbeiten.mutate()}
            disabled={durcharbeiten.isPending || offen.length === 0}
          >
            {durcharbeiten.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            Einmal lesen{offen.length > 0 ? ` (${offen.length})` : ''}
          </Button>
          <AustauschAntwortDialog
            trigger={
              <Button size="sm" className="gap-2">
                <MailPlus className="h-4 w-4" /> Neue Nachricht
              </Button>
            }
          />
        </div>
      </div>

      {durcharbeiten.isPending && (
        <p className="text-sm text-muted-foreground">
          Die Nachrichten werden der Reihe nach gelesen — das dauert einen Moment.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error?.response?.data?.error || error.message}</p>}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Der Briefkasten wird gelesen …
        </div>
      )}

      {!isLoading && (
        <>
          {sichtung.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">
                Muss gesichtet werden ({sichtung.length})
              </h3>
              <p className="text-xs text-muted-foreground">
                Hier ist eine Entscheidung nötig oder die Absicht des Kursbaus war nicht eindeutig.
              </p>
              {sichtung.map((n) => <AustauschNachrichtKarte key={n.datei} nachricht={n} />)}
            </section>
          )}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Noch nicht gelesen ({offen.length})
            </h3>
            {offen.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine offene Nachricht an den Pool-Manager.</p>
            ) : (
              offen.map((n) => <AustauschNachrichtKarte key={n.datei} nachricht={n} />)
            )}
          </section>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Verlauf ({rest.length})</h3>
            {rest.map((n) => <AustauschNachrichtKarte key={n.datei} nachricht={n} />)}
          </section>
        </>
      )}
    </div>
  );
}