/**
 * EinheitStatusTabelle.jsx
 *
 * Tabellarische „Auf-einen-Blick"-Übersicht im Freigabe-Cockpit (Tab 9).
 * Jedes Element der Einheit erscheint als schlanke Zeile mit:
 *   - Name
 *   - Lebenszyklus-Badge (Moodle-Sync-Status)
 *   - Freigabe-Badge (Entwurf / Freigegeben), wo sinnvoll
 *
 * Gegliedert in klar getrennte Sektionen, in dieser Reihenfolge:
 *   1. Strukturboard (Struktur der Einheit)
 *   2. Allgemeine Informationen der Einheit
 *   3. Lernpakete
 *   4. Allgemeine Aufgaben (Ebene 1/2)
 *   5. Projekt- & Anwendungsaufgaben (Ebene 3)
 *   6. Dashboards (pro Lerntyp)
 *
 * Rein anzeigend. Klick auf eine Aufgabe/Aktivität navigiert in den
 * jeweiligen Arbeitsbereich (über die durchgereichten Callbacks).
 */

import React from 'react';
import { Layers, ListChecks, Target, LayoutDashboard, Settings2 } from 'lucide-react';
import CockpitSyncBadge, { CockpitFreigabeBadge } from '@/components/export/CockpitSyncBadge';
import { useLernpfadDriftReport } from '@/hooks/useLernpfadDriftReport';

const LERNTYP_LABELS = {
  minimalist: 'Minimalist',
  pragmatiker: 'Pragmatiker',
  ehrgeizig: 'Ehrgeizig',
  passioniert: 'Passioniert',
};

// ── Sektion-Wrapper ──────────────────────────────────────────────────────────
function Section({ icon: Icon, title, count, children }) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/40 border-b border-border">
        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
        <h3 className="text-sm font-semibold flex-1">{title}</h3>
        {count != null && (
          <span className="text-[11px] text-muted-foreground bg-background px-2 py-0.5 rounded-full border">{count}</span>
        )}
      </div>
      <div className="divide-y divide-border/60">{children}</div>
    </div>
  );
}

// ── Einzelne Zeile ───────────────────────────────────────────────────────────
function Row({ label, sublabel, syncStatus, contentStatus, onClick }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-4 py-2 text-left ${onClick ? 'hover:bg-muted/30 transition-colors' : ''}`}
    >
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${onClick ? 'text-primary' : 'text-foreground'}`}>{label}</p>
        {sublabel && <p className="text-[11px] text-muted-foreground truncate">{sublabel}</p>}
      </div>
      {contentStatus !== undefined && <CockpitFreigabeBadge contentStatus={contentStatus} />}
      <CockpitSyncBadge syncStatus={syncStatus} />
    </Comp>
  );
}

function EmptyRow({ text }) {
  return <div className="px-4 py-2 text-[11px] text-muted-foreground/60 italic">{text}</div>;
}

