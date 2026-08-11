/**
 * LernpaketIntegrationEingang.jsx
 *
 * Erster Tab einer Poolzeit-Einheit: Lernpakete, die Kolleg:innen aus ihrem
 * Privatbereich zur Integration angeboten haben. Die Fachschaftsleitung kann
 * jedes Angebot in der Schüler-Vorschau prüfen und dann übernehmen oder
 * ablehnen.
 */
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Eye, Download, X, Inbox, Loader2 } from 'lucide-react';
import HelpBadge from '@/components/ui/HelpBadge';
import LernpaketPreviewModal from '@/components/workspace/preview/LernpaketPreviewModal';
import LernpaketIntegrationDialog from './LernpaketIntegrationDialog';

export default function LernpaketIntegrationEingang({ einheit }) {
  const queryClient = useQueryClient();
  const [previewAngebot, setPreviewAngebot] = useState(null);
  const [integrationAngebot, setIntegrationAngebot] = useState(null);
  const [ablehnenId, setAblehnenId] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['lernpaket-integration-angebote', einheit?.id],
    queryFn: async () => {
      const res = await base44.functions.invoke('listLernpaketIntegrationAngebote', { einheit_id: einheit.id });
      return res?.data ?? res;
    },
    enabled: !!einheit?.id,
  });

  const { data: katalog = [] } = useQuery({
    queryKey: ['aktivitaetenKatalog'],
    queryFn: () => base44.entities.AktivitaetenKatalog.list(),
  });

  const angebote = data?.angebote || [];
  if (!data?.darf_verwalten && !isLoading) return null;

  const ablehnen = async (angebot) => {
    setAblehnenId(angebot.paket.id);
    try {
      const res = await base44.functions.invoke('integrateLernpaketSecure', {
        lernpaket_id: angebot.paket.id,
        einheit_id: einheit.id,
        aktion: 'ablehnen',
      });
      const resData = res?.data ?? res;
      if (resData?.error) throw new Error(resData.error);
      toast.success('Angebot abgelehnt.');
      refetch();
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.message || 'Aktion fehlgeschlagen.');
    } finally {
      setAblehnenId(null);
    }
  };

  return (
    <>
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-1.5">
          Lernpakete zur Integration
          <HelpBadge
            text="Kolleg:innen können fertige Lernpakete aus ihrem Privatbereich dieser Einheit anbieten. Prüfen Sie das Paket in der Vorschau und übernehmen Sie es dann als Kopie in ein Themenfeld. Zum Integrieren muss der Bearbeitungsmodus dieser Einheit aktiv sein."
          />
        </h2>
        <p className="text-sm text-muted-foreground mt-0.5">Angebotene Lernpakete prüfen und in die Einheit übernehmen.</p>
      </div>

      <div className="space-y-3 p-5 rounded-xl border bg-card">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-6 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Angebote werden geladen…
          </p>
        ) : angebote.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6 border border-dashed rounded-lg">
            Aktuell wurden keine Lernpakete zur Integration angeboten.
          </p>
        ) : (
          angebote.map((angebot) => (
            <div key={angebot.paket.id} className="p-3 rounded-lg border bg-background space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
                  <Inbox className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{angebot.paket.titel_des_pakets}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    Von <strong>{angebot.quelle.besitzer_email || '—'}</strong> · aus „{angebot.quelle.einheit_titel}"
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {angebot.aktivitaeten.length} Aktivitäten · {angebot.lernziele.length} Lernziele
                    {angebot.paket.integration_angeboten_am && (
                      <> · angeboten am {new Date(angebot.paket.integration_angeboten_am).toLocaleDateString('de-DE')}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewAngebot(angebot)}
                  className="gap-1.5 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100"
                >
                  <Eye className="w-3.5 h-3.5" /> Vorschau
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => ablehnen(angebot)}
                  disabled={ablehnenId === angebot.paket.id}
                  className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50"
                >
                  {ablehnenId === angebot.paket.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <X className="w-3.5 h-3.5" />}
                  Ablehnen
                </Button>
                <Button size="sm" onClick={() => setIntegrationAngebot(angebot)} className="gap-1.5">
                  <Download className="w-3.5 h-3.5" /> Integrieren
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {previewAngebot && (
        <LernpaketPreviewModal
          open={!!previewAngebot}
          onOpenChange={(v) => !v && setPreviewAngebot(null)}
          paket={previewAngebot.paket}
          aktivitaeten={previewAngebot.aktivitaeten}
          katalog={katalog}
          masters={previewAngebot.masters}
          lernziele={previewAngebot.lernziele}
        />
      )}

      {integrationAngebot && (
        <LernpaketIntegrationDialog
          open={!!integrationAngebot}
          onOpenChange={(v) => !v && setIntegrationAngebot(null)}
          angebot={integrationAngebot}
          einheit={einheit}
          onIntegrated={() => {
            setIntegrationAngebot(null);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['workspace-data', einheit.id] });
          }}
        />
      )}
    </>
  );
}