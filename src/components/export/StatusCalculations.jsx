/**
 * StatusCalculations.js
 * 
 * Hilfsfunktionen für Status-Vererbung (Worst-Case-Prinzip).
 */

/**
 * Berechnet den effektiven content_status für Container.
 * Worst-Case: wenn EIN Child 'draft' ist, ist der ganze Container 'draft'.
 */
export function getEffectiveContentStatus(children) {
  if (!children || children.length === 0) return 'approved'; // Leer = grün
  const hasUnfinished = children.some(c => c.effective_content_status === 'draft');
  return hasUnfinished ? 'draft' : 'approved';
}

/**
 * Reichert alle Daten mit berechneten Status-Werten an.
 */
export function enrichDataWithEffectiveStatus(activities, klone, masters) {
  // Klone anreichern
  const enrichedKlone = (klone || []).map(k => ({
    ...k,
    effective_content_status: k.content_status || 'draft',
    type: 'klon',
  }));

  // Masters anreichern (mit ihren Klonen)
  const enrichedMasters = (masters || []).map(m => {
    const childKlone = enrichedKlone.filter(k => k.master_aufgabe_id === m.id);
    return {
      ...m,
      children: childKlone,
      effective_content_status: getEffectiveContentStatus(childKlone),
      type: 'master',
    };
  });

  // Aktivitäten anreichern (mit Masters + einzelnen Klonen)
  const enrichedActivities = (activities || []).map(a => {
    const masters = enrichedMasters.filter(m => m.activity_id === a.id);
    const standaloneKlone = enrichedKlone.filter(k => !k.master_aufgabe_id && k.aktivitaet_id === a.id);
    const allChildren = [...masters, ...standaloneKlone];
    return {
      ...a,
      children: allChildren,
      effective_content_status: getEffectiveContentStatus(allChildren),
      type: 'activity',
    };
  });

  return enrichedActivities;
}