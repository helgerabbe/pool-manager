import { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Menu, ArrowLeft } from 'lucide-react';
import { getLerntyp } from '@/lib/lerntypen';
import { useSchuelerPfad } from '@/hooks/useSchuelerPfad';
import {
  annotateSektorForSchueler,
  deriveSektorFreischaltung,
  ITEM_GATE,
} from '@/lib/schuelerPfadGating';
import { buildSichtbarePfadItems } from '@/lib/schuelerPfadView';
import PfadNavigation from '@/components/schueler/pfad/PfadNavigation';
import AktivitaetSeite from '@/components/schueler/pfad/AktivitaetSeite';
import PfadStartseite from '@/components/schueler/pfad/PfadStartseite';
import LernpaketDurcharbeiten from '@/components/schueler/pfad/LernpaketDurcharbeiten';
import ThemenfeldEinfuehrungSeite from '@/components/schueler/pfad/ThemenfeldEinfuehrungSeite';
import LernlandkarteSeite from '@/components/schueler/pfad/LernlandkarteSeite';
import LadeFehlerHinweis from '@/components/schueler/LadeFehlerHinweis';
import MerkheftDialog from '@/components/schueler/MerkheftDialog';
import { useEinheitZeitTracker } from '@/hooks/useEinheitZeitTracker';
import { useEinheitAbschluss } from '@/hooks/useEinheitAbschluss';

/**
 * Lerntyp-Dashboard der Einheit (Schüleransicht). Burger-Navigation als
 * Overlay, paginierte Einzel-Aktivitätsansicht. Einstiegspunkt ist die
 * Einheit-Startseite (kein Auto-Resume) – der Schüler steuert selbst.
 */
