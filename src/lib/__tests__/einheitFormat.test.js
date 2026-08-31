import { describe, it, expect } from 'vitest';
import {
  formatVon, istUebungsblock, formatLabel, formatRegeln,
  lernpaketGrenzeErreicht, neuerUebungsblock, EINHEIT_FORMATE,
} from '@/lib/einheitFormat';

describe('formatVon', () => {
  it('behandelt Bestandsdaten ohne Feld als Einheit', () => {
    expect(formatVon({ id: 'alt' })).toBe(EINHEIT_FORMATE.EINHEIT);
    expect(formatVon(null)).toBe(EINHEIT_FORMATE.EINHEIT);
    expect(istUebungsblock({ id: 'alt' })).toBe(false);
  });

  it('erkennt den Übungsblock', () => {
    expect(istUebungsblock({ format: 'uebungsblock' })).toBe(true);
    expect(formatLabel({ format: 'uebungsblock' })).toBe('Übungsblock');
    expect(formatLabel({})).toBe('Einheit');
  });

  it('faellt bei unbekannten Werten auf Einheit zurueck statt zu werfen', () => {
    expect(formatVon({ format: 'gibtesnicht' })).toBe(EINHEIT_FORMATE.EINHEIT);
  });
});

describe('formatRegeln', () => {
  it('blendet beim Übungsblock den schweren Aufbau aus', () => {
    const r = formatRegeln({ format: 'uebungsblock' });
    expect(r.zeigtGrundgeruest).toBe(false);
    expect(r.zeigtWizard).toBe(false);
    expect(r.zeigtOnboarding).toBe(false);
    expect(r.mehrereThemenfelder).toBe(false);
    expect(r.erlaubtProjektaufgaben).toBe(false);
    expect(r.maxLernpakete).toBe(3);
    expect(r.standardLerntypen).toEqual(['pragmatiker']);
  });

  it('laesst die Einheit unveraendert', () => {
    const r = formatRegeln({ format: 'einheit' });
    expect(r.zeigtGrundgeruest).toBe(true);
    expect(r.erlaubtProjektaufgaben).toBe(true);
    expect(r.maxLernpakete).toBeNull();
    expect(r.standardLerntypen).toBeNull();
  });

  it('gilt fuer Bestandsdaten wie fuer Einheiten', () => {
    expect(formatRegeln({}).erlaubtProjektaufgaben).toBe(true);
  });
});

describe('lernpaketGrenzeErreicht', () => {
  const block = { format: 'uebungsblock' };
  it('meldet die Empfehlung ab dem dritten Paket', () => {
    expect(lernpaketGrenzeErreicht(block, 2)).toBe(false);
    expect(lernpaketGrenzeErreicht(block, 3)).toBe(true);
    expect(lernpaketGrenzeErreicht(block, 5)).toBe(true);
  });
  it('gilt fuer Einheiten nie', () => {
    expect(lernpaketGrenzeErreicht({}, 99)).toBe(false);
  });
});

describe('neuerUebungsblock', () => {
  const neu = neuerUebungsblock({
    fach: 'Mathematik', titel: 'Brüche kürzen', jahrgangsstufe: '7', besitzerEmail: 'a@b.de',
  });

  it('ist IMMER privat — daran haengt, dass Sperren und Freigabe entfallen', () => {
    expect(neu.sichtbarkeit).toBe('privat');
    expect(neu.besitzer_email).toBe('a@b.de');
  });

  it('startet mit genau einem Lernplan', () => {
    expect(neu.aktive_lerntypen).toEqual(['pragmatiker']);
  });

  it('ueberspringt den Wizard — sofort bearbeitbar', () => {
    expect(neu.wizard_status).toBe('aktiv');
  });

  it('traegt das Format und die Angaben der Lehrkraft', () => {
    expect(neu.format).toBe('uebungsblock');
    expect(neu.titel_der_einheit).toBe('Brüche kürzen');
    expect(neu.fach).toBe('Mathematik');
    expect(neu.jahrgangsstufe).toBe('7');
  });

  it('das Ergebnis wird auch von den Regeln als Übungsblock erkannt', () => {
    expect(istUebungsblock(neu)).toBe(true);
    expect(formatRegeln(neu).maxLernpakete).toBe(3);
  });
});
