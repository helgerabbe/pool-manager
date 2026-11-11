import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ElementKopf from '@/components/workspace/kopf/ElementKopf';
import BearbeitenKnopf from '@/components/workspace/kopf/BearbeitenKnopf';
import VorschauKnopf from '@/components/workspace/kopf/VorschauKnopf';
import AufgabePreviewModal from '@/components/allgemeineAufgaben/AufgabePreviewModal';
import { istVollstaendig } from './LernpaketAufgabenGruppe';
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
  const [vorschau, setVorschau] = useState(false);

  const paketFreigegeben = paket.content_status === 'approved' && !!paket.released_at;
  const istFolge = aufgabe.aufgaben_modus === 'sequenz';
  const schritte = [...(aufgabe.sequenz_schritte || [])].sort((a, b) => (a.reihenfolge ?? 0) - (b.reihenfolge ?? 0));
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
      <ElementKopf
        overline={paket.titel_des_pakets}
        titel={`Aufgabe ${nummer}${aufgabe.titel?.trim() ? `: ${aufgabe.titel}` : ''}`}
        status={aufgabe.content_status === 'approved' ? 'released' : istVollstaendig(aufgabe) ? 'green' : 'red'}
        badges={<>
          <Badge variant="outline">{aufgabe.niveau || NIVEAU_STANDARD}</Badge>
          <Badge variant="outline">{aufgabe.pflicht === false ? 'Freiwillig' : 'Pflicht'}</Badge>
        </>}
        rechts={kannBearbeiten && (
          <BearbeitenKnopf onClick={bearbeiten} laedt={oeffnet} disabled={!!sperrGrund} title={sperrGrund} />
        )}
        onZurueck={onZurueck}
        zurueckLabel={zurueckLabel}
        aktionen={<VorschauKnopf onClick={() => setVorschau(true)} />}
      />
      <AufgabePreviewModal open={vorschau} onOpenChange={setVorschau} aufgabe={aufgabe} />

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