export default function EinheitDashboard() {
  // useSearchParams statt window.location: reagiert zuverlässig auf
  // Client-Navigation und liefert die Parameter auch nach Re-Renders korrekt.
  const [searchParams] = useSearchParams();
  const einheitId = searchParams.get('id');
  const lerntypKey = searchParams.get('lerntyp');
  const lerntyp = getLerntyp(lerntypKey);

  const {
    user,
    einheit,
    isLoading,
    isError,
    fehlerDetails,
    retry,
    sektoren,
    bausteinById,
    aufgabenById,
    katalogById,
    fortschrittByInstance,
    fortschrittByCompositeId,
    markErledigt,
    loadLernpaketAktivitaeten,
  } = useSchuelerPfad(einheitId, lerntypKey);

  const [menuOpen, setMenuOpen] = useState(false);
  const [merkheftOpen, setMerkheftOpen] = useState(false);
  const [activeInstanceId, setActiveInstanceId] = useState(null); // null = Startseite
  const [busy, setBusy] = useState(false);

  // Lernzeit minütlich mitloggen, solange der Schüler in der Einheit arbeitet.
  useEinheitZeitTracker(einheitId, user?.email);

  // Flache Liste aller SICHTBAREN Items (Bündel-Container ausgeschlossen, deren
  // Kinder enthalten) in Pfad-Reihenfolge, angereichert mit Gate-Status +
  // Sektor-Bezug + Meta. Basis für Navigation + „Weiter".
  const flatItems = useMemo(() => {
    const sektorFrei = deriveSektorFreischaltung(sektoren, fortschrittByInstance);
    const list = [];
    for (const sektor of sektoren) {
      const frei = sektorFrei.get(sektor.sektor_id);
      const annotated = annotateSektorForSchueler(sektor, fortschrittByInstance, bausteinById);
      const sichtbar = buildSichtbarePfadItems(
        sektor,
        annotated,
        aufgabenById,
        bausteinById,
        !!frei?.freigeschaltet,
        frei?.voraussetzungTitel
      );
      for (const item of sichtbar) {
        list.push({ ...item, sektor, sektorFreigeschaltet: !!frei?.freigeschaltet });
      }
    }
    return list;
  }, [sektoren, fortschrittByInstance, bausteinById, aufgabenById]);

  const itemByInstance = useMemo(() => {
    const map = new Map();
    flatItems.forEach((it) => map.set(it.instance_id, it));
    return map;
  }, [flatItems]);

  const gesamtAnzahl = flatItems.length;
  const erledigtAnzahl = flatItems.filter((it) => it.gate === ITEM_GATE.ERLEDIGT).length;

  // Einheit-Abschluss-Flag setzen, sobald alles erledigt ist.
  useEinheitAbschluss({
    einheitId,
    lerntyp: lerntypKey,
    userEmail: user?.email,
    erledigtAnzahl,
    gesamtAnzahl,
  });

  const activeItem = activeInstanceId ? itemByInstance.get(activeInstanceId) : null;
  const activeMeta = activeItem?.meta || null;

  // Ist das aktive Item ein Lernpaket? Dann zeigen wir die Aktivitäten-Sub-Ansicht.
  const activeAufgabe = activeItem ? aufgabenById.get(activeItem.ref_id) : null;
  const istLernpaket = activeItem?.type === 'aufgabe' && activeAufgabe?._isLernpaket === true;

  // Ist das aktive Item die „Einführung in das Themenfeld"? Eigene KI-Snapshot-Ansicht.
  const istEinfuehrung = activeItem?.type === 'system' && activeItem?.ref_id === 'sys_themenfeld_intro';

  // Ist das aktive Item die Lernlandkarte? Interaktive Lernziel-Übersicht.
  const istLernlandkarte = activeItem?.type === 'system' && activeItem?.ref_id === 'sys_map_full';

  // „Weiter“: nächstes nicht-gesperrtes Item nach dem aktuellen.
  const goWeiter = () => {
    if (!activeItem) return;
    const idx = flatItems.findIndex((it) => it.instance_id === activeItem.instance_id);
    const next = flatItems.slice(idx + 1).find(
      (it) => it.sektorFreigeschaltet && it.gate !== ITEM_GATE.GESPERRT
    );
    if (next) setActiveInstanceId(next.instance_id);
    else { setActiveInstanceId(null); setMenuOpen(true); }
  };

  const handleErledigt = async () => {
    if (!activeItem) return;
    setBusy(true);
    try {
      await markErledigt(activeItem, activeItem.sektor);
      goWeiter();
    } finally {
      setBusy(false);
    }
  };

  // Eine einzelne Lernpaket-Aktivität als erledigt markieren. Der Fortschritt
  // wird unter einer zusammengesetzten instance_id `<lernpaketInstanceId>::<aktivitaetId>`
  // geführt, getrennt vom Erledigt-Status des Lernpakets selbst.
  const handleAktivitaetErledigt = async (compositeId, akt) => {
    if (!activeItem) return;
    await markErledigt(
      { instance_id: compositeId, type: 'system', ref_id: akt.aktivitaet_id },
      activeItem.sektor
    );
  };

  // Eine einzelne MasterAufgabe (innerhalb einer masterfähigen Aktivität) als
  // erledigt markieren. Der Wrapper liefert bereits den vollständigen
  // Composite-Key `<lernpaketInstanceId>::<aktivitaetId>::<masterId>` – genau
  // unter diesem Key liest die Erledigt-Prüfung später wieder.
  const handleMasterErledigt = async (compositeId, { itemType, refId }) => {
    if (!activeItem) return;
    await markErledigt(
      { instance_id: compositeId, type: itemType || 'aufgabe', ref_id: refId || null },
      activeItem.sektor
    );
  };

  // Ohne Einheit-ID (z. B. Seite direkt aufgerufen): kein Verbindungsfehler,
  // sondern klare Weiterleitung zur Fächer-Übersicht.
  if (!einheitId || !lerntypKey) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center space-y-4 rounded-2xl border border-border bg-card px-6 py-8 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Keine Einheit ausgewählt</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Diese Seite braucht eine Einheit. Wähle zuerst ein Fach und eine Einheit aus.
          </p>
          <Link
            to="/lernen"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="w-4 h-4" /> Zur Lern-Übersicht
          </Link>
        </div>
      </div>
    );
  }

  // Sicherheitsstufe: UI erst rendern, wenn ALLE Daten sauber geladen wurden.
  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Lädt …</div>;
  }
  if (isError || !einheit) {
    return <LadeFehlerHinweis onRetry={retry} details={fehlerDetails} />;
  }

  return (
    <div className="h-full flex flex-col bg-background relative">
      {/* Schwebendes Burger-Symbol oben links */}
      <button
        onClick={() => setMenuOpen(true)}
        className="fixed top-3 left-3 z-30 p-2.5 rounded-full bg-card border border-border shadow-md hover:bg-muted text-foreground"
        aria-label="Lernpfad-Menü öffnen"
      >
        <Menu className="w-5 h-5" />
      </button>

      <main className="flex-1 min-h-0 overflow-hidden">
        {activeItem && istLernpaket ? (
          <LernpaketDurcharbeiten
            item={activeItem}
            meta={activeMeta}
            lernpaketLogik={activeAufgabe?.lernpaket_logik || 'standard'}
            lerntyp={lerntypKey}
            loadLernpaketAktivitaeten={loadLernpaketAktivitaeten}
            katalogById={katalogById}
            fortschrittByCompositeId={fortschrittByCompositeId}
            onMarkErledigt={handleAktivitaetErledigt}
            onMarkMaster={handleMasterErledigt}
            onMarkLernpaketErledigt={() => markErledigt(activeItem, activeItem.sektor)}
            istLernpaketErledigt={activeItem?.gate === ITEM_GATE.ERLEDIGT}
            onBack={() => setActiveInstanceId(null)}
          />
        ) : activeItem && istLernlandkarte ? (
          <LernlandkarteSeite
            einheitId={einheitId}
            userEmail={user?.email}
            flatItems={flatItems}
            aufgabenById={aufgabenById}
            erledigt={activeItem.gate === ITEM_GATE.ERLEDIGT}
            busy={busy}
            onErledigt={handleErledigt}
            onOpenLernpaket={setActiveInstanceId}
          />
        ) : activeItem && istEinfuehrung ? (
          <ThemenfeldEinfuehrungSeite
            einheitId={einheitId}
            lerntyp={lerntypKey}
            item={activeItem}
            sektor={activeItem.sektor}
            meta={activeMeta}
            erledigt={activeItem.gate === ITEM_GATE.ERLEDIGT}
            busy={busy}
            onErledigt={handleErledigt}
          />
        ) : activeItem ? (
          <AktivitaetSeite
            item={activeItem}
            meta={activeMeta}
            busy={busy}
            onErledigt={handleErledigt}
            onWeiter={goWeiter}
          />
        ) : (
          <PfadStartseite
            einheit={einheit}
            lerntyp={lerntyp}
            erledigtAnzahl={erledigtAnzahl}
            gesamtAnzahl={gesamtAnzahl}
            onOpenMenu={() => setMenuOpen(true)}
          />
        )}
      </main>

      <PfadNavigation
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        einheitId={einheitId}
        einheitTitel={einheit?.titel_der_einheit}
        sektoren={sektoren}
        fortschrittByInstance={fortschrittByInstance}
        bausteinById={bausteinById}
        aufgabenById={aufgabenById}
        activeInstanceId={activeInstanceId}
        onSelectItem={setActiveInstanceId}
        onOpenMerkheft={() => setMerkheftOpen(true)}
      />

      <MerkheftDialog
        open={merkheftOpen}
        onOpenChange={setMerkheftOpen}
        einheitId={einheitId}
        einheitTitel={einheit?.titel_der_einheit}
        userEmail={user?.email}
      />
    </div>
  );
}