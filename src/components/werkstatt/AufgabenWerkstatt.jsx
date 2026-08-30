import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Hammer, Lock, ListOrdered, FolderOpen, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { createAllgemeineAufgabe, updateAllgemeineAufgabe } from '@/services/AllgemeineAufgabeService';
import useSchrittfolge from '@/hooks/useSchrittfolge';
import useStrukturVorschlag from '@/hooks/useStrukturVorschlag';
import useAktivitaetenKatalog from '@/hooks/useAktivitaetenKatalog';
import SchrittListe from '@/components/schritte/SchrittListe';
import SchuelerVorschauSpalte from '@/components/werkstatt/SchuelerVorschauSpalte';
import StrukturPhase from '@/components/werkstatt/StrukturPhase';
import WerkstattEinstieg from '@/components/werkstatt/WerkstattEinstieg';
import SchrittFenster from '@/components/werkstatt/SchrittFenster';
import MissionPicker from '@/components/missionen/MissionPicker';
import { istSchrittVollstaendig, vorschlagZuSchritten } from '@/lib/schrittTypen';
import { getMission } from '@/lib/missionen';

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
  const [materialien, setMaterialien] = useState([]);
  const [idee, setIdee] = useState('');
  // 'einstieg' = Material + Idee, 'werkstatt' = Schrittfolge bearbeiten.
  // Der Wechsel passiert, sobald es Schritte gibt (oder die Lehrkraft ihn
  // ausdrücklich verlangt), nicht als eigener Bedienschritt.
  const [ansicht, setAnsicht] = useState('einstieg');
  const [gesamtdurchlauf, setGesamtdurchlauf] = useState(false);
  const [kopfOffen, setKopfOffen] = useState(false);
  // Ebene 3: Fenster zum Bearbeiten EINES Schritts.
  const [schrittFensterOffen, setSchrittFensterOffen] = useState(false);
  const [planerOffen, setPlanerOffen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitel(initialData?.titel || '');
    setThemenfeldId(initialData?.themenfeld_id || null);
    setMissionType(initialData?.mission_type || null);
    setAufgabenstellung(initialData?.aufgabenstellung || '');
    setMaterialien(Array.isArray(initialData?.materialien) ? initialData.materialien : []);
    setIdee('');
    setGesamtdurchlauf(false);
    setSchrittFensterOffen(false);
    setPlanerOffen(false);
    // Eine Aufgabe, die schon Schritte hat, wird bearbeitet, nicht neu
    // begonnen — dann direkt in die Werkstatt.
    const hatSchritte = Array.isArray(initialData?.sequenz_schritte)
      && initialData.sequenz_schritte.length > 0;
    setAnsicht(hatSchritte ? 'werkstatt' : 'einstieg');
  }, [open, initialData]);

  const schritt = folge.aktuellerSchritt;

  /* Welche Arbeit gerade ansteht, entscheidet über die Spaltenbreiten.
     Am Ablauf zu arbeiten heißt lesen und umstellen — dafür braucht die
     linke Spalte Platz, und die Schülersicht ist noch nebensächlich, weil
     die Schritte ja noch leer sind. Sobald es ans Füllen geht, dreht sich
     das um. */
  const arbeitetAmAblauf = planerOffen || folge.schritte.length === 0;
  const gewaehlteKategorie = getMission(missionType);

  /* Kontext für den Assistenten beim Bau eines offenen Schritts. Gebaut wird
     im SchrittFenster (Ebene 3), nicht hier. */
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

  /**
   * Einstieg → Vorschlag. Die Idee ist die Nachricht, die Materialien gehen
   * als Kontext mit. Die Ansicht wechselt erst, wenn ein Vorschlag da ist —
   * sonst stünde die Lehrkraft vor einer leeren Werkstatt und wüsste nicht,
   * ob noch etwas kommt.
   */
  const ablaufVorschlagen = () => {
    const text = idee.trim();
    if (!text && materialien.length === 0) {
      toast.error('Erzählen Sie kurz, worum es gehen soll — oder legen Sie die Folge selbst an.');
      return;
    }
    struktur.senden(
      text || 'Ich habe nur Material, aber noch keine ausformulierte Idee. Schlag mir auf dieser Grundlage einen Ablauf vor.',
      { materialien },
    );
    setAnsicht('werkstatt');
    // Der Kasten MUSS offen sein — dort erscheint die Antwort. Zugeklappt
    // sähe es aus, als sei nichts passiert.
    setPlanerOffen(true);
  };

  const vorschlagUebernehmen = (vorschlag, { anhaengen }) => {
    const { schritte, hinweise } = vorschlagZuSchritten(vorschlag, katalogListe);
    folge.folgeSetzen(schritte, { anhaengen });
    hinweise.forEach((h) => toast.warning(h));
    toast.success(anhaengen
      ? `${schritte.length} Schritte angehängt.`
      : `Folge mit ${schritte.length} Schritten übernommen.`);
    setAnsicht('werkstatt');
    setPlanerOffen(false);
  };

  // Einen im Gespräch gebauten Stand in den Schritt übernehmen.
  /** Ergebnis aus dem Schritt-Fenster zurück in die Folge schreiben. */
  const schrittUebernehmen = (neuerSchritt) => {
    if (folge.selectedIndex < 0) return;
    folge.aendern(folge.selectedIndex, neuerSchritt);
    setSchrittFensterOffen(false);
    toast.success('Schritt übernommen. Zum Sichern noch speichern.');
  };

  /* ── Speichern ─────────────────────────────────────────────────────── */

  const gemeinsameFelder = () => ({
    themenfeld_id: themenfeldId || null,
    titel: titel || null,
    mission_type: missionType || null,
    aufgabenstellung: aufgabenstellung || null,
    materialien,
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
            {ansicht === 'einstieg'
              ? 'Zuerst sammeln: Was haben Sie schon, und was soll passieren? Daraus entsteht der Ablauf.'
              : 'Eine Aufgabe ist eine Folge von Schritten. Jeder Schritt hat seinen eigenen Typ — links die Folge, in der Mitte die Schüleransicht, rechts der Schritt selbst.'}
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

        {/* Kopfdaten. Titel und Themenfeld nebeneinander — das Themenfeld
            ist beim Anlegen ohnehin meist schon bekannt, weil die Lehrkraft
            aus einem Themenfeld heraus kommt. Die Kategorie sitzt im
            Akkordeon, zeigt ihren Wert aber im zugeklappten Zustand an. */}
        <div className="pt-3 shrink-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Titel der Aufgabe"
              className="flex-1 min-w-[220px] max-w-md bg-white"
              disabled={isReleased}
            />
            <Select
              value={themenfeldId || 'keins'}
              onValueChange={(v) => setThemenfeldId(v === 'keins' ? null : v)}
              disabled={isReleased}
            >
              <SelectTrigger className="w-[220px] bg-white">
                <SelectValue placeholder="Kein Themenfeld" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="keins">Kein Themenfeld</SelectItem>
                {themenfelder.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.titel || t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-white"
              onClick={() => setKopfOffen((o) => !o)}
              disabled={isReleased}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              {gewaehlteKategorie
                ? <>{gewaehlteKategorie.emoji} {gewaehlteKategorie.label}</>
                : 'Noch keine Kategorie gewählt'}
              {kopfOffen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </Button>
          </div>

          {kopfOffen && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <p className="text-[11px] text-slate-500">
                Wo im Unterrichtsverlauf steht diese Aufgabe? (optional)
              </p>
              {/* Nach der Wahl klappt der Kasten zu — die Entscheidung ist
                  getroffen und steht ab dann im Knopf darüber. */}
              <MissionPicker
                kompakt
                value={missionType}
                onChange={(v) => { setMissionType(v); setKopfOffen(false); }}
                disabled={isReleased}
              />
            </div>
          )}
        </div>

        {ansicht === 'einstieg' ? (
          <div className="flex-1 min-h-0 overflow-y-auto pt-4">
            <WerkstattEinstieg
              materialien={materialien}
              onMaterialienChange={setMaterialien}
              idee={idee}
              onIdeeChange={setIdee}
              onVorschlagen={ablaufVorschlagen}
              onSelbstAnlegen={() => setAnsicht('werkstatt')}
              busy={struktur.busy}
              disabled={isReleased}
            />
          </div>
        ) : (
        /* Zwei Spalten: Struktur links, Schülersicht rechts. Der INHALT
           eines Schritts wird nicht hier, sondern im SchrittFenster
           bearbeitet (Ebene 3). Diese Seite ist für den Ablauf zuständig:
           anlegen, löschen, umsortieren. */
        <div className={`grid grid-cols-1 gap-4 pt-4 flex-1 min-h-0 transition-[grid-template-columns] duration-200 ${
          arbeitetAmAblauf
            ? 'lg:grid-cols-[minmax(460px,1fr)_minmax(240px,340px)]'
            : 'lg:grid-cols-[minmax(320px,400px)_1fr]'
        }`}>
          {/* Links: Schrittfolge + Ablaufplanung */}
          <div className="flex flex-col min-h-0 gap-3">
            <div className={`${arbeitetAmAblauf ? 'shrink-0 max-h-[38vh]' : 'flex-1'} min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white p-3`}>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 shrink-0">
                Ablauf der Aufgabe
              </p>
              <SchrittListe
                schritte={folge.schritte}
                selectedIndex={folge.selectedIndex}
                onSelect={folge.setSelectedIndex}
                onOpen={(i) => { folge.setSelectedIndex(i); setSchrittFensterOffen(true); }}
                onAdd={folge.hinzufuegen}
                onDelete={folge.loeschen}
                onMoveUp={folge.nachOben}
                onMoveDown={folge.nachUnten}
              />
            </div>

            {/* Der Assistent bleibt erreichbar, nimmt aber zugeklappt keinen
                Platz weg — auf dieser Seite geht es meist um Feinschliff. */}
            <div className={`${planerOffen ? 'flex-1' : 'shrink-0'} min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden`}>
              <button
                type="button"
                onClick={() => setPlanerOffen((o) => !o)}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors shrink-0"
              >
                {planerOffen ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                <ListOrdered className="w-4 h-4 text-violet-600 shrink-0" />
                <span className="text-xs font-semibold text-slate-700">
                  Ablauf mit dem Assistenten ändern
                </span>
              </button>
              {planerOffen && (
                <div className="px-3 pb-3 border-t border-slate-100 pt-3 flex-1 min-h-0 flex flex-col">
                  <StrukturPhase
                    struktur={struktur}
                    hatSchritte={folge.schritte.length > 0}
                    onUebernehmen={vorschlagUebernehmen}
                    disabled={isReleased}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Rechts: Schülervorschau des gewählten Schritts */}
          <SchuelerVorschauSpalte
            schritte={folge.schritte}
            selectedIndex={folge.selectedIndex}
            aufgabenstellung={aufgabenstellung}
            gesamtdurchlauf={gesamtdurchlauf}
            onGesamtdurchlaufChange={setGesamtdurchlauf}
          />
        </div>
        )}

        {/* ── Fußleiste ─────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-3 mt-3 border-t border-slate-200 shrink-0">
          <p className="text-xs text-slate-500">
            {ansicht === 'einstieg'
              ? 'Material und Idee sammeln'
              : (folge.schritte.length === 0
                ? 'Noch keine Schritte'
                : `${folge.schritte.length} Schritte${unfertige > 0 ? `, ${unfertige} noch unvollständig` : ''}`)}
            {folge.dirty && ' · nicht gespeichert'}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {/* Zurück zum Einstieg — Material und Idee bleiben erreichbar,
                ohne dauerhaft Platz zu belegen. */}
            {ansicht === 'werkstatt' && (
              <Button variant="ghost" onClick={() => setAnsicht('einstieg')} className="gap-2 text-slate-600">
                <FolderOpen className="w-4 h-4" />
                Material &amp; Idee
                {materialien.length > 0 && (
                  <span className="rounded-full bg-slate-200 px-1.5 text-[10px] font-semibold">
                    {materialien.length}
                  </span>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Schließen
            </Button>
            {/* Im Einstieg gibt es noch nichts zu speichern — der Weg führt
                über "Weiter". */}
            {ansicht === 'werkstatt' && (
              <Button
                onClick={() => speichern.mutate()}
                disabled={speichern.isPending || isReleased || folge.schritte.length === 0}
                className="gap-2"
              >
                {speichern.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Wird gespeichert…</>
                  : <><Save className="w-4 h-4" /> Speichern</>}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Ebene 3 — liegt über diesem Dialog (siehe zIndex in SchrittFenster). */}
      <SchrittFenster
        open={schrittFensterOffen && !!schritt}
        schritt={schritt}
        nummer={folge.selectedIndex + 1}
        aufgabeId={initialData?.id}
        aufgabenstellung={aufgabenstellung}
        kontext={generatorKontext}
        isReleased={isReleased}
        onUebernehmen={schrittUebernehmen}
        onAbbrechen={() => setSchrittFensterOffen(false)}
      />
    </Dialog>
  );
}
