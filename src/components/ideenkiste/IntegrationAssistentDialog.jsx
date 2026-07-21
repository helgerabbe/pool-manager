import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, RefreshCw, ArrowRight, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';
import { holeIntegrationsVorschlag, legeAufgabeAn, markiereAlsIntegriert } from '@/lib/ideenIntegration';

const ZIEL_LABELS = {
  allgemeine_aufgabe: 'Allgemeine Aufgabe (Ebene 2)',
  projektaufgabe: 'Anwendungs-/Projektaufgabe (Ebene 3)',
  lernpaket_empfehlung: 'Lernpaket-Übung (Ebene 1)',
};

/**
 * Integrations-Assistent (Etappe 3): analysiert eine offene Aufgaben-Idee
 * gegen den aktuellen Einheiten-Stand, zeigt den Platzierungsvorschlag der
 * KI und legt die Aufgabe bei Zustimmung tatsächlich an.
 */
export default function IntegrationAssistentDialog({ open, onOpenChange, idee, einheit }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [vorschlag, setVorschlag] = useState(null);
  const [struktur, setStruktur] = useState({ themenfelder: [], lernpakete: [] });
  const [anlegen, setAnlegen] = useState(false);

  const analysieren = useCallback(async () => {
    if (!idee || !einheit?.id) return;
    setLoading(true);
    setVorschlag(null);
    try {
      const [themenfelder, lernpakete, aufgaben] = await Promise.all([
        base44.entities.Themenfeld.filter({ einheit_id: einheit.id }),
        base44.entities.Lernpakete.filter({ einheit_id: einheit.id }),
        base44.entities.AllgemeineAufgabe.filter({ einheit_id: einheit.id }),
      ]);
      setStruktur({ themenfelder, lernpakete });
      const res = await holeIntegrationsVorschlag({
        einheit,
        idee,
        themenfelder,
        lernpakete,
        vorhandeneAufgaben: aufgaben,
      });
      setVorschlag(res);
    } catch (_err) {
      toast.error('Analyse fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setLoading(false);
    }
  }, [idee, einheit]);

  useEffect(() => {
    if (open) analysieren();
    else setVorschlag(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idee?.id]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['aufgaben-ideen', einheit?.id] });
    queryClient.invalidateQueries({ queryKey: ['workspace-data', einheit?.id] });
    queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
  };

  const handleAnlegen = async () => {
    setAnlegen(true);
    try {
      await legeAufgabeAn({ einheit, idee, vorschlag, themenfelder: struktur.themenfelder });
      invalidateAll();
      toast.success('Aufgabe wurde in der Einheit angelegt. Die Idee ist jetzt als „Integriert" markiert.');
      onOpenChange(false);
    } catch (_err) {
      toast.error('Anlegen fehlgeschlagen.');
    } finally {
      setAnlegen(false);
    }
  };

  const handleManuellIntegriert = async () => {
    setAnlegen(true);
    try {
      const lp = struktur.lernpakete.find((p) => p.id === vorschlag?.lernpaket_id);
      await markiereAlsIntegriert(
        idee,
        lp ? `Als Lernpaket-Übung in „${lp.titel_des_pakets}" umgesetzt` : 'Als Lernpaket-Übung umgesetzt'
      );
      invalidateAll();
      toast.success('Idee als integriert markiert.');
      onOpenChange(false);
    } catch (_err) {
      toast.error('Markieren fehlgeschlagen.');
    } finally {
      setAnlegen(false);
    }
  };

  const themenfeldName = vorschlag?.themenfeld_id
    ? struktur.themenfelder.find((t) => t.id === vorschlag.themenfeld_id)?.titel ||
      struktur.themenfelder.find((t) => t.id === vorschlag.themenfeld_id)?.name
    : null;
  const lernpaketName = vorschlag?.lernpaket_id
    ? struktur.lernpakete.find((p) => p.id === vorschlag.lernpaket_id)?.titel_des_pakets
    : null;
  const istEmpfehlung = vorschlag?.ziel === 'lernpaket_empfehlung';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95%] sm:max-w-xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="w-5 h-5 text-primary" />
            In die Einheit integrieren
          </DialogTitle>
          <DialogDescription>
            Der Assistent prüft den aktuellen Stand der Einheit und schlägt vor, wo und in
            welcher Form „{idee?.titel}" integriert wird.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-3 py-1">
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 gap-3 text-muted-foreground">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
              <p className="text-sm">Einheit wird analysiert, Vorschlag wird erarbeitet …</p>
            </div>
          )}

          {vorschlag && !loading && (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-primary/10 text-primary border border-primary/30">
                  {ZIEL_LABELS[vorschlag.ziel] || vorschlag.ziel}
                </Badge>
                {themenfeldName && <Badge variant="outline">Themenfeld: {themenfeldName}</Badge>}
                {lernpaketName && <Badge variant="outline">Lernpaket: {lernpaketName}</Badge>}
                {vorschlag.mission_type && !istEmpfehlung && <Badge variant="outline">Mission: {vorschlag.mission_type}</Badge>}
              </div>

              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Begründung des Assistenten</p>
                <p className="text-sm">{vorschlag.begruendung}</p>
              </div>

              {istEmpfehlung ? (
                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-blue-900 flex items-center gap-1.5">
                    <PackageOpen className="w-3.5 h-3.5" />
                    Empfehlung für die Umsetzung
                  </p>
                  <p className="text-sm text-blue-900/90">{vorschlag.empfehlung_text}</p>
                  <p className="text-xs text-blue-800/70">
                    Kurze Übungen in Lernpaketen legen Sie in den Tabs „Aktivitäten zuordnen" und
                    „Basisaufgaben erstellen" an. Danach können Sie die Idee hier als integriert markieren.
                  </p>
                </div>
              ) : (
                <div className="rounded-lg border p-3 space-y-2">
                  <p className="text-sm font-semibold">{vorschlag.titel}</p>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">Aufgabenstellung</p>
                    <p className="text-sm whitespace-pre-line">{vorschlag.aufgabenstellung}</p>
                  </div>
                  {vorschlag.erwartungshorizont && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">Erwartungshorizont</p>
                      <p className="text-xs text-muted-foreground whitespace-pre-line">{vorschlag.erwartungshorizont}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {vorschlag && !loading && (
          <div className="shrink-0 flex flex-col sm:flex-row gap-2 border-t pt-3">
            <Button variant="outline" size="sm" onClick={analysieren} disabled={anlegen} className="gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" />
              Neu vorschlagen
            </Button>
            <div className="flex-1" />
            {istEmpfehlung ? (
              <Button size="sm" onClick={handleManuellIntegriert} disabled={anlegen} className="gap-1.5">
                {anlegen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Idee als integriert markieren
              </Button>
            ) : (
              <Button size="sm" onClick={handleAnlegen} disabled={anlegen} className="gap-1.5">
                {anlegen ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Aufgabe jetzt anlegen
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}