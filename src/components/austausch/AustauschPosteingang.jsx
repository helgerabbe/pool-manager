import React from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, MailPlus, Mail } from 'lucide-react';
import { useAustauschNachrichten } from '@/hooks/useAustausch';
import AustauschNachrichtKarte from '@/components/austausch/AustauschNachrichtKarte';
import AustauschAntwortDialog from '@/components/austausch/AustauschAntwortDialog';

/**
 * Briefkasten `austausch/`: offene Nachrichten des Kursbaus zuerst, darunter
 * der Verlauf. Wird beim Öffnen und alle fünf Minuten aus dem Repository
 * gelesen, damit nichts mehr unbemerkt liegen bleibt.
 */
export default function AustauschPosteingang() {
  const { data, isLoading, isFetching, refetch, error } = useAustauschNachrichten();
  const nachrichten = data?.nachrichten || [];
  const offen = nachrichten.filter((n) => n.an === 'pm' && n.status === 'offen');
  const rest = nachrichten.filter((n) => !offen.includes(n));

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
            Neu lesen
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

      {error && <p className="text-sm text-destructive">{error?.response?.data?.error || error.message}</p>}
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Der Briefkasten wird gelesen …
        </div>
      )}

      {!isLoading && (
        <>
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Wartet auf Antwort ({offen.length})
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