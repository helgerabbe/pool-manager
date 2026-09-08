import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles, ScanSearch, Check } from 'lucide-react';
import { createLernziel } from '@/services/LernzielService';
import LernzielWerkstattBestand from '@/components/workspace/lernziele/LernzielWerkstattBestand';
import LernzielVorschlagKarte from '@/components/workspace/lernziele/LernzielVorschlagKarte';

/**
 * LernzielWerkstatt
 * ─────────────────
 * „Reverse Engineering" der Lernziele eines Lernpakets: Die KI liest das
 * fertige Material und meldet, welche eingetragenen Ziele darin belegt sind
 * und welche Ziele im Material stecken, aber noch fehlen. Vorschläge kann die
 * Lehrkraft anpassen, auswählen und als neue Lernziele übernehmen.
 */
export default function LernzielWerkstatt({ open, onOpenChange, paket, ziele = [], einheitId }) {
  const queryClient = useQueryClient();
  const [analyse, setAnalyse] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fehler, setFehler] = useState(null);
  const [vorschlaege, setVorschlaege] = useState([]);
  const [uebernehmeLaeuft, setUebernehmeLaeuft] = useState(false);

  const analysieren = async () => {
    setBusy(true);
    setFehler(null);
    try {
      const res = await base44.functions.invoke('lernzielWerkstattAnalyse', { lernpaket_id: paket.id });
      if (res.data?.error) throw new Error(res.data.error);
      setAnalyse(res.data);
      setVorschlaege((res.data?.vorschlaege || []).map((v, i) => ({ ...v, _key: i, gewaehlt: true })));
    } catch (e) {
      setFehler(e?.message || 'Analyse fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const aendern = (key, patch) => setVorschlaege((alt) => alt.map((v) => (v._key === key ? { ...v, ...patch } : v)));

  const gewaehlte = vorschlaege.filter((v) => v.gewaehlt && v.formulierung_fachsprache.trim());

  const uebernehmen = async () => {
    if (gewaehlte.length === 0) return;
    setUebernehmeLaeuft(true);
    try {
      await Promise.all(gewaehlte.map((v) => createLernziel({
        lernpaket_id: paket.id,
        formulierung_fachsprache: v.formulierung_fachsprache.trim(),
        schueler_uebersetzung: (v.schueler_uebersetzung || '').trim(),
        kategorie: v.kategorie || undefined,
      })));
      await queryClient.invalidateQueries({ queryKey: ['workspace-data', einheitId] });
      toast.success(`${gewaehlte.length} Lernziel${gewaehlte.length === 1 ? '' : 'e'} übernommen.`);
      setVorschlaege((alt) => alt.filter((v) => !v.gewaehlt));
      onOpenChange(false);
    } catch (e) {
      toast.error(`Übernehmen fehlgeschlagen: ${e?.message || 'Unbekannter Fehler'}`);
    } finally {
      setUebernehmeLaeuft(false);
    }
  };

  const schliessen = (o) => {
    if (!o) { setAnalyse(null); setVorschlaege([]); setFehler(null); }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={schliessen}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Lernziel-Werkstatt · {paket?.titel_des_pakets}
          </DialogTitle>
          <DialogDescription>
            Die KI liest das fertige Material dieses Lernpakets und prüft, welche Lernziele darin
            wirklich geübt werden – und welche noch fehlen.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {!analyse && !busy && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <ScanSearch className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground max-w-md">
                Gescannt werden alle Aktivitäten und Varianten des Pakets sowie die Aufgaben des
                Themenfelds. Aktuell sind {ziele.length} Lernziel{ziele.length === 1 ? '' : 'e'} eingetragen.
              </p>
              <Button onClick={analysieren} className="gap-2">
                <Sparkles className="w-4 h-4" /> Material analysieren
              </Button>
              {fehler && <p className="text-sm text-destructive">{fehler}</p>}
            </div>
          )}

          {busy && (
            <div className="flex flex-col items-center gap-3 py-10 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm">Material wird gelesen und mit den Lernzielen abgeglichen …</p>
            </div>
          )}

          {analyse && !busy && (
            <>
              <p className="text-xs text-muted-foreground">
                Gescannt: {analyse.gescannt?.aktivitaeten || 0} Aktivitäten, {analyse.gescannt?.varianten || 0} Varianten,
                {' '}{analyse.gescannt?.aufgaben || 0} Aufgaben im Themenfeld.
              </p>

              <LernzielWerkstattBestand ziele={ziele} bestand={analyse.bestand || []} />

              <section className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  Im Material gefunden, aber noch nicht eingetragen
                  <span className="text-xs font-normal text-muted-foreground">({vorschlaege.length})</span>
                </h3>
                {vorschlaege.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-4">
                    Keine Lücken gefunden – die eingetragenen Lernziele decken das Material ab.
                  </p>
                ) : vorschlaege.map((v) => (
                  <LernzielVorschlagKarte key={v._key} vorschlag={v} onChange={(patch) => aendern(v._key, patch)} />
                ))}
              </section>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 px-6 py-3 border-t shrink-0">
          {analyse && !busy && (
            <Button variant="ghost" size="sm" onClick={analysieren} className="gap-2 text-muted-foreground">
              <ScanSearch className="w-4 h-4" /> Erneut analysieren
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => schliessen(false)}>Schließen</Button>
            {analyse && (
              <Button onClick={uebernehmen} disabled={gewaehlte.length === 0 || uebernehmeLaeuft} className="gap-2">
                {uebernehmeLaeuft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {gewaehlte.length} Lernziel{gewaehlte.length === 1 ? '' : 'e'} übernehmen
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}