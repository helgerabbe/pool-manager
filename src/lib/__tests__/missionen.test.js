import { describe, it, expect } from 'vitest';
import { isMissionApplicable, MISSION_IDS, getMission, formatMissionLabel } from '@/lib/missionen';

describe('isMissionApplicable', () => {
  it('gilt fuer alle drei echten Aufgabenarten', () => {
    for (const typ of ['inhalt', 'handlung', 'externe_html_seite']) {
      expect(isMissionApplicable({ aufgaben_typ: typ, anforderungsebene: '2 - Transfer' })).toBe(true);
    }
  });

  it('schliesst Container aus — sie stehen selbst nirgends im Verlauf', () => {
    for (const typ of ['buendel', 'prozess', 'projekt_anker', 'auswahl_buendel']) {
      expect(isMissionApplicable({ aufgaben_typ: typ, anforderungsebene: '2 - Transfer' })).toBe(false);
    }
  });

  it('schliesst Projekte (Ebene 3) aus', () => {
    expect(isMissionApplicable({ aufgaben_typ: 'inhalt', anforderungsebene: '3 - Projekt' })).toBe(false);
  });

  it('behandelt fehlende Ebene als Ebene 1', () => {
    expect(isMissionApplicable({ aufgaben_typ: 'inhalt' })).toBe(true);
  });

  it('haengt NICHT mehr am Aufgabentyp einer Sequenz — der sitzt am Schritt', () => {
    expect(isMissionApplicable({
      aufgaben_typ: 'inhalt', aufgaben_modus: 'sequenz', anforderungsebene: '2 - Transfer',
    })).toBe(true);
  });

  it('vertraegt null', () => expect(isMissionApplicable(null)).toBe(false));
});

describe('Kategorien-Register', () => {
  it('hat genau die vier Werte in Verlaufsreihenfolge', () => {
    expect(MISSION_IDS).toEqual(['erstbegegnung', 'erarbeitung', 'sicherung', 'anwendung']);
  });

  it('liefert bei unbekannten Werten null statt zu werfen', () => {
    expect(getMission('transfer')).toBeNull();   // Alt-Slug von vor der Migration
    expect(getMission(null)).toBeNull();
    expect(formatMissionLabel('kreativitaet')).toBe('—');
  });

  it('jede Kategorie hat die Klassen, die das UI benutzt', () => {
    MISSION_IDS.forEach((id) => {
      const m = getMission(id);
      ['stripe', 'badge', 'chip', 'chipIdle', 'tile', 'tileActive'].forEach((k) => {
        expect(typeof m.classes[k]).toBe('string');
      });
    });
  });
});
