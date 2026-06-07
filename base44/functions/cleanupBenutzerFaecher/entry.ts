import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Einmalige Bereinigung der `fachbereich_zustaendigkeit` aller Benutzer.
 *
 * Behebt zwei Datenfehler aus früheren Importen:
 *  1. Sammel-Einträge wie "Mathematik, NAT" (ein Array-Element, das mehrere
 *     kommaseparierte Fächer enthält) → wird in einzelne Fächer aufgesplittet.
 *  2. Duplikate (z. B. ['Mathematik, NAT', 'Mathematik', 'NAT']) → dedupliziert.
 *  3. Ungültige Fächer, die nicht (mehr) in LookupFaecher existieren
 *     (z. B. "Physik") → werden entfernt.
 *
 * Nur für Admins aufrufbar. Idempotent: ein zweiter Lauf ändert nichts mehr.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Gültige Fächer aus dem Lookup laden (Single Source of Truth).
    const lookup = await base44.asServiceRole.entities.LookupFaecher.list();
    const validFaecher = new Set(lookup.map((f) => String(f.name).trim()));

    const benutzer = await base44.asServiceRole.entities.Benutzer.list('-created_date', 1000);

    const changes = [];

    for (const b of benutzer) {
      const original = b.fachbereich_zustaendigkeit || [];

      // 1+2: Kommaseparierte Einträge aufsplitten, trimmen, deduplizieren.
      const split = Array.from(
        new Set(
          original
            .flatMap((f) => String(f).split(',').map((s) => s.trim()))
            .filter(Boolean)
        )
      );

      // 3: Ungültige Fächer (nicht im Lookup) entfernen.
      const cleaned = split.filter((f) => validFaecher.has(f));

      // Vergleich: hat sich etwas geändert?
      const isSame =
        original.length === cleaned.length &&
        original.every((v, i) => v === cleaned[i]);

      if (!isSame) {
        await base44.asServiceRole.entities.Benutzer.update(b.id, {
          fachbereich_zustaendigkeit: cleaned,
        });
        changes.push({
          name: `${b.vorname || ''} ${b.nachname || ''}`.trim(),
          user_id: b.user_id,
          vorher: original,
          nachher: cleaned,
        });
      }
    }

    return Response.json({
      success: true,
      geprueft: benutzer.length,
      bereinigt: changes.length,
      changes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});