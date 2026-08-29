/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * schrittTypen.test.js
 *
 * Tests für die Schrittfolge einer allgemeinen Aufgabe (Umbau 2026-08-29).
 *
 * Schwerpunkt liegt auf dem, was Bestandsdaten betrifft: Sortierung,
 * Altbestand ohne `status`, und die beiden Speicherorte (AllgemeineAufgabe
 * direkt vs. field_values der Katalog-Aktivität „Aufgabensequenz").
 */

import {
  schritteAusAufgabe, neuNummerieren, leererSchritt, neueSchrittId,
  schrittStatus, istSchrittVollstaendig, getSchrittTyp,
  SCHRITT_TYPEN, SCHRITT_STATUS, SCHRITT_TYPEN_NEU,
} from '@/lib/schrittTypen';

describe('schritteAusAufgabe', () => {
  it('sortiert nach reihenfolge und nummeriert lückenlos neu', () => {
    const aufgabe = { sequenz_schritte: [
      { id: 'c', typ: 'material', reihenfolge: 7 },
      { id: 'a', typ: 'material', reihenfolge: 2 },
      { id: 'b', typ: 'aufgabe', reihenfolge: 5 },
    ] };
    const s = schritteAusAufgabe(aufgabe);
    expect(s.map((x) => x.id)).toEqual(['a', 'b', 'c']);
    expect(s.map((x) => x.reihenfolge)).toEqual([0, 1, 2]);
  });

  it('liest den zweiten Speicherort (field_values der Katalog-Aktivität)', () => {
    const aktivitaet = { field_values: { sequenz_schritte: [{ id: 'x', typ: 'material' }] } };
    expect(schritteAusAufgabe(aktivitaet)).toHaveLength(1);
  });

  it('verträgt fehlende reihenfolge, indem die Array-Position einspringt', () => {
    const aufgabe = { sequenz_schritte: [{ id: 'a', typ: 'material' }, { id: 'b', typ: 'material' }] };
    expect(schritteAusAufgabe(aufgabe).map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('liefert eine leere Folge statt zu werfen', () => {
    expect(schritteAusAufgabe(null)).toEqual([]);
    expect(schritteAusAufgabe({})).toEqual([]);
    expect(schritteAusAufgabe({ sequenz_schritte: 'kaputt' })).toEqual([]);
  });

  it('lässt die Quelle unangetastet', () => {
    const schritte = [{ id: 'b', typ: 'material', reihenfolge: 1 }, { id: 'a', typ: 'material', reihenfolge: 0 }];
    const aufgabe = { sequenz_schritte: schritte };
    schritteAusAufgabe(aufgabe);
    expect(aufgabe.sequenz_schritte.map((x) => x.id)).toEqual(['b', 'a']);
  });
});

describe('schrittStatus – Altbestand', () => {
  it('wertet Schritte ohne status als übernommen', () => {
    expect(schrittStatus({ id: 'alt', typ: 'material' })).toBe(SCHRITT_STATUS.UEBERNOMMEN);
  });

  it('lässt gesetzte Werte unverändert', () => {
    expect(schrittStatus({ status: SCHRITT_STATUS.GEPLANT })).toBe(SCHRITT_STATUS.GEPLANT);
    expect(schrittStatus({ status: SCHRITT_STATUS.GEBAUT })).toBe(SCHRITT_STATUS.GEBAUT);
  });
});

describe('istSchrittVollstaendig', () => {
  it('prüft Material je nach Material-Typ', () => {
    expect(istSchrittVollstaendig({ typ: 'material', material: { material_typ: 'text', inhalt: 'Hallo' } })).toBe(true);
    expect(istSchrittVollstaendig({ typ: 'material', material: { material_typ: 'text' } })).toBe(false);
    expect(istSchrittVollstaendig({ typ: 'material', material: { material_typ: 'bild', datei_url: 'u' } })).toBe(true);
    expect(istSchrittVollstaendig({ typ: 'material', material: { material_typ: 'bild', url: 'u' } })).toBe(false);
  });

  it('verlangt beim Katalog-Schritt Format UND Feldwerte', () => {
    expect(istSchrittVollstaendig({ typ: 'katalog', aktivitaet_id: 'k1', field_values: { buchtitel: 'X' } })).toBe(true);
    expect(istSchrittVollstaendig({ typ: 'katalog', aktivitaet_id: 'k1', field_values: {} })).toBe(false);
    expect(istSchrittVollstaendig({ typ: 'katalog', field_values: { buchtitel: 'X' } })).toBe(false);
  });

  it('akzeptiert beim offenen Schritt Fragment oder Snapshot', () => {
    expect(istSchrittVollstaendig({ typ: 'offen', offen: { fragment: '<div class="aufgabe"></div>' } })).toBe(true);
    expect(istSchrittVollstaendig({ typ: 'offen', offen: { snapshot_html: '<html></html>' } })).toBe(true);
    expect(istSchrittVollstaendig({ typ: 'offen', offen: { fragment: '   ' } })).toBe(false);
  });

  it('prüft die übrigen Typen an ihrem Pflichtfeld', () => {
    expect(istSchrittVollstaendig({ typ: 'brian', brian: { learner_instruction: 'Tu dies' } })).toBe(true);
    expect(istSchrittVollstaendig({ typ: 'brian', brian: { dialog_name: 'nur ein Name' } })).toBe(false);
    expect(istSchrittVollstaendig({ typ: 'handlung', handlung: { arbeitsauftrag: 'Miss nach' } })).toBe(true);
    expect(istSchrittVollstaendig({ typ: 'extern', extern: { url: 'https://x' } })).toBe(true);
    expect(istSchrittVollstaendig({ typ: 'aufgabe', aufgabe: { aufgabenstellung: 'Warum?' } })).toBe(true);
  });

  it('wirft bei unbekanntem oder fehlendem Schritt nicht', () => {
    expect(istSchrittVollstaendig(null)).toBe(false);
    expect(istSchrittVollstaendig({ typ: 'gibtesnicht' })).toBe(false);
  });
});

describe('leererSchritt', () => {
  it('legt für jeden neuen Typ den passenden Nutzdaten-Block an', () => {
    const erwartet = {
      katalog: 'field_values', offen: 'offen', brian: 'brian',
      handlung: 'handlung', extern: 'extern', material: 'material', aufgabe: 'aufgabe',
    };
    Object.entries(erwartet).forEach(([typ, feld]) => {
      const s = leererSchritt(typ, 0);
      expect(s).toHaveProperty(feld);
      expect(s.typ).toBe(typ);
      expect(s.status).toBe(SCHRITT_STATUS.GEPLANT);
      expect(s.id).toBeTruthy();
      // Frisch angelegt ist nie vollständig – sonst wäre der Baustand gelogen.
      expect(istSchrittVollstaendig(s)).toBe(false);
    });
  });

  it('vergibt eindeutige IDs', () => {
    const ids = Array.from({ length: 200 }, () => neueSchrittId());
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('neuNummerieren', () => {
  it('nummeriert nach dem Verschieben lückenlos durch', () => {
    const s = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    const [bewegt] = s.splice(2, 1);
    s.splice(0, 0, bewegt);
    expect(neuNummerieren(s)).toEqual([
      { id: 'c', reihenfolge: 0 }, { id: 'a', reihenfolge: 1 }, { id: 'b', reihenfolge: 2 },
    ]);
  });

  it('verträgt leer und undefined', () => {
    expect(neuNummerieren([])).toEqual([]);
    expect(neuNummerieren(undefined)).toEqual([]);
  });
});

describe('Typ-Register', () => {
  it('bietet Alt-Typen für neue Schritte nicht mehr an', () => {
    const neueIds = SCHRITT_TYPEN_NEU.map((t) => t.id);
    expect(neueIds).not.toContain(SCHRITT_TYPEN.AUFGABE);
    expect(neueIds).toContain(SCHRITT_TYPEN.KATALOG);
    expect(neueIds).toContain(SCHRITT_TYPEN.OFFEN);
  });

  it('kennt den Alt-Typ trotzdem, damit Bestandsschritte anzeigbar bleiben', () => {
    expect(getSchrittTyp(SCHRITT_TYPEN.AUFGABE)?.legacy).toBe(true);
    expect(getSchrittTyp(SCHRITT_TYPEN.AUFGABE)?.label).toBeTruthy();
  });

  it('gibt bei unbekannten Werten null zurück statt zu werfen', () => {
    expect(getSchrittTyp('gibtesnicht')).toBeNull();
    expect(getSchrittTyp(null)).toBeNull();
  });
});
