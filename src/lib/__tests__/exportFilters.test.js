/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * exportFilters.test.js
 *
 * Sprint H – Refactor-Schutz für die Filter-Helper, die bestimmen,
 * welche Einheiten/Basismodule im Moodle-Export-Manager überhaupt
 * angeboten werden. Bricht hier etwas, "verschwinden" Items lautlos
 * aus der UI – darum sind diese Helper das wichtigste Sicherheitsnetz
 * des Refactorings.
 */

import {
  filterExportableEinheiten,
  filterExportableBasismodule,
} from '@/lib/exportFilters';

const FUTURE = '2099-01-01T00:00:00Z';
const PAST = '2020-01-01T00:00:00Z';

describe('filterExportableEinheiten', () => {
  it('filtert nicht freigegebene Einheiten heraus', () => {
    const list = [
      { id: 'a', freigabe_status: 'In Bearbeitung', updated_date: FUTURE, last_synced_at: null },
      { id: 'b', freigabe_status: 'Freigegeben für Moodle', updated_date: FUTURE, last_synced_at: null },
    ];
    expect(filterExportableEinheiten(list).map((e) => e.id)).toEqual(['b']);
  });

  it('akzeptiert Einheiten ohne last_synced_at als "outdated"', () => {
    const list = [
      { id: 'neu', freigabe_status: 'Freigegeben für Moodle', updated_date: PAST, last_synced_at: null },
    ];
    expect(filterExportableEinheiten(list)).toHaveLength(1);
  });

  it('schließt Einheiten aus, deren last_synced_at neuer als updated_date ist', () => {
    const list = [
      { id: 'sync', freigabe_status: 'Freigegeben für Moodle', updated_date: PAST, last_synced_at: FUTURE },
    ];
    expect(filterExportableEinheiten(list)).toHaveLength(0);
  });

  it('lässt Einheiten zu, die nach Sync erneut bearbeitet wurden', () => {
    const list = [
      { id: 'mod', freigabe_status: 'Freigegeben für Moodle', updated_date: FUTURE, last_synced_at: PAST },
    ];
    expect(filterExportableEinheiten(list)).toHaveLength(1);
  });

  it('liefert ein leeres Array bei undefiniertem Input', () => {
    expect(filterExportableEinheiten()).toEqual([]);
  });
});

describe('filterExportableBasismodule', () => {
  it('akzeptiert nur Basismodule mit Status "Bereit für Moodle"', () => {
    const list = [
      { id: 'a', status: 'Entwurf', updated_date: FUTURE, last_synced_at: null },
      { id: 'b', status: 'Bereit für Moodle', updated_date: FUTURE, last_synced_at: null },
    ];
    expect(filterExportableBasismodule(list).map((b) => b.id)).toEqual(['b']);
  });

  it('schließt synchronisierte Basismodule ohne neue Änderung aus', () => {
    const list = [
      { id: 'sync', status: 'Bereit für Moodle', updated_date: PAST, last_synced_at: FUTURE },
    ];
    expect(filterExportableBasismodule(list)).toHaveLength(0);
  });

  it('liefert Basismodule, die nie synchronisiert wurden', () => {
    const list = [
      { id: 'neu', status: 'Bereit für Moodle', updated_date: PAST, last_synced_at: undefined },
    ];
    expect(filterExportableBasismodule(list)).toHaveLength(1);
  });

  it('liefert ein leeres Array bei undefiniertem Input', () => {
    expect(filterExportableBasismodule()).toEqual([]);
  });
});