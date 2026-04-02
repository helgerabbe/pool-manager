import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { paketId } = await req.json();

    if (!paketId) {
      return Response.json({ error: 'paketId is required' }, { status: 400 });
    }

    // Fetch all activities for this paket
    const allActivities = await base44.entities.LernpaketPhaseAktivitaet.filter({
      lernpaket_id: paketId
    });

    // Approve only activities that are not incomplete
    let approvedCount = 0;
    for (const activity of allActivities) {
      if (activity.is_complete) {
        await base44.entities.LernpaketPhaseAktivitaet.update(activity.id, {
          sync_status: 'approved'
        });
        approvedCount++;
      }
    }

    // Fetch all masters for this paket and approve them
    const allMasters = await base44.entities.MasterAufgabe.filter({
      lernpaket_id: paketId
    });
    
    for (const master of allMasters) {
      await base44.entities.MasterAufgabe.update(master.id, {
        sync_status: 'approved'
      });
      approvedCount++;
    }

    // Fetch all klone associated with these masters
    const kloneIds = new Set();
    for (const master of allMasters) {
      const klone = await base44.entities.Aufgabenbausteine.filter({
        master_aufgabe_id: master.id
      });
      klone.forEach(k => kloneIds.add(k.id));
    }

    for (const kloneId of kloneIds) {
      await base44.entities.Aufgabenbausteine.update(kloneId, {
        sync_status: 'approved'
      });
      approvedCount++;
    }

    return Response.json({ success: true, approvedCount });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});