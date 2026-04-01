import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

/**
 * saveEinheitStruktur
 * ─────────────────────────────────────────────────────────────────
 * Speichert die gesamte Struktur (Themenfelder + Lernpakete) einer Einheit
 * in einer Transaktion.
 *
 * Payload:
 * {
 *   einheit_id: string,
 *   spalten: [
 *     { id, titel, themenfeldId (neu oder bestehend) },
 *     ...
 *   ],
 *   paketeMap: {
 *     "spalten-id": [
 *       { id, titel_des_pakets, geschaetzte_dauer_minuten, reihenfolge_nummer, isNew? }
 *     ]
 *   }
 * }
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { einheit_id, spalten, paketeMap, modesMap } = body;

    if (!einheit_id || !spalten || !paketeMap) {
      return Response.json(
        { error: 'Missing required fields: einheit_id, spalten, paketeMap' },
        { status: 400 }
      );
    }

    // ── Schritt 1: Themenfelder speichern/aktualisieren ──────────────────────
    const themenfeldMap = {};

    for (let i = 0; i < spalten.length; i++) {
      const spalte = spalten[i];
      let themenfeldId = spalte.themenfeldId;
      const bearbeitungsmodus = modesMap?.[spalte.id] || 'offen';

      if (!themenfeldId) {
        // Neues Themenfeld erstellen
        const newTf = await base44.entities.Themenfeld.create({
          einheit_id,
          titel: spalte.titel,
          reihenfolge: i + 1,
          bearbeitungsmodus,
        });
        themenfeldId = newTf.id;
      } else {
        // Bestehendes Themenfeld aktualisieren
        await base44.entities.Themenfeld.update(themenfeldId, {
          titel: spalte.titel,
          reihenfolge: i + 1,
          bearbeitungsmodus,
        });
      }

      themenfeldMap[spalte.id] = themenfeldId;
    }

    // ── Schritt 2: Lernpakete speichern/aktualisieren ──────────────────────
    const SAMMELBECKEN_ID = '__sammelbecken__';
    const existingPackets = await base44.entities.Lernpakete.filter({
      einheit_id,
    });

    const processedPacketIds = new Set();

    for (const [spalteId, pakete] of Object.entries(paketeMap)) {
      const themenfeldId =
        spalteId === SAMMELBECKEN_ID ? null : themenfeldMap[spalteId];

      for (let i = 0; i < pakete.length; i++) {
        const paket = pakete[i];
        processedPacketIds.add(paket.id);

        if (paket.isNew) {
          // Neues Lernpaket erstellen
          await base44.entities.Lernpakete.create({
            einheit_id,
            themenfeld_id: themenfeldId,
            titel_des_pakets: paket.titel_des_pakets,
            geschaetzte_dauer_minuten: paket.geschaetzte_dauer_minuten || 45,
            reihenfolge_nummer: i + 1,
          });
        } else {
          // Bestehendes Lernpaket aktualisieren
          await base44.entities.Lernpakete.update(paket.id, {
            themenfeld_id: themenfeldId,
            reihenfolge_nummer: i + 1,
          });
        }
      }
    }

    // ── Schritt 3: Gelöschte Pakete löschen ──────────────────────────────────
    for (const packet of existingPackets) {
      if (!processedPacketIds.has(packet.id)) {
        await base44.entities.Lernpakete.delete(packet.id);
      }
    }

    return Response.json({
      success: true,
      message: 'Struktur erfolgreich gespeichert',
      themenfeldMap,
    });
  } catch (error) {
    console.error('Error saving structure:', error);
    return Response.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
});