import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Menu } from 'lucide-react';
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

/**
 * Lerntyp-Dashboard der Einheit (Schüleransicht). Burger-Navigation als
 * Overlay, paginierte Einzel-Aktivitätsansicht. Einstiegspunkt ist die
 * Einheit-Startseite (kein Auto-Resume) – der Schüler steuert selbst.
 */
export default function EinheitDashboard() {
  const urlParams = new URLSearchParams(window.location.search);
  const einheitId = urlParams.get('id');
  const lerntypKey = urlParams.get('lerntyp');
  const lerntyp = getLerntyp(lerntypKey);

  const {
    einheit,
    isLoading,
    sektoren,
    bausteinById,
    aufgabenById,
    fortschrittByInstance,
    markErledigt,
  } = useSchuelerPfad(einheitId, lerntypKey);

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeInstanceId, setActiveInstanceId] = useState(null); // null = Startseite
  const [busy, setBusy] = useState(false);

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

  const activeItem = activeInstanceId ? itemByInstance.get(activeInstanceId) : null;
  const activeMeta = activeItem?.meta || null;

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

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Lädt …</div>;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top-Bar mit Burger */}
      <header className="flex items-center gap-3 px-3 sm:px-4 h-14 border-b border-border bg-card shrink-0">
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 rounded-md hover:bg-muted text-foreground"
          aria-label="Lernpfad-Menü öffnen"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveInstanceId(null)}
          className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors"
        >
          {einheit?.titel_der_einheit || 'Einheit'}
        </button>
        <Link
          to={`/lernen/einheit?id=${einheitId}`}
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Verlassen
        </Link>
      </header>

      <main className="flex-1 min-h-0 overflow-hidden">
        {activeItem ? (
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
        einheitTitel={einheit?.titel_der_einheit}
        sektoren={sektoren}
        fortschrittByInstance={fortschrittByInstance}
        bausteinById={bausteinById}
        aufgabenById={aufgabenById}
        activeInstanceId={activeInstanceId}
        onSelectItem={setActiveInstanceId}
      />
    </div>
  );
}