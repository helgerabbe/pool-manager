import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ExternalLink, Loader2, Sparkles } from 'lucide-react';
import SitzungStarten from '@/components/didaktiker/SitzungStarten';
import SitzungListe from '@/components/didaktiker/SitzungListe';
import FundamentKarte from '@/components/didaktiker/FundamentKarte';
import StrukturEntwurf from '@/components/didaktiker/StrukturEntwurf';
import LernpaketAufbau from '@/components/didaktiker/LernpaketAufbau';
import {
  useDidaktikerSitzung,
  useDidaktikerSitzungen,
  useRecherche,
  useSitzungAnlegen,
  useStrukturAnlegen,
} from '@/hooks/useDidaktiker';

/**
 * DER DIDAKTIKER — der geführte Aufbau eines Basispakets.
 *
 * Vier Etappen, jede mit einer Entscheidung der Lehrkraft: recherchieren →
 * Struktur bestätigen → Lernpakete füllen → fertig. Der Assistent schreibt
 * dabei nie selbst in den Datenbestand; jede Änderung läuft über das
 * Freigabe-Tor des Import-Centers und wird dort protokolliert.
 */
export default function Didaktiker() {
  const [aktiveId, setAktiveId] = useState(null);

  const { data: user } = useQuery({ queryKey: ['authMe'], queryFn: () => base44.auth.me() });
  const email = user?.email || '';

  const { data: sitzungen = [] } = useDidaktikerSitzungen(email);
  const { data: sitzung, isLoading } = useDidaktikerSitzung(aktiveId);

  const anlegen = useSitzungAnlegen();
  const recherche = useRecherche();
  const strukturAnlegen = useStrukturAnlegen();

  const starten = async (daten) => {
    const neu = await anlegen.mutateAsync(daten);
    setAktiveId(neu.id);
    recherche.mutate({ sitzung_id: neu.id });
  };

  const laeuftEinstieg = anlegen.isPending || recherche.isPending;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Didaktiker</h1>
            <p className="text-sm text-muted-foreground">
              Der Assistent, der aus einem Thema ein fertiges Basispaket aufbaut.
            </p>
          </div>
        </div>
        {aktiveId && (
          <div className="flex items-center gap-2">
            {sitzung?.einheit_id && (
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <Link to={`/einheiten/${sitzung.einheit_id}`}>
                  <ExternalLink className="h-4 w-4" /> Zur Einheit
                </Link>
              </Button>
            )}
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => setAktiveId(null)}>
              <ArrowLeft className="h-4 w-4" /> Übersicht
            </Button>
          </div>
        )}
      </div>

      {!aktiveId && (
        <>
          <SitzungStarten email={email} onStart={starten} laeuft={laeuftEinstieg} />
          <SitzungListe sitzungen={sitzungen} onOeffnen={setAktiveId} />
        </>
      )}

      {aktiveId && (
        <>
          {(isLoading || recherche.isPending) && (
            <div className="flex items-center gap-2 rounded-lg border border-border p-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {recherche.isPending
                ? 'Der Didaktiker recherchiert und entwirft die Struktur — das dauert einen Moment.'
                : 'Sitzung wird geladen …'}
            </div>
          )}

          {sitzung && (
            <>
              <FundamentKarte fundament={sitzung.fundament} />

              {!sitzung.einheit_id && sitzung.struktur_vorschlag && (
                <StrukturEntwurf
                  entwurf={sitzung.struktur_vorschlag}
                  laeuft={strukturAnlegen.isPending}
                  onUebernehmen={(struktur) =>
                    strukturAnlegen.mutate({ sitzung_id: sitzung.id, struktur })
                  }
                />
              )}

              {sitzung.einheit_id && <LernpaketAufbau sitzung={sitzung} />}
            </>
          )}
        </>
      )}
    </div>
  );
}