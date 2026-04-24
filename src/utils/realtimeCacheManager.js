/**
 * realtimeCacheManager.js
 * ────────────────────────
 * Verarbeitet normierte SSE-Payloads aus useRealtimeUpdates und patched
 * den React Query Cache DIREKT via setQueryData / setQueriesData.
 *
 * WICHTIG:
 *   - KEIN invalidateQueries → das würde unnötige Netzwerk-Roundtrips auslösen.
 *   - Nur bekannte Einträge werden gepatcht – keine Geister-Einträge.
 *   - Shallow Merge (siehe Warnung unten) ist für Meta-Felder korrekt,
 *     darf NICHT auf tiefe Objekte angewandt werden.
 *
 * Erwartetes Payload-Format:
 *   { operation: 'CREATE'|'UPDATE'|'DELETE', entity: 'Einheiten'|'Lernpakete',
 *     recordId: string, changes: { is_locked, locked_by_email,
 *     structural_lock, structural_locked_at, version } }
 */

/**
 * Wendet `changes` flach auf ein Objekt an.
 *
 * // WARNUNG: Shallow Merge! Nur für Metadaten wie Locks und Versionen geeignet.
 * // Tiefe Objektstrukturen dürfen hier nicht gemerged werden.
 */
function mergeShallow(oldObj, changes) {
  // WARNUNG: Shallow Merge! Nur für Metadaten wie Locks und Versionen geeignet.
  // Tiefe Objektstrukturen dürfen hier nicht gemerged werden.
  return { ...oldObj, ...changes };
}

/**
 * Patched ein Objekt innerhalb eines Arrays (flache Liste) anhand der id.
 * Gibt `oldList` zurück wenn kein Match → verhindert unnötige Re-Renders.
 */
function patchInArray(oldList, recordId, changes) {
  if (!Array.isArray(oldList)) return oldList;
  let changed = false;
  const next = oldList.map((item) => {
    if (item?.id === recordId) {
      changed = true;
      return mergeShallow(item, changes);
    }
    return item;
  });
  return changed ? next : oldList;
}

function removeFromArray(oldList, recordId) {
  if (!Array.isArray(oldList)) return oldList;
  const next = oldList.filter((item) => item?.id !== recordId);
  return next.length === oldList.length ? oldList : next;
}

// ─────────────────────────────────────────────────────────────────────────
// Entity-spezifische Patch-Strategien
// ─────────────────────────────────────────────────────────────────────────

function patchEinheitCaches(queryClient, recordId, operation, changes) {
  // 1) Flache Listen-Caches (['einheiten-list-secure'], ['einheiten'], ...)
  queryClient.setQueriesData({ queryKey: ['einheiten-list-secure'] }, (old) => {
    if (operation === 'DELETE') return removeFromArray(old, recordId);
    return patchInArray(old, recordId, changes);
  });

  queryClient.setQueriesData({ queryKey: ['einheiten'] }, (old) => {
    // Paginierte Variante: { data: [...], meta }
    if (old && typeof old === 'object' && Array.isArray(old.data)) {
      const nextData =
        operation === 'DELETE'
          ? removeFromArray(old.data, recordId)
          : patchInArray(old.data, recordId, changes);
      return nextData === old.data ? old : { ...old, data: nextData };
    }
    // Flache Array-Variante
    if (Array.isArray(old)) {
      if (operation === 'DELETE') return removeFromArray(old, recordId);
      return patchInArray(old, recordId, changes);
    }
    return old;
  });

  // 2) Einzel-Einheit Cache (['einheit', id])
  queryClient.setQueryData(['einheit', recordId], (old) => {
    if (!old) return old; // Konfliktvermeidung: keinen Geister-Eintrag erzeugen
    if (operation === 'DELETE') return undefined;
    return mergeShallow(old, changes);
  });

  // 3) Workspace-Data Cache (['workspace-data', id]) – verschachtelt
  queryClient.setQueryData(['workspace-data', recordId], (old) => {
    if (!old) return old;
    if (operation === 'DELETE') return undefined;
    const currentEinheit = old?.data?.einheit;
    if (!currentEinheit || currentEinheit.id !== recordId) return old;
    return {
      ...old,
      data: {
        ...old.data,
        einheit: mergeShallow(currentEinheit, changes),
      },
    };
  });
}

function patchLernpaketCaches(queryClient, recordId, operation, changes) {
  // 1) Flacher Lernpakete-Listen-Cache
  queryClient.setQueriesData({ queryKey: ['lernpakete'] }, (old) => {
    if (!Array.isArray(old)) return old;
    if (operation === 'DELETE') return removeFromArray(old, recordId);
    return patchInArray(old, recordId, changes);
  });

  // 2) Verschachtelter Workspace-Data Cache – Lernpakete liegen in data._flat.lernpakete
  queryClient.setQueriesData({ queryKey: ['workspace-data'] }, (old) => {
    const lernpakete = old?.data?._flat?.lernpakete;
    if (!Array.isArray(lernpakete)) return old;

    if (operation === 'DELETE') {
      const next = removeFromArray(lernpakete, recordId);
      if (next === lernpakete) return old;
      return { ...old, data: { ...old.data, _flat: { ...old.data._flat, lernpakete: next } } };
    }

    const next = patchInArray(lernpakete, recordId, changes);
    if (next === lernpakete) return old;
    return { ...old, data: { ...old.data, _flat: { ...old.data._flat, lernpakete: next } } };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Öffentliche API
// ─────────────────────────────────────────────────────────────────────────

/**
 * @param {import('@tanstack/react-query').QueryClient} queryClient
 * @param {{operation: string, entity: string, recordId: string, changes: object}} payload
 */
export function handleRealtimeUpdate(queryClient, payload) {
  if (!payload || !queryClient) return;
  const { operation, entity, recordId, changes } = payload;
  if (!entity || !recordId || !operation) return;

  // Bei UPDATE ohne Changes: nichts zu tun (Adapter verwirft das zwar schon,
  // aber defensiver Check hier hält den Code robust).
  if (operation === 'UPDATE' && (!changes || Object.keys(changes).length === 0)) return;

  const safeChanges = changes || {};

  switch (entity) {
    case 'Einheiten':
      patchEinheitCaches(queryClient, recordId, operation, safeChanges);
      break;
    case 'Lernpakete':
      patchLernpaketCaches(queryClient, recordId, operation, safeChanges);
      break;
    default:
      // Unbekannte Entität → ignorieren (keine Geister-Einträge)
      break;
  }
}