/**
 * exportFilters.js
 *
 * Reine Filter-Helper für den Moodle-Export.
 * Bestimmen anhand von freigabe_status / status + Sync-/Update-Daten,
 * welche Einheiten bzw. Basismodule überhaupt exportierbar sind.
 *
 * Kein React, keine Seiteneffekte – Single Source of Truth für die
 * Sichtbarkeitsregeln im ExportManager und für die Unit-Tests.
 */

function isOutdatedAgainstSync(item) {
  const hasSync = item.last_synced_at !== null && item.last_synced_at !== undefined;
  return !hasSync || new Date(item.last_synced_at) < new Date(item.updated_date);
}

export function filterExportableEinheiten(einheiten = []) {
  return einheiten.filter(
    (e) => e.freigabe_status === 'Freigegeben für Moodle' && isOutdatedAgainstSync(e)
  );
}

export function filterExportableBasismodule(basismodule = []) {
  return basismodule.filter(
    (b) => b.status === 'Bereit für Moodle' && isOutdatedAgainstSync(b)
  );
}