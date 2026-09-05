/**
 * webuntisFachEinsatzVorschlag
 *
 * Holt aus WebUntis, welche Lehrkraft in Jahrgang 9 welches Fach unterrichtet,
 * und macht daraus eine VORSCHLAGSLISTE — geschrieben wird nichts. Das
 * Eintragen bestätigt die Administration im Dialog (FachEinsatz).
 *
 * Warum eine feste Fach-Übersetzung: WebUntis führt 349 Fächer, darunter
 * Aufsichten, AGs und Schülerfirmen. Für die Poolzeit zählen nur die Fächer,
 * die es auch in der App gibt — alles andere wird bewusst verworfen, statt die
 * Zuordnung mit Rauschen zu füllen.
 *
 * Warum Namens-Abgleich: Das WebUntis-Konto darf die Lehrerliste nicht lesen
 * ("no right for getTeachers"), im Stundenplan steht nur der Nachname — E-Mails
 * gibt es dort also nicht. Deshalb wird über den Nachnamen gegen die Benutzer
 * der App gesucht; eindeutige Treffer gelten als 'sicher', mehrere Kandidaten
 * als 'unklar', keiner als 'unbekannt'. Die Entscheidung trifft der Mensch.
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { secrets } from 'base44:runtime';

// WebUntis-Fach (Langname) → Fach in der App. Alles, was hier nicht steht,
// wird ignoriert.
const FACH_MAP = {
  'Deutsch': 'Deutsch',
  'Mathematik': 'Mathematik',
  'Englisch': 'Englisch',
  'Naturwissenschaften': 'NAT',
  'Geschichte-Erdkunde-Politik': 'GEP',
  'Arbeit-Wirtschaft-Technik': 'AWT',
  'Kunst': 'Kunst',
  'Musik': 'Musik',
  'Informatik': 'Informatik',
  'Spanisch': 'Spanisch',
};

const JAHRGANG = '9';

function normName(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z]/g, '');
}

/** Montag bis Freitag der aktuellen Woche als yyyymmdd. */
function wochenBereich() {
  const heute = new Date();
  const tag = heute.getDay() === 0 ? 7 : heute.getDay();
  const montag = new Date(heute);
  montag.setDate(heute.getDate() - (tag - 1));
  const freitag = new Date(montag);
  freitag.setDate(montag.getDate() + 4);
  const fmt = (d) =>
    Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`);
  return { start: fmt(montag), ende: fmt(freitag) };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const server = String(secrets.get('WEBUNTIS_SERVER') || '')
      .replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const schule = secrets.get('WEBUNTIS_SCHULE');
    const url = `https://${server}/WebUntis/jsonrpc.do?school=${encodeURIComponent(schule)}`;

    let sessionId = '';
    const rpc = async (method, params = {}) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { Cookie: `JSESSIONID=${sessionId}` } : {}),
        },
        body: JSON.stringify({ id: '1', method, params, jsonrpc: '2.0' }),
      });
      const json = await res.json();
      if (json.error) throw new Error(`WebUntis: ${json.error.message}`);
      return json.result;
    };

    const auth = await rpc('authenticate', {
      user: secrets.get('WEBUNTIS_BENUTZER'),
      password: secrets.get('WEBUNTIS_PASSWORT'),
      client: 'poolmanager',
    });
    sessionId = auth.sessionId;

    const klassen = await rpc('getKlassen');
    const klassen9 = (klassen || []).filter((k) => /^9/.test(k.name || ''));
    const { start, ende } = wochenBereich();

    // fach → Map(nachname → Set(klassennamen))
    const gefunden = new Map();
    for (const klasse of klassen9) {
      const stunden = await rpc('getTimetable', {
        options: {
          element: { id: klasse.id, type: 1 },
          startDate: start,
          endDate: ende,
          subjectFields: ['id', 'name', 'longname'],
          teacherFields: ['id', 'name', 'longname'],
        },
      });
      for (const stunde of stunden || []) {
        for (const su of stunde.su || []) {
          const fach = FACH_MAP[su.longname] || FACH_MAP[su.name];
          if (!fach) continue;
          for (const te of stunde.te || []) {
            const nachname = te.longname || te.name;
            if (!nachname || nachname === '---') continue;
            if (!gefunden.has(fach)) gefunden.set(fach, new Map());
            const perFach = gefunden.get(fach);
            if (!perFach.has(nachname)) perFach.set(nachname, new Set());
            perFach.get(nachname).add(klasse.name);
          }
        }
      }
    }
    await rpc('logout').catch(() => {});

    // Benutzer der App (Namens-Abgleich) + bestehende Zuordnungen
    const benutzer = await base44.asServiceRole.entities.Benutzer.filter(
      { ist_aktiv: true }, 'nachname', 500
    );
    const kollegen = (benutzer || [])
      .filter((b) => b.user_id)
      .map((b) => ({
        email: b.user_id,
        name: `${b.vorname || ''} ${b.nachname || ''}`.trim() || b.user_id,
        nachname: b.nachname || '',
      }));
    const bestehende = await base44.asServiceRole.entities.FachEinsatz.filter({
      jahrgangsstufe: JAHRGANG,
    });
    const schonDa = new Set((bestehende || []).map((e) => `${e.fach}||${e.lehrkraft_email}`));

    const faecher = [...gefunden.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([fach, perFach]) => ({
        fach,
        lehrkraefte: [...perFach.entries()]
          .sort((a, b) => a[0].localeCompare(b[0]))
          .map(([nachname, klassenSet]) => {
            const n = normName(nachname);
            let kandidaten = kollegen.filter((k) => normName(k.nachname) === n);
            if (kandidaten.length === 0) {
              kandidaten = kollegen.filter((k) => normName(k.email.split('@')[0]).endsWith(n));
            }
            const status = kandidaten.length === 1 ? 'sicher' : kandidaten.length > 1 ? 'unklar' : 'unbekannt';
            const email = status === 'sicher' ? kandidaten[0].email : '';
            return {
              untis_name: nachname,
              klassen: [...klassenSet].sort(),
              status,
              email,
              name: status === 'sicher' ? kandidaten[0].name : '',
              kandidaten: kandidaten.map(({ email, name }) => ({ email, name })),
              bereits_eingetragen: !!email && schonDa.has(`${fach}||${email}`),
            };
          }),
      }));

    return Response.json({
      jahrgangsstufe: JAHRGANG,
      klassen: klassen9.map((k) => k.name),
      zeitraum: { start, ende },
      faecher,
      kollegen: kollegen.map(({ email, name }) => ({ email, name })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}