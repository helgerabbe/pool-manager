/**
 * HasPermission — Higher-Order-Component für rollenbasierte UI-Sperren
 *
 * Verwendung:
 *   <HasPermission permission="kannExportieren">
 *     <ExportButton />
 *   </HasPermission>
 *
 *   // Mit Fach-Kontext (für fachgebundene Berechtigungen):
 *   <HasPermission permission="kannStrukturBearbeiten" fach={einheit.fach}>
 *     <DeleteThemenfeldButton />
 *   </HasPermission>
 *
 *   // Statt ausblenden: deaktivieren (zeigt grayed-out Button):
 *   <HasPermission permission="kannExportieren" mode="disable">
 *     <ExportButton />
 *   </HasPermission>
 */

import React from 'react';
import { useRBAC } from '@/hooks/useRBAC';

/**
 * @param {string}  permission  — Key aus dem permissions-Objekt (z.B. 'kannExportieren')
 * @param {string}  [fach]      — Fach-Kontext für fachgebundene Permissions
 * @param {'hide'|'disable'} [mode='hide'] — 'hide' blendet aus, 'disable' macht grau
 * @param {React.ReactNode} [fallback]     — Optionaler Ersatz-Inhalt wenn keine Berechtigung
 */
export default function HasPermission({ permission, fach, mode = 'hide', fallback = null, children }) {
  const { permissions } = useRBAC();

  const perm = permissions[permission];
  // Fach-kontextabhängige Permissions sind Funktionen
  const hasAccess = typeof perm === 'function' ? perm(fach) : !!perm;

  if (hasAccess) return children;

  if (mode === 'disable') {
    return (
      <span className="pointer-events-none opacity-40 cursor-not-allowed" title="Keine Berechtigung">
        {children}
      </span>
    );
  }

  return fallback;
}