import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Nur Admins dürfen das' }, { status: 403 });
    }

    const aktivitaeten = await base44.asServiceRole.entities.AktivitaetenKatalog.list();
    let updated = 0;

    for (const aktivitaet of aktivitaeten) {
      // Übung und Abschluss bekommen supports_master = true
      // Input und alles andere bekommen supports_master = false
      const supportsMaster = aktivitaet.phase === 'Übung' || aktivitaet.phase === 'Abschluss';
      
      if (aktivitaet.supports_master !== supportsMaster) {
        await base44.asServiceRole.entities.AktivitaetenKatalog.update(aktivitaet.id, {
          supports_master: supportsMaster
        });
        updated++;
      }
    }

    return Response.json({
      success: true,
      message: `${updated} Aktivitäten aktualisiert: Übung + Abschluss = Master-Aufgaben erlaubt`,
      updated
    });
  } catch (error) {
    console.error('Fehler:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});