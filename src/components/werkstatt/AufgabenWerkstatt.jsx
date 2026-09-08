import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Save, Loader2, Hammer, Lock, ListOrdered, FolderOpen, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import WerkstattPhasenLeiste from '@/components/werkstatt/WerkstattPhasenLeiste';
import AblaufUebernehmenWarnung from '@/components/werkstatt/AblaufUebernehmenWarnung';
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
import AufgabeAssistentDialog from '@/components/werkstatt/AufgabeAssistentDialog';
import { schrittAusFormatWahl } from '@/lib/aufgabeFormatWahl';
import ThemenfeldIdeenModal from '@/components/missionen/ThemenfeldIdeenModal';
import MissionPicker from '@/components/missionen/MissionPicker';
import SternRating from '@/components/allgemeineAufgaben/aufgabeSections/SternRating';
import {
  istSchrittVollstaendig, schritteZuVorschlag, vorschlagMitBestandVerschmelzen,
} from '@/lib/schrittTypen';
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
  einheit = null,
  themenfelder = [],
  initialData = null,
  defaultThemenfeldId = null,
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
  const [schwierigkeit, setSchwierigkeit] = useState(null);
  const [materialien, setMaterialien] = useState([]);
  const [idee, setIdee] = useState('');
  // Drei klar getrennte Bereiche:
  //   'einstieg'  = Material + Idee sammeln
  //   'struktur'  = NUR den Ablauf planen (Anzahl, Reihenfolge, Art der Schritte)
  //   'werkstatt' = die Aufgaben der Schritte ausarbeiten
  const [ansicht, setAnsicht] = useState('einstieg');
  const [gesamtdurchlauf, setGesamtdurchlauf] = useState(false);
  const [kopfOffen, setKopfOffen] = useState(false);
  // Ebene 3: Fenster zum Bearbeiten EINES Schritts.
  const [schrittFensterOffen, setSchrittFensterOffen] = useState(false);
  // Geänderter Ablauf, der ausgearbeitete Schritte wegwerfen würde — wartet
  // auf Bestätigung. null = keine Warnung offen.
  const [ablaufWarnung, setAblaufWarnung] = useState(null);
  const [generatorOffen, setGeneratorOffen] = useState(false);
  // Aufgaben-Assistent: -1 = neuen Schritt anhängen, >=0 = diesen ersetzen
  // (Format wechseln). null = zu.
  const [assistentZiel, setAssistentZiel] = useState(null);
  /* Datenbank-ID der Aufgabe. Eigener Zustand, weil die Werkstatt jetzt
     SELBST anlegt: Wird ein Schritt übernommen, bevor die Aufgabe je
     gespeichert wurde, entsteht der Datensatz sofort — und alle weiteren
     Sicherungen laufen dann als Änderung auf dieser ID. */
  const [aufgabeId, setAufgabeId] = useState(initialData?.id || null);

  useEffect(() => {
    if (!open) return;
    setTitel(initialData?.titel || '');
    // Beim Anlegen aus einem Themenfeld heraus ist die Antwort schon klar —
    // die Lehrkraft hat gerade "Neue Aufgabe zu diesem Themenfeld" gedrückt.
    setThemenfeldId(initialData?.themenfeld_id || defaultThemenfeldId || null);
    setMissionType(initialData?.mission_type || null);
    setSchwierigkeit(initialData?.schwierigkeitsgrad ?? null);
    setAufgabenstellung(initialData?.aufgabenstellung || '');
    setMaterialien(Array.isArray(initialData?.materialien) ? initialData.materialien : []);
    setIdee('');
    setGesamtdurchlauf(false);
    setSchrittFensterOffen(false);
    setAblaufWarnung(null);
    setGeneratorOffen(false);
    setAssistentZiel(null);
    setAufgabeId(initialData?.id || null);
    // Eine Aufgabe, die schon Schritte hat, wird bearbeitet, nicht neu
    // begonnen — dann direkt in die Werkstatt.
    const hatSchritte = Array.isArray(initialData?.sequenz_schritte)
      && initialData.sequenz_schritte.length > 0;
    setAnsicht(hatSchritte ? 'werkstatt' : 'einstieg');
  }, [open, initialData, defaultThemenfeldId]);

  const schritt = folge.aktuellerSchritt;
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
  /** Die vorhandene Folge in der Form, in der der Ablauf-Assistent sie kennt. */
  const aktuelleFolgeAlsVorschlag = () => (folge.schritte.length
    ? schritteZuVorschlag(folge.schritte, katalogListe)
    : null);

  const ablaufVorschlagen = () => {
    const text = idee.trim();
    if (!text && materialien.length === 0) {
      toast.error('Erzählen Sie kurz, worum es gehen soll — oder legen Sie die Folge selbst an.');
      return;
    }
    // Gibt es schon Schritte, ist die Idee ein Änderungswunsch an DIESER
    // Folge — der Assistent soll nicht von vorn anfangen.
    const basis = aktuelleFolgeAlsVorschlag();
    struktur.setVorschlag(basis);
    struktur.senden(
      text || 'Ich habe nur Material, aber noch keine ausformulierte Idee. Schlag mir auf dieser Grundlage einen Ablauf vor.',
      { materialien, basis },
    );
    setAnsicht('struktur');
  };

  /** Aus der Werkstatt zurück in die Ablaufplanung — mit der aktuellen Folge. */
  const zurStruktur = () => {
    struktur.setVorschlag(aktuelleFolgeAlsVorschlag());
    setAnsicht('struktur');
  };

  /** Eine gesammelte Idee in den Einstieg holen — Text und Material. */
  const ideeUebernehmen = (gesammelt) => {
    const text = [gesammelt?.titel, gesammelt?.beschreibung].filter(Boolean).join('\n\n');
    setIdee((alt) => (alt.trim() ? `${alt.trim()}\n\n${text}` : text));
    const neueMaterialien = (gesammelt?.material_urls || [])
      .filter((m) => m?.url)
      .map((m) => ({
        type: /\.(png|jpe?g|gif|webp)$/i.test(m.url) ? 'image' : 'pdf',
        label: m.name || 'Material aus der Sammelbox',
        content: '',
        url: m.url,
      }));
    if (neueMaterialien.length) {
      setMaterialien((alt) => [
        ...alt,
        // Nichts doppelt ablegen, wenn dieselbe Idee zweimal geholt wird.
        ...neueMaterialien.filter((n) => !alt.some((a) => a.url === n.url)),
      ]);
    }
    toast.success('Idee übernommen.');
  };

  /**
   * Ergebnis des Ideengenerators. Primäres Ziel ist HIER das Ideenfeld —
   * eine fertige Aufgabe anzulegen wäre unsinnig, wir bauen ja gerade eine.
   * Das zweite Ziel (Sammelbox) bringt der Generator selbst mit.
   */
  const generierteIdeeUebernehmen = (idee2) => {
    const text = [
      idee2?.titel,
      idee2?.aufgabenstellung || idee2?.beschreibung,
      idee2?.didaktischer_hinweis ? `Hinweis: ${idee2.didaktischer_hinweis}` : '',
    ].filter(Boolean).join('\n\n');
    setIdee((alt) => (alt.trim() ? `${alt.trim()}\n\n${text}` : text));
    if (!titel.trim() && idee2?.titel) setTitel(idee2.titel);
    if (!missionType && idee2?.mission_type) setMissionType(idee2.mission_type);
    setGeneratorOffen(false);
  };

  /**
   * Ablauf übernehmen. Schritte, die der Assistent per id beibehalten hat,
   * behalten ihren Inhalt. Würden ausgearbeitete Schritte wegfallen, wird
   * ERST gewarnt — übernommen wird dann nur nach Bestätigung.
   */
  const ablaufAnwenden = ({ schritte, hinweise }) => {
    folge.folgeSetzen(schritte);
    hinweise.forEach((h) => toast.warning(h));
    toast.success(`Ablauf mit ${schritte.length} Schritten übernommen.`);
    setAblaufWarnung(null);
    setAnsicht('werkstatt');
  };

  const vorschlagUebernehmen = (vorschlag) => {
    const ergebnis = vorschlagMitBestandVerschmelzen(vorschlag, folge.schritte, katalogListe);
    if (ergebnis.verloren.length > 0) {
      setAblaufWarnung(ergebnis);
      return;
    }
    ablaufAnwenden(ergebnis);
  };

  /**
   * Ergebnis des Aufgaben-Assistenten: Format gewählt → Schritt anlegen oder
   * ersetzen. Danach öffnet sich gleich das Schritt-Fenster, denn genau dort
   * geht die Arbeit weiter (links Inhalte angeben, rechts Vorschau).
   */
  const formatWahlUebernehmen = (wahl, idee2) => {
    const neuerSchritt = schrittAusFormatWahl(wahl, idee2);
    if (assistentZiel >= 0) {
      folge.aendern(assistentZiel, neuerSchritt);
      folge.setSelectedIndex(assistentZiel);
    } else {
      folge.folgeSetzen([neuerSchritt], { anhaengen: true });
    }
    setAssistentZiel(null);
    setAnsicht('werkstatt');
    setSchrittFensterOffen(true);
  };

  // Einen im Gespräch gebauten Stand in den Schritt übernehmen.
  /**
   * Ergebnis aus dem Schritt-Fenster zurück in die Folge schreiben — UND
   * sofort sichern. Vorher lebte fertige Arbeit nur im Speicher: Wer sieben
   * Schritte gebaut hat und dann das Fenster neu lädt, verlor alles. Ein
   * bewusst übernommener Schritt ist Arbeit, die nicht mehr verschwinden darf.
   */
  const schrittUebernehmen = (neuerSchritt) => {
    if (folge.selectedIndex < 0) return;
    folge.aendern(folge.selectedIndex, neuerSchritt);
    setSchrittFensterOffen(false);
    const neueFolge = folge.schritte.map((s, i) => (i === folge.selectedIndex ? neuerSchritt : s));
    if (!isReleased) sichern.mutate(neueFolge);
  };

  /* ── Speichern ─────────────────────────────────────────────────────── */

  const gemeinsameFelder = (schritte) => ({
    themenfeld_id: themenfeldId || null,
    titel: titel || null,
    mission_type: missionType || null,
    schwierigkeitsgrad: schwierigkeit ?? null,
    aufgabenstellung: aufgabenstellung || null,
    materialien,
    sequenz_schritte: schritte,
  });

  /** Schreibt den übergebenen Stand in die Datenbank (anlegen oder ändern). */
  const schreiben = (schritte) => (aufgabeId
    ? updateAllgemeineAufgabe(aufgabeId, gemeinsameFelder(schritte))
    : createAllgemeineAufgabe({
      einheit_id: einheitId,
      anforderungsebene: defaultAnforderungsebene,
      aufgaben_typ: 'inhalt',
      aufgaben_modus: 'sequenz',
      ...gemeinsameFelder(schritte),
    }));

  /* Automatische Sicherung nach dem Übernehmen eines Schritts. Bewusst OHNE
     Schließen und ohne die Aufgabenliste neu zu laden — die Lehrkraft arbeitet
     weiter, das Fenster darf sich nicht unter ihr neu aufbauen. */
  const sichern = useMutation({
    mutationFn: (schritte) => schreiben(schritte),
    onSuccess: (result) => {
      if (!aufgabeId && result?.id) setAufgabeId(result.id);
      folge.alsGespeichertMarkieren();
      toast.success('Schritt übernommen und gespeichert.');
    },
    onError: (err) => toast.error(
      'Schritt konnte nicht gespeichert werden: ' + (err?.message || 'Unbekannter Fehler')
      + ' — bitte unten auf „Speichern" drücken.',
    ),
  });

  const speichern = useMutation({
    mutationFn: () => schreiben(folge.schritte),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allgemeineAufgaben'] });
      folge.alsGespeichertMarkieren();
      toast.success(aufgabeId ? 'Aufgabe gespeichert' : 'Aufgabe angelegt');
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
          <div className="flex flex-wrap items-center justify-between gap-2 mt-1.5">
            <p className="text-xs text-slate-500">
              {ansicht === 'einstieg' && 'Zuerst sammeln: Was haben Sie schon, und was soll passieren? Daraus entsteht der Ablauf.'}
              {ansicht === 'struktur' && 'Hier geht es nur um den Ablauf: Wie viele Schritte, in welcher Reihenfolge, welcher Art. Der Assistent ändert den Ablauf rechts nach Ihren Wünschen — Inhalte entstehen erst im nächsten Bereich.'}
              {ansicht === 'werkstatt' && 'Hier werden die einzelnen Aufgaben ausgearbeitet — links die Folge, rechts die Schüleransicht. Soll sich der Ablauf ändern, gehen Sie zurück zu „Ablauf planen“.'}
            </p>
            <WerkstattPhasenLeiste ansicht={ansicht} />
          </div>
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

            {/* Schwierigkeit steht offen im Kopf — im Akkordeon versteckt war
                sie für Sequenzen praktisch nicht zu finden. */}
            <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
              <span className="text-[11px] text-slate-500">Schwierigkeit</span>
              <SternRating value={schwierigkeit} onChange={setSchwierigkeit} disabled={isReleased} />
            </div>

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
            <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-4">
              {/* Übergeordnete Aufgabenstellung. Sie wird gespeichert und in
                  den Kurs exportiert (Einleitungstext über der Schrittfolge),
                  hatte seit dem Umbau auf die Werkstatt aber kein Eingabefeld
                  mehr — im Kurs stand dann der Platzhalter aus der Anlage
                  („Aufgabenstellung folgt"). */}
              <div className="space-y-1">
                <p className="text-[11px] text-slate-500">
                  Übergeordnete Aufgabenstellung — der Einleitungstext, den die Schüler über der
                  Schrittfolge lesen (optional).
                </p>
                <Textarea
                  value={aufgabenstellung}
                  onChange={(e) => setAufgabenstellung(e.target.value)}
                  placeholder="z. B. In dieser Aufgabe untersuchst du, wie Aufrufe zustande kommen und wofür sie eingesetzt werden."
                  rows={3}
                  disabled={isReleased}
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
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
            </div>
          )}
        </div>

        {ansicht === 'einstieg' ? (
          <div className="flex-1 min-h-0 overflow-y-auto pt-4">
            <WerkstattEinstieg
              einheitId={einheitId}
              onIdeeUebernehmen={ideeUebernehmen}
              onGeneratorOeffnen={() => setGeneratorOffen(true)}
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
        ) : ansicht === 'struktur' ? (
          /* Bereich 2: NUR der Ablauf — Gespräch links, Ablauf rechts. */
          <div className="flex-1 min-h-0 pt-4">
            <StrukturPhase
              struktur={struktur}
              hatSchritte={folge.schritte.length > 0}
              onUebernehmen={vorschlagUebernehmen}
              onZurueck={() => setAnsicht('werkstatt')}
              disabled={isReleased}
            />
          </div>
        ) : (
        /* Bereich 3: Aufgaben ausarbeiten. Links die Folge, rechts die
           Schülersicht. Der INHALT eines Schritts wird im SchrittFenster
           bearbeitet (Ebene 3). */
        <div className="grid grid-cols-1 gap-4 pt-4 flex-1 min-h-0 lg:grid-cols-[minmax(320px,400px)_1fr]">
          {/* Links: Schrittfolge */}
          <div className="flex flex-col min-h-0 gap-3">
            <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2 shrink-0">
                Ablauf der Aufgabe
              </p>
              <SchrittListe
                schritte={folge.schritte}
                selectedIndex={folge.selectedIndex}
                onSelect={folge.setSelectedIndex}
                onOpen={(i) => { folge.setSelectedIndex(i); setSchrittFensterOffen(true); }}
                onAdd={folge.hinzufuegen}
                onAufgabe={() => setAssistentZiel(-1)}
                onFormatWechsel={(i) => setAssistentZiel(i)}
                onDelete={folge.loeschen}
                onMoveUp={folge.nachOben}
                onMoveDown={folge.nachUnten}
              />
            </div>

            {/* Der Ablauf wird nicht hier geändert, sondern im eigenen
                Bereich — dieser Knopf führt dorthin. */}
            <Button
              variant="outline"
              className="shrink-0 gap-2 bg-white justify-start"
              onClick={zurStruktur}
              disabled={isReleased}
            >
              <ListOrdered className="w-4 h-4 text-violet-600" />
              Ablauf mit dem Assistenten ändern
            </Button>
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
              : ansicht === 'struktur'
              ? 'Ablauf planen — noch nichts übernommen'
              : (folge.schritte.length === 0
                ? 'Noch keine Schritte'
                : `${folge.schritte.length} Schritte${unfertige > 0 ? `, ${unfertige} noch unvollständig` : ''}`)}
            {sichern.isPending
              ? ' · wird gesichert…'
              : (folge.dirty ? ' · nicht gespeichert' : (aufgabeId ? ' · gespeichert' : ''))}
          </p>
          <div className="ml-auto flex items-center gap-2">
            {/* Zurück zum Einstieg — Material und Idee bleiben erreichbar,
                ohne dauerhaft Platz zu belegen. */}
            {ansicht !== 'einstieg' && (
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

      {/* Warnung: Der neue Ablauf würde ausgearbeitete Schritte wegwerfen. */}
      <AblaufUebernehmenWarnung
        open={!!ablaufWarnung}
        verloren={ablaufWarnung?.verloren || []}
        onBestaetigen={() => ablaufAnwenden(ablaufWarnung)}
        onAbbrechen={() => setAblaufWarnung(null)}
      />

      {/* Ideengenerator — liegt über der Werkstatt. Kann nie gleichzeitig
          mit dem Schritt-Fenster offen sein: der eine gehört zum Einstieg,
          das andere zur Werkstatt-Ansicht. */}
      <ThemenfeldIdeenModal
        open={generatorOffen}
        onOpenChange={setGeneratorOffen}
        einheitId={einheitId}
        themenfelder={themenfelder}
        defaultThemenfeldId={themenfeldId}
        anforderungsebene={defaultAnforderungsebene}
        onSaveIdea={generierteIdeeUebernehmen}
        primaerLabel="In dieses Feld übernehmen"
        primaerLabelFertig="Übernommen"
        primaerErfolg="Idee ins Feld übernommen."
      />

      {/* Aufgaben-Assistent: Material & Idee → passendes Format → Schritt. */}
      <AufgabeAssistentDialog
        open={assistentZiel !== null}
        onOpenChange={(o) => { if (!o) setAssistentZiel(null); }}
        materialien={materialien}
        onMaterialienChange={setMaterialien}
        startIdee={assistentZiel >= 0 ? (folge.schritte[assistentZiel]?.plan?.kurzbeschreibung || '') : ''}
        disabled={isReleased}
        onWahl={formatWahlUebernehmen}
      />

      {/* Ebene 3 — liegt über diesem Dialog (siehe zIndex in SchrittFenster). */}
      <SchrittFenster
        open={schrittFensterOffen && !!schritt}
        schritt={schritt}
        nummer={folge.selectedIndex + 1}
        aufgabeId={aufgabeId}
        aufgabenstellung={aufgabenstellung}
        aufgabe={initialData}
        einheit={einheit}
        kontext={generatorKontext}
        isReleased={isReleased}
        onUebernehmen={schrittUebernehmen}
        onAbbrechen={() => setSchrittFensterOffen(false)}
      />
    </Dialog>
  );
}