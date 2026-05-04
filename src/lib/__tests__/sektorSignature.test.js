/**
 * sektorSignature.test.js
 *
 * Phase E.1 — Verifiziert die Determinismus- und Sensitivitäts-
 * Eigenschaften der Sektor-Signature.
 *
 *   - Gleicher Input → gleicher Hash (No-Op-Saves dürfen keine Drift erzeugen).
 *   - Reihenfolge von Items ist signifikant (Umsortieren = Drift).
 *   - Irrelevante UI-Felder (titel, sektor_id, instance_id) sind transparent.
 *   - Bündel-Config (erforderliche_anzahl, modus) wirkt sich aus.
 *   - parent_instance_id (Bündel-Hierarchie) wirkt sich aus.
 *   - Default-/leere bundle_config erzeugt keine künstliche Drift.
 */

import { describe, it, expect } from 'vitest';
import { computeSektorSignature, computeSektorSignaturesForLerntyp } from '../sektorSignature.js';

const baseSektor = () => ({
  sektor_id: 'sek-1',
  sektor_typ: 'arbeitsphase_themenfeld',
  themenfeld_id: 'tf-42',
  titel: 'Arbeitsphase: Bruchrechnung',
  titel_snapshot: null,
  items: [
    { instance_id: 'i1', type: 'system', ref_id: 'sys_einfuehrung', parent_instance_id: null },
    { instance_id: 'i2', type: 'aufgabe', ref_id: 'auf-1', parent_instance_id: null },
    {
      instance_id: 'i3',
      type: 'system',
      ref_id: 'sys_buendel',
      parent_instance_id: null,
      bundle_config: { erforderliche_anzahl: 2, modus: 'frei' },
    },
    { instance_id: 'i4', type: 'aufgabe', ref_id: 'auf-2', parent_instance_id: 'i3' },
    { instance_id: 'i5', type: 'aufgabe', ref_id: 'auf-3', parent_instance_id: 'i3' },
  ],
});

describe('computeSektorSignature', () => {
  it('liefert deterministisch denselben Hash für identische Inputs', () => {
    const a = computeSektorSignature(baseSektor());
    const b = computeSektorSignature(baseSektor());
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
  });

  it('ignoriert UI-Felder (titel, titel_snapshot, sektor_id, instance_id)', () => {
    const a = computeSektorSignature(baseSektor());
    const sek = baseSektor();
    sek.titel = 'Komplett anderer Titel';
    sek.titel_snapshot = 'Eingefroren';
    sek.sektor_id = 'sek-999';
    sek.items = sek.items.map((it, idx) => ({ ...it, instance_id: `xxx-${idx}` }));
    const b = computeSektorSignature(sek);
    expect(a).toBe(b);
  });

  it('ist sensitiv für Reihenfolge der Items', () => {
    const a = computeSektorSignature(baseSektor());
    const sek = baseSektor();
    [sek.items[0], sek.items[1]] = [sek.items[1], sek.items[0]];
    const b = computeSektorSignature(sek);
    expect(a).not.toBe(b);
  });

  it('ist sensitiv für ref_id-Wechsel', () => {
    const a = computeSektorSignature(baseSektor());
    const sek = baseSektor();
    sek.items[1].ref_id = 'auf-NEU';
    const b = computeSektorSignature(sek);
    expect(a).not.toBe(b);
  });

  it('ist sensitiv für parent_instance_id (Bündel-Hierarchie)', () => {
    const a = computeSektorSignature(baseSektor());
    const sek = baseSektor();
    sek.items[3].parent_instance_id = null; // Aufgabe aus dem Bündel rausgezogen
    const b = computeSektorSignature(sek);
    expect(a).not.toBe(b);
  });

  it('ist sensitiv für bundle_config-Änderungen', () => {
    const a = computeSektorSignature(baseSektor());
    const sek = baseSektor();
    sek.items[2].bundle_config = { erforderliche_anzahl: 3, modus: 'frei' };
    const b = computeSektorSignature(sek);
    expect(a).not.toBe(b);

    const sek2 = baseSektor();
    sek2.items[2].bundle_config = { erforderliche_anzahl: 2, modus: 'sequenziell' };
    const c = computeSektorSignature(sek2);
    expect(a).not.toBe(c);
  });

  it('behandelt leere/fehlende bundle_config äquivalent', () => {
    const sek1 = baseSektor();
    sek1.items[0].bundle_config = undefined;
    const sek2 = baseSektor();
    delete sek2.items[0].bundle_config;
    const sek3 = baseSektor();
    sek3.items[0].bundle_config = {};
    expect(computeSektorSignature(sek1)).toBe(computeSektorSignature(sek2));
    expect(computeSektorSignature(sek1)).toBe(computeSektorSignature(sek3));
  });

  it('ist sensitiv für sektor_typ und themenfeld_id', () => {
    const a = computeSektorSignature(baseSektor());
    const sek = baseSektor();
    sek.sektor_typ = 'individuell';
    expect(computeSektorSignature(sek)).not.toBe(a);

    const sek2 = baseSektor();
    sek2.themenfeld_id = 'tf-99';
    expect(computeSektorSignature(sek2)).not.toBe(a);
  });

  it('liefert für leere/null-Sektoren einen stabilen Hash', () => {
    const h1 = computeSektorSignature(null);
    const h2 = computeSektorSignature(undefined);
    const h3 = computeSektorSignature({});
    expect(h1).toMatch(/^[0-9a-f]{16}$/);
    expect(h2).toBe(h1);
    // {} hat sektor_typ=null + themenfeld_id=null + items=[] → identisch zu null/undefined.
    expect(h3).toBe(h1);
  });
});

describe('computeSektorSignaturesForLerntyp', () => {
  it('liefert eine Map<sektor_id, hash> für den gewählten Lerntyp', () => {
    const konfig = {
      pragmatiker: [
        baseSektor(),
        { ...baseSektor(), sektor_id: 'sek-2', themenfeld_id: 'tf-100' },
      ],
      minimalist: [],
    };
    const map = computeSektorSignaturesForLerntyp(konfig, 'pragmatiker');
    expect(map.size).toBe(2);
    expect(map.get('sek-1')).toMatch(/^[0-9a-f]{16}$/);
    expect(map.get('sek-2')).toMatch(/^[0-9a-f]{16}$/);
    expect(map.get('sek-1')).not.toBe(map.get('sek-2'));
  });

  it('ignoriert Sektoren ohne sektor_id', () => {
    const konfig = {
      pragmatiker: [{ ...baseSektor(), sektor_id: undefined }],
    };
    const map = computeSektorSignaturesForLerntyp(konfig, 'pragmatiker');
    expect(map.size).toBe(0);
  });

  it('liefert eine leere Map für unbekannte Lerntypen', () => {
    expect(computeSektorSignaturesForLerntyp({}, 'pragmatiker').size).toBe(0);
    expect(computeSektorSignaturesForLerntyp(null, 'pragmatiker').size).toBe(0);
  });
});