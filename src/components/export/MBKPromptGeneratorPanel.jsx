/**
 * MBKPromptGeneratorPanel.jsx
 *
 * Schlanker Wrapper um den Air-Gap-Tabs-Workflow. Die alte Markdown-
 * Prompt-Welt wurde entfernt — alle Inhalte (Nukleus, Persona,
 * Sektoren-Struktur, Sektor-Anweisungen, Erstellungspakete) sind in
 * den Air-Gap-Payloads vollständig abgedeckt:
 *
 *   - Nukleus + Persona       → Tab 3 Globale KI + Tab 1 Struktur
 *   - Sektoren-Struktur       → Tab 1 Struktur (Lernpfade pro Lerntyp)
 *   - Sektor-Anweisungen      → Tab 0 Meta-System-Prompt
 *   - Erstellungspakete       → Tab 2 Aufgaben + Tab 5 KI-Aufgaben
 *
 * Diese Komponente macht nur noch das RBAC-Gate; die eigentliche UI
 * lebt in `components/exportcenter/v2/MBKAirGapTabsPanel.jsx`.
 */
import React from 'react';
import { useRBAC } from '@/hooks/useRBAC';
import MBKAirGapTabsPanel from '@/components/exportcenter/v2/MBKAirGapTabsPanel';

export default function MBKPromptGeneratorPanel({ einheitId }) {
  const { permissions } = useRBAC();

  // Betrachter-Rollen sehen das Panel gar nicht erst — Schreibrechte
  // werden serverseitig durch die ExportPrompts-RLS erzwungen.
  if (!permissions.kannExportLesen) return null;

  return <MBKAirGapTabsPanel einheitId={einheitId} />;
}