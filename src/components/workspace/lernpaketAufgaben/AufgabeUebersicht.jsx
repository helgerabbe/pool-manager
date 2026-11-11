import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, PenLine } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AufgabenWerkstatt from '@/components/werkstatt/AufgabenWerkstatt';
import AufgabeCreateView from '@/components/allgemeineAufgaben/AufgabeCreateView';
import AufgabeElementKarte from './AufgabeElementKarte';
import { useLernpaketLock } from '@/hooks/useLocks';
import { NIVEAU_STANDARD } from '@/lib/aufgabenNiveau';

/**
 * Übersicht einer Lernpaket-Aufgabe im Inhaltsfenster: Arbeitsauftrag und
 * Elemente. Bearbeitet wird erst über „Bearbeiten" – das sperrt das
 * Lernpaket für andere und öffnet die Aufgabenwerkstatt.
 */
export default function AufgabeUebersicht({ aufgabe, nummer, paket, einheit = null, themenfelder = [], katalogNamen = {}, kannBearbeiten, onZurueck, ohneSperre = false, zurueckLabel = 'Zum Lernpaket' }) {
  // `ohneSperre`: Aufgabe an einem Themenfeld-Platz (Einstieg / Gesamtaufgabe) – dort gibt es kein Lernpaket zum Sperren.
  const queryClient = useQueryClient();
  const { canEdit, isLockedByOther, lockedByEmail, acquireLock, releaseLock } = useLernpaketLock(paket.id);
  const [offen, setOffen] = useState(false);
  const [oeffnet, setOeffnet] = useState(false);

  const paketFreigegeben = paket.content_status === 'approved' && !!paket.released_at;
  const istFolge = aufgabe.aufgaben_modus === 'sequenz';
  const schritte = [...(aufgabe.sequenz_schritte || [])].sort((a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0));
  const zufall = aufgabe.zufallsauswahl_anzahl || 0;
  const sperrGrund = paketFreigegeben ? 'Das Lernpaket ist freigegeben.'
    : isLockedByOther ? `Wird gerade von ${lockedByEmail} bearbeitet.` : '';

  const bearbeiten = async () => {
    if (!ohneSperre) {
      setOeffnet(true);
      const ergebnis = canEdit ? { ok: true } : await acquireLock();
      setOeffnet(false);
      if (!ergebnis?.ok) { toast.error(ergebnis?.error || 'Das Lernpaket konnte nicht für die Bearbeitung gesperrt werden.'); return; }
    }
    setOffen(true);
  };
  const schliessen = async () => {
    setOffen(false);
    queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
    if (!ohneSperre) await releaseLock();
  };

  return (
    <div className="space-y-4">
      <div className="pb-3 border-b">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">{paket.titel_des_pakets}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold">Aufgabe {nummer}{aufgabe.titel?.trim() ? `: ${aufgabe.titel}` : ''}</h2>
          <Badge variant="outline">{aufgabe.niveau || NIVEAU_STANDARD}</Badge>
          <Badge variant="outline">{aufgabe.pflicht === false ? 'Wahl' : 'Pflicht'}</Badge>
          {zufall > 0 && <Badge variant="outline">{zufall} von {schritte.length} zufällig</Badge>}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={onZurueck}>
          <ArrowLeft /> {zurueckLabel}
        </Button>
        {kannBearbeiten && (
          <Button variant="outline" size="sm" onClick={bearbeiten} disabled={oeffnet || !!sperrGrund} title={sperrGrund}
            className="gap-2 bg-green-50 border-green-200 text-green-800 hover:bg-green-100 hover:text-green-900">
            {oeffnet ? <Loader2 className="animate-spin" /> : <PenLine />} Bearbeiten
          </Button>
        )}
      </div>

      {aufgabe.aufgabenstellung?.trim() && (
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Arbeitsauftrag</p>
          <p className="text-sm text-foreground whitespace-pre-wrap">{aufgabe.aufgabenstellung}</p>
        </div>
      )}

      {istFolge && (
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-foreground">
            {schritte.length} {schritte.length === 1 ? 'Element' : 'Elemente'}
          </h3>
          {schritte.length === 0 && <p className="text-xs text-muted-foreground italic">Diese Aufgabe hat noch keine Elemente.</p>}
          {schritte.map((s, i) => (
            <AufgabeElementKarte key={s.id || i} schritt={s} nummer={i + 1} aktivitaetName={katalogNamen[s.aktivitaet_id] || ''} />
          ))}
        </div>
      )}

      <AufgabeCreateView
        open={offen && !istFolge}
        onOpenChange={(o) => { if (!o) schliessen(); }}
        einheitId={aufgabe.einheit_id}
        themenfelder={themenfelder}
        initialData={aufgabe}
      />
      <AufgabenWerkstatt
        open={offen && istFolge}
        onOpenChange={(o) => { if (!o) schliessen(); }}
        einheitId={aufgabe.einheit_id}
        einheit={einheit}
        themenfelder={themenfelder}
        initialData={aufgabe}
        defaultThemenfeldId={paket.themenfeld_id || null}
        isReleased={aufgabe.content_status === 'approved'}
      />
    </div>
  );
}