export default function EinheitStatusTabelle({
  einheit,
  lernpakete,
  themenfelder,
  allgemeineAufgaben,
  aktivitaeten,
  aktivitaetenKatalog,
  onNavigateToActivity,
  onNavigateToTask,
}) {
  const unitId = einheit?.id;

  const tfById = React.useMemo(() => {
    const m = {};
    themenfelder.forEach(tf => { m[tf.id] = tf; });
    return m;
  }, [themenfelder]);

  // Lernpakete dieser Einheit, sortiert nach Themenfeld-Reihenfolge
  const pakete = lernpakete
    .filter(lp => lp.einheit_id === unitId && lp.sync_status !== 'to_delete')
    .sort((a, b) => {
      const tfA = tfById[a.themenfeld_id]?.reihenfolge ?? 999;
      const tfB = tfById[b.themenfeld_id]?.reihenfolge ?? 999;
      if (tfA !== tfB) return tfA - tfB;
      return (a.reihenfolge_nummer || 0) - (b.reihenfolge_nummer || 0);
    });

  const ebene12 = allgemeineAufgaben.filter(
    a => a.einheit_id === unitId && a.anforderungsebene !== '3 - Projekt' && a.sync_status !== 'to_delete'
  );
  const ebene3 = allgemeineAufgaben.filter(
    a => a.einheit_id === unitId && a.anforderungsebene === '3 - Projekt' && a.sync_status !== 'to_delete'
  );

  // Dashboard-Drift pro Lerntyp aggregieren
  const { getStatus } = useLernpfadDriftReport(unitId);
  const konfiguration = einheit?.lernpfade_konfiguration || {};

  const dashboardRows = Object.keys(LERNTYP_LABELS).map(lt => {
    const sektoren = Array.isArray(konfiguration[lt]) ? konfiguration[lt] : [];
    let drifted = 0;
    sektoren.forEach(s => { if (getStatus(lt, s.sektor_id) === 'drifted') drifted += 1; });
    // Lebenszyklus-Status ableiten: keine Sektoren = new, Drift = modified, sonst synced
    let sync = 'new';
    if (sektoren.length > 0) sync = drifted > 0 ? 'modified' : 'synced';
    const sublabel = sektoren.length === 0
      ? 'Noch keine Sektoren'
      : drifted > 0
        ? `${drifted} von ${sektoren.length} Sektoren geändert seit Freigabe`
        : `${sektoren.length} Sektoren – unverändert`;
    return { lt, sync, sublabel };
  });

  return (
    <div className="space-y-3">
      {/* 1 + 2: Struktur & allgemeine Einheits-Informationen */}
      <Section icon={Settings2} title="Einheit – Grundzustand">
        <Row
          label="Strukturboard (Themenfelder & Lernpakete)"
          sublabel="Lebenszyklus der Struktur dieser Einheit"
          syncStatus={einheit?.sync_status || 'new'}
        />
        <Row
          label="Allgemeine Informationen der Einheit"
          sublabel="Titel, Gesamtziele & Metadaten"
          syncStatus={einheit?.sync_status || 'new'}
        />
      </Section>

      {/* 3: Lernpakete */}
      <Section icon={Layers} title="Lernpakete" count={pakete.length}>
        {pakete.length === 0 ? (
          <EmptyRow text="Keine Lernpakete vorhanden." />
        ) : (
          pakete.map(p => (
            <Row
              key={p.id}
              label={p.titel_des_pakets || 'Lernpaket'}
              sublabel={tfById[p.themenfeld_id]?.titel || 'Nicht zugeordnet'}
              syncStatus={p.sync_status || 'new'}
              contentStatus={p.content_status}
            />
          ))
        )}
      </Section>

      {/* 4: Allgemeine Aufgaben */}
      <Section icon={ListChecks} title="Allgemeine Aufgaben (Ebene 1/2)" count={ebene12.length}>
        {ebene12.length === 0 ? (
          <EmptyRow text="Keine allgemeinen Aufgaben vorhanden." />
        ) : (
          ebene12.map(a => (
            <Row
              key={a.id}
              label={a.titel || 'Aufgabe ohne Titel'}
              sublabel={a.anforderungsebene}
              syncStatus={a.sync_status || 'new'}
              contentStatus={a.content_status}
              onClick={() => onNavigateToTask?.('ebene12', a.id)}
            />
          ))
        )}
      </Section>

      {/* 5: Projekt- & Anwendungsaufgaben */}
      <Section icon={Target} title="Projekt- & Anwendungsaufgaben (Ebene 3)" count={ebene3.length}>
        {ebene3.length === 0 ? (
          <EmptyRow text="Keine Projektaufgaben vorhanden." />
        ) : (
          ebene3.map(a => (
            <Row
              key={a.id}
              label={a.titel || 'Projektaufgabe ohne Titel'}
              sublabel={a.aufgabentyp_projekt}
              syncStatus={a.sync_status || 'new'}
              contentStatus={a.content_status}
              onClick={() => onNavigateToTask?.('ebene3', a.id)}
            />
          ))
        )}
      </Section>

      {/* 6: Dashboards */}
      <Section icon={LayoutDashboard} title="Dashboards (Lernpfade)" count={dashboardRows.length}>
        {dashboardRows.map(({ lt, sync, sublabel }) => (
          <Row
            key={lt}
            label={`Dashboard – ${LERNTYP_LABELS[lt]}`}
            sublabel={sublabel}
            syncStatus={sync}
          />
        ))}
      </Section>
    </div>
  );
}