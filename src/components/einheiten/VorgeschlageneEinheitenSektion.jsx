import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Globe, Eye, X, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { kannStrukturBearbeiten } from '@/lib/rbac';
import { getFachFarbe, getFachBadgeStyle } from '@/lib/fachFarben';
import EinheitVorschauModal from '@/components/einheiten/EinheitVorschauModal';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

/**
 * Sektion "Zur Veröffentlichung vorgeschlagen" im Poolzeit-Bereich.
 *
 * Zeigt private Einheiten, die Kolleg:innen der Fachschaftsleitung zur
 * Übernahme als Poolzeit-Einheit vorgeschlagen haben. Grundsätzlich NUR im
 * Ansichtsmodus (Schüler-Vorschau) — kein Workspace-Zugriff.
 * Fachschaftsleitung/Admin kann freigeben (setEinheitSichtbarkeitSecure,
 * inkl. Freigabe-Reset aller Inhalte) oder den Vorschlag ablehnen.
 */
export default function VorgeschlageneEinheitenSektion({ einheiten, rolle, benutzerFaecher = [] }) {
  const queryClient = useQueryClient();
  const [freigabeEinheit, setFreigabeEinheit] = useState(null);
  const [vorschauEinheit, setVorschauEinheit] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const { data: faecher = [] } = useQuery({
    queryKey: ['lookupFaecher'],
    queryFn: () => base44.entities.LookupFaecher.list(),
    staleTime: 5 * 60 * 1000,
  });

  if (!einheiten || einheiten.length === 0) return null;

  const handleFreigeben = async (einheit) => {
    setBusyId(einheit.id);
    try {
      const res = await base44.functions.invoke('setEinheitSichtbarkeitSecure', {
        einheit_id: einheit.id,
        sichtbarkeit: 'oeffentlich',
      });
      if (res.data?.success) {
        toast.success(`„${einheit.titel_der_einheit}" ist jetzt eine Poolzeit-Einheit. Alle Inhalte starten als „nicht freigegeben" — Freigabe über das Freigabecockpit.`);
        setFreigabeEinheit(null);
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        toast.error(res.data?.error || 'Freigabe fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Freigabe fehlgeschlagen.');
    } finally {
      setBusyId(null);
    }
  };

  const handleAblehnen = async (einheit) => {
    setBusyId(einheit.id);
    try {
      const res = await base44.functions.invoke('setEinheitVeroeffentlichungVorschlagSecure', {
        einheit_id: einheit.id,
        vorgeschlagen: false,
      });
      if (res.data?.success) {
        toast.success('Vorschlag abgelehnt — die Einheit bleibt privat beim Besitzer.');
        queryClient.invalidateQueries({ queryKey: ['einheiten'] });
      } else {
        toast.error(res.data?.error || 'Ablehnen fehlgeschlagen.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Ablehnen fehlgeschlagen.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="w-4 h-4 text-sky-700" />
        <h2 className="text-sm font-bold text-sky-900">Zur Veröffentlichung vorgeschlagen</h2>
        <span className="text-xs text-sky-800/70">
          {einheiten.length} Einheit{einheiten.length !== 1 ? 'en' : ''} — nur Ansichtsmodus, bis die Fachschaftsleitung sie freigibt
        </span>
      </div>

      <div className="space-y-2">
        {einheiten.map((einheit) => {
          const darfEntscheiden = kannStrukturBearbeiten(rolle, benutzerFaecher, einheit.fach);
          const badgeStyle = getFachBadgeStyle(getFachFarbe(einheit.fach, faecher));
          const isBusy = busyId === einheit.id;
          return (
            <div
              key={einheit.id}
              className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-sky-200 bg-card px-3 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="font-medium border" style={badgeStyle}>{einheit.fach}</Badge>
                  <span className="text-xs text-muted-foreground">Jg. {einheit.jahrgangsstufe}</span>
                  <span className="text-sm font-semibold text-foreground truncate" title={einheit.titel_der_einheit}>
                    {einheit.titel_der_einheit}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Vorgeschlagen von {einheit.vorgeschlagen_von || einheit.besitzer_email || 'unbekannt'}
                  {einheit.vorgeschlagen_am && (
                    <> am {format(new Date(einheit.vorgeschlagen_am), 'dd. MMM yyyy', { locale: de })}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setVorschauEinheit(einheit)}
                  title="Einheit im Ansichtsmodus (Schülersicht) durchsehen"
                >
                  <Eye className="w-3.5 h-3.5" />
                  Ansehen
                </Button>
                {darfEntscheiden && (
                  <>
                    <Button
                      size="sm"
                      className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                      disabled={isBusy}
                      onClick={() => setFreigabeEinheit(einheit)}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Freigeben
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-destructive hover:text-destructive"
                      disabled={isBusy}
                      onClick={() => handleAblehnen(einheit)}
                      title="Vorschlag ablehnen — die Einheit bleibt privat beim Besitzer"
                    >
                      {isBusy
                        ? <div className="w-3.5 h-3.5 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" />
                        : <X className="w-3.5 h-3.5" />}
                      Ablehnen
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {vorschauEinheit && (
        <EinheitVorschauModal
          open={!!vorschauEinheit}
          onOpenChange={(o) => !o && setVorschauEinheit(null)}
          einheit={vorschauEinheit}
        />
      )}

      <Dialog open={!!freigabeEinheit} onOpenChange={(o) => !o && setFreigabeEinheit(null)}>
        <DialogContent className="w-[95%] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Als Poolzeit-Einheit freigeben?</DialogTitle>
            <DialogDescription>
              „{freigabeEinheit?.titel_der_einheit}" wird mit allen Inhalten zur offiziellen
              Poolzeit-Einheit und für die Kolleg:innen des Fachs zur Bearbeitung geöffnet.
              Alle Aktivitäten, Lernpakete und Aufgaben starten dabei als „nicht freigegeben"
              und müssen über das Freigabecockpit aktiv freigegeben werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFreigabeEinheit(null)} disabled={!!busyId}>Abbrechen</Button>
            <Button
              onClick={() => handleFreigeben(freigabeEinheit)}
              disabled={!!busyId}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700"
            >
              {busyId && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <Globe className="w-4 h-4" />
              Jetzt freigeben
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}