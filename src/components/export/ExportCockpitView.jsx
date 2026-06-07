/**
 * ExportCockpitView.jsx
 *
 * Freigabe-Cockpit als Statusübersicht (Tab 8 im Workspace).
 *
 * Phase F.1 — Redesign:
 *   - KEIN Einheiten-Selector mehr: das Cockpit bezieht sich immer auf die
 *     aktuell geöffnete Einheit (Prop `einheitId`, vom Workspace gesetzt).
 *   - Neue Header-Karte (`ExportLifecycleHeaderCard`) mit prominentem
 *     Lifecycle-Status und „Freigabe aufheben"-Button für Admin/Fachschaft.
 *   - Workflow-Hilfe wandert in einen aufklappbaren <details>-Block am Ende
 *     der Seite — sie bleibt auffindbar, blockiert aber nicht mehr den Blick
 *     auf die Inhalte.
 *   - Die vier Lerntyp-Karten + aggregierte Drift-Anzeige bleiben erhalten;
 *     die Themenfeld-Hierarchie dient nur noch als Statusübersicht.
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';
import { ShieldCheck, Info } from 'lucide-react';
import HelpBadge from '@/components/ui/HelpBadge';
import EinheitStatusTabelle from '@/components/export/EinheitStatusTabelle';
import EinheitFinalReleaseControl from '@/components/export/EinheitFinalReleaseControl';

// ── Main Component ──────────────────────────────────────────────────

export default function ExportCockpitView({
  // Phase F.1: Tab 8 ist immer im Kontext einer Einheit. Der Workspace
  // reicht `einheitId` durch — kein interner Selector mehr. `initialEinheitId`
  // bleibt als Alias akzeptiert, falls Alt-Aufrufer (z. B. Standalone-Routen)
  // es noch setzen.
  einheitId = null,
  initialEinheitId = null,
  onNavigateToActivity: onNavCallback = null,
  onNavigateToTask = null,
  // Phase F.2: Tab-8 → Tab-7-Deep-Link. Wird vom Workspace bereitgestellt
  // (setzt URL-Params + ruft handleTabChange('dashboards') auf).
  onOpenDashboardArchitekt = null,
}) {
  const { permissions, rolle, faecher } = useRBAC();
  const navigate = useNavigate();
  const selectedUnitId = einheitId || initialEinheitId || null;

  const onNavigateToActivity = (activityId, paketId) => {
    if (onNavCallback) {
      onNavCallback(activityId, paketId);
    } else {
      navigate(`/workspace?einheit=${selectedUnitId}&aufgaben=true&activity=${activityId}`);
    }
  };

  // Aktuell geöffnete Einheit (für Titel im Header und Fach-Check beim
  // Aufheben-Recht). Nur eine Einheit, kein Listen-Fetch mehr nötig.
  const { data: einheit, isLoading: einheitLoading } = useQuery({
    queryKey: ['einheit', selectedUnitId],
    queryFn: () => base44.entities.Einheiten.get(selectedUnitId),
    enabled: !!selectedUnitId,
  });

  const { data: lernpakete = [], isLoading: lernpaketeLoading } = useQuery({ queryKey: ['lernpakete'], queryFn: () => base44.entities.Lernpakete.list() });
  const { data: themenfelder = [], isLoading: themenfelderLoading } = useQuery({ queryKey: ['themenfelder'], queryFn: () => base44.entities.Themenfeld.list() });
  const { data: aktivitaeten = [], isLoading: aktivitaetenLoading } = useQuery({ queryKey: ['lernpaketPhaseAktivitaeten'], queryFn: () => base44.entities.LernpaketPhaseAktivitaet.list() });
  const { data: aktivitaetenKatalog = [], isLoading: katalogLoading } = useQuery({ queryKey: ['aktivitaetenKatalog'], queryFn: () => base44.entities.AktivitaetenKatalog.list() });
  const { data: allgemeineAufgaben = [], isLoading: allgemeineLoading } = useQuery({ queryKey: ['allgemeineAufgaben'], queryFn: () => base44.entities.AllgemeineAufgabe.list() });
  const { data: masterAufgaben = [], isLoading: masterLoading } = useQuery({ queryKey: ['masterAufgaben'], queryFn: () => base44.entities.MasterAufgabe.list() });

  const isInitialLoading = einheitLoading || lernpaketeLoading || themenfelderLoading || aktivitaetenLoading || katalogLoading || allgemeineLoading || masterLoading;

  // RBAC-Ableitung für die „Freigabe aufheben"-Aktion. Server prüft das
  // ohnehin nochmal hart — hier nur fürs UI.
  const istAdmin = rolle === ROLLEN.ADMIN;
  const istFachschaftFuerFach =
    rolle === ROLLEN.FACHSCHAFT &&
    Array.isArray(faecher) &&
    einheit?.fach &&
    faecher.includes(einheit.fach);
  const darfFreigeben = istAdmin || istFachschaftFuerFach;

  if (!permissions.kannExportBedienen) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <ShieldCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Kein Zugriff. Nur Moodle-Designer dürfen den Export bedienen.</p>
        </div>
      </div>
    );
  }

  // Tab 8 wird ausschließlich im Workspace-Kontext geöffnet — ohne Einheit
  // ist die Seite sinnlos. Statt eines Selectors zeigen wir einen klaren
  // Hinweis, falls die ID einmal fehlt.
  if (!selectedUnitId) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <Info className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Keine Einheit ausgewählt. Bitte öffne das Cockpit aus dem Workspace einer Einheit.
          </p>
        </div>
      </div>
    );
  }

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-muted border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground font-medium">Cockpit-Daten werden geladen, bitte einen Moment Geduld...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Seitentitel — kompakter als zuvor, weil der eigentliche Status
          jetzt prominent in der Header-Karte sitzt. */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          Freigabe-Cockpit
          <HelpBadge
            text="Übersicht über den Status der Einheit, Dashboards und Inhalte. Freigaben erfolgen direkt an den jeweiligen Inhalten und in den Dashboards."
            docsSlug="export-workflow"
          />
        </h2>
      </div>

      {/* Finale Einheits-Freigabe: hier im Cockpit beheimatet, weil hier der
          Gesamtstatus der Einheit sichtbar ist und die Freigabe-Entscheidung
          getroffen wird. */}
      <EinheitFinalReleaseControl einheitId={selectedUnitId} darfFreigeben={darfFreigeben} />

      {/* Auf-einen-Blick-Tabelle: jeder Bestandteil der Einheit mit
          Lebenszyklus + Freigabestatus, inkl. Strukturboard, allgemeinen
          Einheits-Infos und Dashboards. */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-semibold">Status aller Elemente auf einen Blick</h3>
        <p className="text-xs text-muted-foreground">
          Lebenszyklus (Moodle-Sync) und Freigabestatus pro Element – inkl. Strukturboard, Einheits-Infos und Dashboards.
        </p>
      </div>
      <EinheitStatusTabelle
        einheit={einheit}
        lernpakete={lernpakete}
        themenfelder={themenfelder}
        allgemeineAufgaben={allgemeineAufgaben}
        aktivitaeten={aktivitaeten.filter(a => a.sync_status !== 'to_delete')}
        aktivitaetenKatalog={aktivitaetenKatalog}
        onNavigateToActivity={onNavigateToActivity}
        onNavigateToTask={onNavigateToTask}
      />
    </div>
  );
}