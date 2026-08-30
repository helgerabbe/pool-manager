/**
 * schrittTypen.test.js
 *
 * Tests für die Schrittfolge einer allgemeinen Aufgabe (Umbau 2026-08-29).
 *
 * Schwerpunkt liegt auf dem, was Bestandsdaten betrifft: Sortierung,
 * Altbestand ohne `status`, und die beiden Speicherorte (AllgemeineAufgabe
 * direkt vs. field_values der Katalog-Aktivität „Aufgabensequenz").
 */

import { describe, it, expect } from 'vitest';
import { buildSequenzSchritteFuerExport } from '@/lib/mbkAirGapPayloads';
import {
  schritteAusAufgabe, neuNummerieren, leererSchritt, neueSchrittId,
  schrittStatus, istSchrittVollstaendig, getSchrittTyp, vorschlagZuSchritten,
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

describe('vorschlagZuSchritten', () => {
  const katalog = [
    { id: 'k-uebung', name: 'Lückentext', phase: 'Übung' },
    { id: 'k-input', name: 'Lückentext', phase: 'Input' },
    { id: 'k-buch', name: 'Lehrwerk/Quelle', phase: 'Input' },
  ];

  it('löst Formatnamen gegen den Katalog auf', () => {
    const { schritte, hinweise } = vorschlagZuSchritten(
      [{ titel: 'Begriffe füllen', typ: 'katalog', aktivitaet_name: 'Lehrwerk/Quelle' }],
      katalog,
    );
    expect(schritte[0].typ).toBe(SCHRITT_TYPEN.KATALOG);
    expect(schritte[0].aktivitaet_id).toBe('k-buch');
    expect(hinweise).toHaveLength(0);
  });

  it('bevorzugt bei Phasen-Dubletten die Übungs-Variante', () => {
    const { schritte } = vorschlagZuSchritten(
      [{ titel: 'X', typ: 'katalog', aktivitaet_name: 'Lückentext' }],
      katalog,
    );
    expect(schritte[0].aktivitaet_id).toBe('k-uebung');
  });

  it('macht aus einem erfundenen Format eine offene Aufgabe statt einer toten Referenz', () => {
    const { schritte, hinweise } = vorschlagZuSchritten(
      [{ titel: 'Kreuzworträtsel', typ: 'katalog', aktivitaet_name: 'Kreuzworträtsel' }],
      katalog,
    );
    expect(schritte[0].typ).toBe(SCHRITT_TYPEN.OFFEN);
    expect(schritte[0].aktivitaet_id).toBeUndefined();
    expect(hinweise).toHaveLength(1);
  });

  it('setzt alle Schritte auf geplant und übernimmt Titel und Kurzbeschreibung', () => {
    const { schritte } = vorschlagZuSchritten([
      { titel: 'Einstieg', typ: 'material', kurzbeschreibung: 'Bild zeigen', dauer_minuten: 5 },
      { titel: 'Gespräch', typ: 'brian', kurzbeschreibung: 'Diskutieren' },
    ], katalog);
    expect(schritte.map((s) => s.status)).toEqual([SCHRITT_STATUS.GEPLANT, SCHRITT_STATUS.GEPLANT]);
    expect(schritte[0].titel).toBe('Einstieg');
    expect(schritte[0].plan.kurzbeschreibung).toBe('Bild zeigen');
    expect(schritte[0].plan.dauer_minuten).toBe(5);
    expect(schritte[1].plan.dauer_minuten).toBeNull();
    expect(schritte.map((s) => s.reihenfolge)).toEqual([0, 1]);
  });

  it('verträgt leeren Vorschlag und leeren Katalog', () => {
    expect(vorschlagZuSchritten([], []).schritte).toEqual([]);
    expect(vorschlagZuSchritten(undefined, undefined).schritte).toEqual([]);
    // Ohne Katalog wird jeder Katalog-Vorschlag zur offenen Aufgabe.
    const { schritte } = vorschlagZuSchritten([{ titel: 'A', typ: 'katalog', aktivitaet_name: 'X' }], []);
    expect(schritte[0].typ).toBe(SCHRITT_TYPEN.OFFEN);
  });
});

describe('buildSequenzSchritteFuerExport (MBK-Payload)', () => {
  it('liefert nichts fuer Aufgaben im Modus einzeln', () => {
    expect(buildSequenzSchritteFuerExport({ aufgaben_modus: 'einzeln', sequenz_schritte: [{ id: 'x', typ: 'material' }] })).toEqual([]);
    expect(buildSequenzSchritteFuerExport(null)).toEqual([]);
  });

  it('sortiert und nummeriert die Schritte lueckenlos', () => {
    const out = buildSequenzSchritteFuerExport({
      aufgaben_modus: 'sequenz',
      sequenz_schritte: [
        { id: 'b', typ: 'material', reihenfolge: 5, material: { material_typ: 'text', inhalt: 'B' } },
        { id: 'a', typ: 'material', reihenfolge: 1, material: { material_typ: 'text', inhalt: 'A' } },
      ],
    });
    expect(out.map((s) => s.schritt_id)).toEqual(['a', 'b']);
    expect(out.map((s) => s.reihenfolge)).toEqual([0, 1]);
  });

  it('gibt je Typ genau den passenden Nutzdaten-Block aus', () => {
    const schritte = [
      { id: 's1', typ: 'katalog', reihenfolge: 0, aktivitaet_id: 'k1', field_values: { buchtitel: 'X' } },
      { id: 's2', typ: 'offen', reihenfolge: 1, offen: { fragment: '<div class="aufgabe"></div>', snapshot_html: '<html>gross</html>' } },
      { id: 's3', typ: 'brian', reihenfolge: 2, brian: { dialog_name: 'D', learner_instruction: 'L', system_instruction: 'S', completion_rule: 'C' } },
      { id: 's4', typ: 'handlung', reihenfolge: 3, handlung: { arbeitsauftrag: 'Miss' } },
      { id: 's5', typ: 'extern', reihenfolge: 4, extern: { url: 'https://x' } },
    ];
    const out = buildSequenzSchritteFuerExport({ aufgaben_modus: 'sequenz', sequenz_schritte: schritte });

    expect(out[0].aktivitaet_id).toBe('k1');
    expect(out[0].field_values).toEqual({ buchtitel: 'X' });
    // Fragment ja, Vorschau-Snapshot nein.
    expect(out[1].fragment).toContain('class="aufgabe"');
    expect(out[1].snapshot_html).toBeUndefined();
    expect(out[2].brian_dialog.learner_instruction).toBe('L');
    expect(out[3].handlung.arbeitsauftrag).toBe('Miss');
    expect(out[4].extern.url).toBe('https://x');
  });

  it('laesst interne Werkstatt-Zustaende draussen', () => {
    const out = buildSequenzSchritteFuerExport({
      aufgaben_modus: 'sequenz',
      sequenz_schritte: [{
        id: 's1', typ: 'offen', reihenfolge: 0,
        status: 'uebernommen',
        plan: { kurzbeschreibung: 'interne Notiz' },
        herkunft: { quelle: 'neu' },
        offen: { fragment: '<div class="aufgabe"></div>' },
      }],
    });
    expect(out[0].status).toBeUndefined();
    expect(out[0].plan).toBeUndefined();
    expect(out[0].herkunft).toBeUndefined();
  });

  it('liefert im KI-Modus nur das Geruest, weil Payload 4 die Inhalte bringt', () => {
    const out = buildSequenzSchritteFuerExport({
      aufgaben_modus: 'sequenz',
      sequenz_schritte: [{ id: 's1', typ: 'brian', reihenfolge: 0, brian: { learner_instruction: 'L' } }],
    }, { istKi: true });
    expect(out[0].typ).toBe('brian');
    expect(out[0].brian_dialog).toBeUndefined();
  });
});

describe('Galerie-Schritte (Stufe 2 der Dreierregel)', () => {
  const katalog = [{ id: 'k-gal', name: 'Aktivitätengalerie', phase: 'Übung' }];

  it('traegt Vorlage und Herkunft ein, wenn der Assistent eine Galerie-Vorlage nennt', () => {
    const { schritte, hinweise } = vorschlagZuSchritten([{
      titel: 'Wortnetz zum Thema', typ: 'katalog',
      aktivitaet_name: 'Aktivitätengalerie',
      galerie_id: 'wortnetz-01', galerie_name: 'Wortnetz',
      kurzbeschreibung: 'Begriffe vernetzen',
    }], katalog);

    expect(schritte[0].typ).toBe(SCHRITT_TYPEN.KATALOG);
    expect(schritte[0].aktivitaet_id).toBe('k-gal');
    expect(schritte[0].field_values.galerie_id).toBe('wortnetz-01');
    expect(schritte[0].field_values.galerie_name).toBe('Wortnetz');
    expect(schritte[0].herkunft).toEqual({ quelle: 'galerie', vorlage_id: 'wortnetz-01' });
    expect(hinweise).toHaveLength(0);
  });

  it('gilt erst als vollstaendig, wenn der Uebergabetext da ist', () => {
    const nurVorlage = {
      typ: 'katalog', aktivitaet_id: 'k-gal',
      field_values: { galerie_id: 'wortnetz-01', galerie_name: 'Wortnetz' },
    };
    expect(istSchrittVollstaendig(nurVorlage)).toBe(false);
    expect(istSchrittVollstaendig({
      ...nurVorlage,
      field_values: { ...nurVorlage.field_values, inhalt: 'Die Begriffe lauten …' },
    })).toBe(true);
    // Leerzeichen zaehlen nicht als Inhalt.
    expect(istSchrittVollstaendig({
      ...nurVorlage,
      field_values: { ...nurVorlage.field_values, inhalt: '   ' },
    })).toBe(false);
  });

  it('laesst gewoehnliche Katalog-Schritte unveraendert', () => {
    expect(istSchrittVollstaendig({
      typ: 'katalog', aktivitaet_id: 'k1', field_values: { buchtitel: 'X' },
    })).toBe(true);
  });
});
