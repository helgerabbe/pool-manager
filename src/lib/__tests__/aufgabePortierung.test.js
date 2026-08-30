import { describe, it, expect } from 'vitest';
import {
  istPortierbar, baueBrianSchrittAusAufgabe, baueAenderungFuerPortierung,
} from '@/lib/aufgabePortierung';
import { sammleBrianDialoge } from '@/lib/brianDialoge';
import { istSchrittVollstaendig } from '@/lib/schrittTypen';

const alt = {
  id: 'a1', titel: 'Alte KI-Tutor-Aufgabe',
  aufgaben_typ: 'inhalt', aufgaben_modus: 'einzeln',
  aufgabenstellung: 'Analysiere den Text.',
  aufgaben_bild_url: 'https://x/bild.png',
  materialien: [{ type: 'pdf', label: 'Quelle', url: 'https://x/q.pdf' }],
  erwartungshorizont: 'Nennt drei Merkmale.',
  erwartungshorizont_datei_url: 'https://x/loesung.pdf',
  erwartungshorizont_datei_name: 'loesung.pdf',
  lernzielanalyse: { items: [{ text: 'Merkmale erkennen' }], analysiert_am: '2026-08-01' },
  brian_dialog_name: 'D', brian_learner_instruction: 'L',
  brian_system_instruction: 'S', brian_completion_rule: 'C',
  tutor_persona: 'streng', tutor_persona_zusatz: 'knapp bleiben',
  brian_sync_status: 'synced', brian_synced_at: '2026-08-02T10:00:00Z',
  brian_dialog_id: 'brian-42', brian_url: 'https://brian.study/42',
};

describe('istPortierbar', () => {
  it('nimmt alte Einzelaufgaben vom Typ inhalt', () => {
    expect(istPortierbar(alt)).toBe(true);
  });
  it('lehnt ab, was schon eine Folge ist', () => {
    expect(istPortierbar({ ...alt, aufgaben_modus: 'sequenz' })).toBe(false);
  });
  it('lehnt Typen ohne Brian-Dialog ab', () => {
    for (const typ of ['handlung', 'externe_html_seite', 'buendel', 'projekt_anker']) {
      expect(istPortierbar({ ...alt, aufgaben_typ: typ })).toBe(false);
    }
  });
  it('vertraegt null', () => expect(istPortierbar(null)).toBe(false));
});

describe('baueBrianSchrittAusAufgabe', () => {
  it('uebernimmt ALLE inhaltlichen Felder', () => {
    const { schritt } = baueBrianSchrittAusAufgabe(alt);
    const b = schritt.brian;
    expect(schritt.typ).toBe('brian');
    expect(schritt.titel).toBe('Alte KI-Tutor-Aufgabe');
    expect(b.aufgabenstellung).toBe('Analysiere den Text.');
    expect(b.aufgaben_bild_url).toBe('https://x/bild.png');
    expect(b.materialien).toHaveLength(1);
    expect(b.erwartungshorizont).toBe('Nennt drei Merkmale.');
    expect(b.erwartungshorizont_datei_url).toBe('https://x/loesung.pdf');
    expect(b.lernzielanalyse.items).toHaveLength(1);
    expect(b.dialog_name).toBe('D');
    expect(b.learner_instruction).toBe('L');
    expect(b.system_instruction).toBe('S');
    expect(b.completion_rule).toBe('C');
    expect(b.tutor_persona).toBe('streng');
    expect(b.tutor_persona_zusatz).toBe('knapp bleiben');
  });

  it('nimmt den Uebertragungsstand mit — sonst laege die Aufgabe doppelt in Brian', () => {
    const { schritt } = baueBrianSchrittAusAufgabe(alt);
    expect(schritt.brian.sync_status).toBe('synced');
    expect(schritt.brian.dialog_id).toBe('brian-42');
    expect(schritt.brian.url).toBe('https://brian.study/42');
    expect(schritt.brian.synced_at).toBe('2026-08-02T10:00:00Z');
  });

  it('markiert den Schritt als uebernommen, nicht als geplant', () => {
    expect(baueBrianSchrittAusAufgabe(alt).schritt.status).toBe('uebernommen');
  });

  it('vergibt eine stabile eigene ID', () => {
    const a = baueBrianSchrittAusAufgabe(alt).schritt.id;
    const b = baueBrianSchrittAusAufgabe(alt).schritt.id;
    expect(a).toBeTruthy();
    expect(a).not.toBe(b);
  });

  it('meldet, was uebernommen wurde', () => {
    const { uebernommen } = baueBrianSchrittAusAufgabe(alt);
    expect(uebernommen.join(' ')).toContain('Aufgabenstellung');
    expect(uebernommen.join(' ')).toContain('Erwartungshorizont');
    expect(uebernommen.join(' ')).toContain('Übertragungsstand');
  });

  it('warnt bei fehlender Aufgabenstellung', () => {
    const { hinweise } = baueBrianSchrittAusAufgabe({ ...alt, aufgabenstellung: '' });
    expect(hinweise.join(' ')).toContain('keine Aufgabenstellung');
  });

  it('warnt, wenn nur eine Musterloesung da ist', () => {
    const { hinweise } = baueBrianSchrittAusAufgabe({
      ...alt, erwartungshorizont: '', musterloesung: 'Die Loesung',
    });
    expect(hinweise.join(' ')).toContain('Musterlösung');
  });
});

describe('baueAenderungFuerPortierung', () => {
  it('aendert NUR Modus und Schrittfolge', () => {
    const { aenderung } = baueAenderungFuerPortierung(alt);
    expect(Object.keys(aenderung).sort()).toEqual(['aufgaben_modus', 'sequenz_schritte']);
    expect(aenderung.aufgaben_modus).toBe('sequenz');
    expect(aenderung.sequenz_schritte).toHaveLength(1);
  });

  it('ergibt im Export dieselbe Zahl Dialoge wie vorher — der eigentliche Beweis', () => {
    const vorher = sammleBrianDialoge([alt]);
    const portiert = { ...alt, ...baueAenderungFuerPortierung(alt).aenderung };
    const nachher = sammleBrianDialoge([portiert]);

    expect(nachher).toHaveLength(vorher.length);
    expect(nachher[0].felder).toEqual(vorher[0].felder);
    expect(nachher[0].sync_status).toBe(vorher[0].sync_status);
    expect(nachher[0].dialog_id).toBe(vorher[0].dialog_id);
    expect(nachher[0].bereit).toBe(vorher[0].bereit);
  });

  it('ergibt einen vollstaendigen Schritt, wenn die Aufgabe vollstaendig war', () => {
    const portiert = { ...alt, ...baueAenderungFuerPortierung(alt).aenderung };
    expect(istSchrittVollstaendig(portiert.sequenz_schritte[0])).toBe(true);
  });

  it('laesst die Felder an der Aufgabe unangetastet — Rueckweg bleibt offen', () => {
    const { aenderung } = baueAenderungFuerPortierung(alt);
    expect(aenderung.brian_dialog_name).toBeUndefined();
    expect(aenderung.erwartungshorizont).toBeUndefined();
    expect(aenderung.lernzielanalyse).toBeUndefined();
  });
});
