import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Hammer, Lock, Settings2, ListOrdered, PencilRuler } from 'lucide-react';
import { toast } from 'sonner';

import { createAllgemeineAufgabe, updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import useSchrittfolge from '@/hooks/useSchrittfolge';
import useStrukturVorschlag from '@/hooks/useStrukturVorschlag';
import useAktivitaetenKatalog from '@/hooks/useAktivitaetenKatalog';
import SchrittListe from '@/components/schritte/SchrittListe';
import SchrittEditor from '@/components/schritte/SchrittEditor';
import SchuelerVorschauSpalte from '@/components/werkstatt/SchuelerVorschauSpalte';
import StrukturPhase from '@/components/werkstatt/StrukturPhase';
import OffenerSchrittGespraech from '@/components/werkstatt/OffenerSchrittGespraech';
import MissionPicker from '@/components/missionen/MissionPicker';
import { SCHRITT_TYPEN, istSchrittVollstaendig, vorschlagZuSchritten } from '@/lib/schrittTypen';

/**
 * AufgabenWerkstatt
 * ─────────────────
 * Die dreispaltige Werkstatt für allgemeine Aufgaben.
 *
 *   links   Schrittfolge — anklickbar, umsortierbar, mit Baustand
 *   mitte   Schülervorschau des gewählten Schritts (oder Gesamtdurchlauf)
 *   rechts  Editor des Schritts, darunter das Gespräch mit dem Assistenten
 *
 * Zwei Grundsätze stecken im Aufbau:
 *
 * 1. Ohne KI bedienbar. Schrittfolge und Editor hängen an keiner Function.
 *    Fällt der Assistent aus, kann eine Lehrkraft weiterhin alles pflegen —
 *    nur das Bauen offener Aufgaben steht dann still.
 *
 * 2. Der Typ sitzt am Schritt. Die Aufgabe selbst trägt nur noch Titel,
 *    Themenfeld und Kategorie; alles Inhaltliche steckt in den Schritten.
 *
 * Ersetzt den SequenzBuilder. Dessen Schritt-Formulare wurden nach
 * components/schritte herausgelöst und werden hier unverändert benutzt.
 */
export default function AufgabenWerkstatt({
  open,
  onOpenChange,
  einheitId,
  themenfelder = [],
  initialData = null,
  defaultAnforderungsebene = '2 - Transfer',
  isReleased = false,
  onSuccess,
}) {
  const queryClient = useQueryClient();
  const folge = useSchrittfolge(open ? initialData : null);

  const [titel, setTitel] = useState('');
  const [themenfeldId, setThemenfeldId] = useState(null);
  const [missionType, setMissionType] = useState(null);
  const [aufgabenstellung, setAufgabenstellung] = useState('');
  const [gesamtdurchlauf, setGesamtdurchlauf] = useState(false);
  const [kopfOffen, setKopfOffen] = useState(false);
  // Welcher Assistent unten rechts arbeitet: die Folge planen oder den
  // offenen Schritt bauen. Ohne Schritte gibt es nur die Struktur-Phase.
  const [rechtsUnten, setRechtsUnten] = useState('struktur');

  useEffect(() => {
    if (!open) return;
    setTitel(initialData?.titel || '');
    setThemenfeldId(initialData?.themenfeld_id || null);
    setMissionType(initialData?.mission_type || null);
    setAufgabenstellung(initialData?.aufgabenstellung || '');
    setGesamtdurchlauf(false);
    setRechtsUnten('struktur');
  }, [open, initialData]);

  const schritt = folge.aktuellerSchritt;
  const istOffenerSchritt = schritt?.typ === SCHRITT_TYPEN.OFFEN;
  // Nur ein offener Schritt lässt sich bauen. Steht die Auswahl auf einem
  // anderen Typ, fällt die untere Spalte auf die Struktur-Phase zurück —
  // sonst bliebe der Umschalter auf einem Zustand stehen, der nichts zeigt.
  const modusUnten = (rechtsUnten === 'schritt' && istOffenerSchritt) ? 'schritt' : 'struktur';

  /* Kontext für den Assistenten. Der Bau eines offenen Schritts läuft in
     OffenerSchrittGespraech — dort, mit key je Schritt, damit das Gespräch
     beim Schrittwechsel neu beginnt. */
  const generatorKontext = useMemo(() => ({
    beschreibung: schritt?.plan?.kurzbeschreibung || aufgabenstellung || '',
    einheit: initialData?.einheit_titel,
    schritt_titel: schritt?.titel || '',
    schritt_nummer: folge.selectedIndex >= 0 ? folge.selectedIndex + 1 : null,
    schritte_gesamt: folge.schritte.length,
  }), [schritt, aufgabenstellung, initialData, folge.selectedIndex, folge.schritte.length]);

  /* ── Struktur-Phase ──────────────────────────────────────────────────
     Plant die Folge, baut nichts. Der Katalog wird gebraucht, um die vom
     Assistenten genannten Formatnamen in echte IDs aufzulösen. */
  const { katalogListe } = useAktivitaetenKatalog();
  const struktur = useStrukturVorschlag({
    kontext: {
      einheit: initialData?.einheit_titel,
      beschreibung: aufgabenstellung || titel || '',
    },
  });

  const vorschlagUebernehmen = (vorschlag, { anhaengen }) => {
    const { schritte, hinweise } = vorschlagZuSchritten(vorschlag, katalogListe);
    folge.folgeSetzen(schritte, { anhaengen });
    hinweise.forEach((h) => toast.warning(h));
    toast.success(anhaengen
      ? `${schritte.length} Schritte angehängt.`
      : `Folge mit ${schritte.length} Schritten übernommen.`);
    setRechtsUnten('schritt');
  };

  // Einen im Gespräch gebauten Stand in den Schritt übernehmen.
  const standUebernehmen = (fragment, snapshotHtml) => {
    if (folge.selectedIndex < 0) return;
    folge.fragmentUebernehmen(folge.selectedIndex, fragment, snapshotHtml);
    toast.success('Stand in den Schritt übernommen. Zum Sichern noch speichern.');
  };

  /* ── Speichern ─────────────────────────────────────────────────────── */

  const gemeinsameFelder = () => ({
    themenfeld_id: themenfeldId || null,
    titel: titel || null,
    mission_type: missionType || null,
    aufgabenstellung: aufgabenstellung || null,
    sequenz_schritte: folge.schritte,
  });

  const speichern = useMutation({
    mutationFn: () => (initialData?.id
      ? updateAllgemeineAufgabe(initialData.id, gemeinsameFelder())
      : createAllgemeineAufgabe({
        einheit_id: einheitId,
        anforderungsebene: defaultAnforderungsebene,
        aufgaben_typ: 'inhalt',
        aufgaben_modus: 'sequenz',
        ...gemeinsameFelder(),
      })),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      folge.alsGespeichertMarkieren();
      toast.success(initialData?.id ? 'Aufgabe gespeichert' : 'Aufgabe angelegt');
      onSuccess?.(result);
      onOpenChange(false);
    },
    onError: (err) => toast.error('Speichern fehlgeschlagen: ' + (err?.message || 'Unbekannter Fehler')),
  });

  const unfertige = folge.schritte.filter((s) => !istSchrittVollstaendig(s)).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] w-[97vw] max-w-[1600px] overflow-hidden bg-slate-50 p-4 flex flex-col">
        <DialogHeader className="border-b border-slate-200 pb-3 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Hammer className="w-4 h-4 text-violet-600" />
            Aufgaben-Werkstatt
            {titel && <span className="text-xs font-normal text-slate-500 ml-1">· {titel}</span>}
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Eine Aufgabe ist eine Folge von Schritten. Jeder Schritt hat seinen eigenen Typ —
            links die Folge, in der Mitte die Schüleransicht, rechts der Schritt selbst.
          </p>
        </DialogHeader>

        {isReleased && (
          <div className="mt-3 flex items-start gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 shrink-0">
            <Lock className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Diese Aufgabe ist freigegeben. Zum Ändern heben Sie zuerst die Freigabe auf —
              ansehen können Sie sie hier trotzdem.
            </span>
          </div>
        )}

        {/* Kopfdaten der Aufgabe — eingeklappt, weil sie selten angefasst werden. */}
        <div className="pt-3 shrink-0">
          <div className="flex items-center gap-3">
            <Input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Titel der Aufgabe"
              className="max-w-md bg-white"
              disabled={isReleased}
            />
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-slate-600"
              onClick={() => setKopfOffen((o) => !o)}
            >
              <Settings2 className="w-4 h-4" />
              {kopfOffen ? 'Angaben zuklappen' : 'Themenfeld & Kategorie'}
            </Button>
          </div>

          {kopfOffen && (
            <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <div className="space-y-2">
                <Label>Themenfeld</Label>
                <Select
                  value={themenfeldId || 'keins'}
                  onValueChange={(v) => setThemenfeldId(v === 'keins' ? null : v)}
                  disabled={isReleased}
                >
                  <SelectTrigger><SelectValue placeholder="Kein Themenfeld" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keins">Kein Themenfeld</SelectItem>
                    {themenfelder.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.titel || t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <MissionPicker value={missionType} onChange={setMissionType} disabled={isReleased} />
            </div>
          )}
        </div>

        {/* ── Die drei Spalten ──────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(360px,1fr)_minmax(360px,1fr)] gap-4 pt-4 flex-1 min-h-0">
          {/* Links: Schrittfolge */}
          <div className="flex flex-col min-h-0 rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 shrink-0">
              Schritte
            </p>
            <SchrittListe
              schritte={folge.schritte}
              selectedIndex={folge.selectedIndex}
              onSelect={folge.setSelectedIndex}
              onAdd={folge.hinzufuegen}
              onDelete={folge.loeschen}
              onMoveUp={folge.nachOben}
              onMoveDown={folge.nachUnten}
            />
          </div>

          {/* Mitte: Schülervorschau */}
          <SchuelerVorschauSpalte
            schritte={folge.schritte}
            selectedIndex={folge.selectedIndex}
            aufgabenstellung={aufgabenstellung}
            gesamtdurchlauf={gesamtdurchlauf}
            onGesamtdurchlaufChange={setGesamtdurchlauf}
          />

          {/* Rechts: Schritt-Editor, darunter das Gespräch */}
          <div className="flex flex-col min-h-0 gap-3">
            <div className="flex-1 min-h-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4">
              {/* Kein onGespraechOeffnen: Bei einem offenen Schritt steht das
                  Gespräch direkt darunter in derselben Spalte. */}
              <SchrittEditor schritt={schritt} onChange={folge.aktuellenAendern} />
            </div>

            {/* Unten rechts: entweder die Folge planen oder den offenen
                Schritt bauen. Umschaltbar, solange beides möglich ist. */}
            <div className="shrink-0 flex flex-col min-h-0 gap-2" style={{ maxHeight: '44vh' }}>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="sm"
                  variant={modusUnten === 'struktur' ? 'default' : 'ghost'}
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setRechtsUnten('struktur')}
                >
                  <ListOrdered className="w-3 h-3" /> Schrittfolge planen
                </Button>
                {istOffenerSchritt && (
                  <Button
                    size="sm"
                    variant={modusUnten === 'schritt' ? 'default' : 'ghost'}
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setRechtsUnten('schritt')}
                  >
                    <PencilRuler className="w-3 h-3" /> Diesen Schritt bauen
                  </Button>
                )}
              </div>

              {modusUnten === 'struktur' ? (
                <StrukturPhase
                  struktur={struktur}
                  hatSchritte={folge.schritte.length > 0}
                  onUebernehmen={vorschlagUebernehmen}
                  disabled={isReleased}
                />
              ) : (
                // key: erzwingt ein frisches Gespräch je Schritt — siehe
                // Kommentar in OffenerSchrittGespraech.
                <OffenerSchrittGespraech
                  key={schritt.id}
                  schritt={schritt}
                  aufgabeId={initialData?.id}
                  kontext={generatorKontext}
                  isReleased={isReleased}
                  onUebernehmen={standUebernehmen}
                />
              )}
            </div>
          </div>
        </div>

        {/* ── Fußleiste ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-3 mt-3 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-500">
            {folge.schritte.length === 0
              ? 'Noch keine Schritte'
              : `${folge.schritte.length} Schritte${unfertige > 0 ? `, ${unfertige} noch unvollständig` : ''}`}
            {folge.dirty && ' · nicht gespeichert'}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Schließen
            </Button>
            <Button
              onClick={() => speichern.mutate()}
              disabled={speichern.isPending || isReleased || folge.schritte.length === 0}
              className="gap-2"
            >
              {speichern.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert…</>
                : <><Save className="w-4 h-4" /> Speichern</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
