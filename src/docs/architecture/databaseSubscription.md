# Adapter Pattern: `databaseSubscription`

**Zweck:** Kapselung der anbieterspezifischen Echtzeit-Subscribe-Logik hinter einer generischen Schnittstelle. Bei einem Provider-Wechsel (z.B. Base44 → Supabase Realtime) muss NUR dieser Adapter-Code ausgetauscht werden — Stream-Logik und Frontend bleiben unverändert.

## Speicherort

Der Adapter-Code lebt **inline in `functions/sseUpdates.js`** unter dem klar markierten Abschnitt:

```
// ═════════════════════════════════════════════════════════════════════════
// ── ADAPTER: databaseSubscription (provider-spezifisch: Base44) ──────────
// ═════════════════════════════════════════════════════════════════════════
```

**Warum inline?** Deno-Deploy-Functions können keine lokalen Module importieren — jede Function wird isoliert deployt. Eine separate `services/databaseSubscription.js` würde nicht mitgeliefert werden und zum Deployment-Fehler führen.

## Vertrag / Schnittstelle

```ts
listenToChanges(
  serviceClient: BaseClient,
  entityName: "Einheiten" | "Lernpakete",
  callback: (payload: NormalizedEvent) => void
): () => void  // Unsubscribe
```

### Normiertes DTO (Payload an Callback)

```json
{
  "operation": "CREATE" | "UPDATE" | "DELETE",
  "entity":    "Einheiten" | "Lernpakete",
  "recordId":  "123-abc",
  "changes":   {
    "is_locked":            true,
    "locked_by_email":      "user@example.com",
    "structural_lock":      "user@example.com",
    "structural_locked_at": "2026-04-24T10:00:00Z",
    "version":              2
  }
}
```

## Security: Field Whitelist (Data Exposure Prevention)

Der Adapter **filtert zwingend** auf eine feste Whitelist. **Niemals** Inhalts- oder Textfelder durch den Adapter fließen lassen — sonst umgeht SSE die Field-Level-Security.

```js
const ALLOWED_FIELDS = [
  'is_locked',
  'locked_by_email',
  'structural_lock',
  'structural_locked_at',
  'version',
];
```

## Diffing-Strategie

- **Shallow Diff** zwischen `event.data` und `event.old_data` (CPU-schonend auf Edge-Nodes).
- Nur Felder der Whitelist werden verglichen.
- Leeres `changes`-Objekt bei `UPDATE` → Event wird **verworfen** (spart Bandbreite).
- Bei `CREATE` → gefilterter Snapshot.
- Bei `DELETE` → leeres `changes` (nur `recordId` relevant).

> ⚠️ **Hinweis für zukünftige Erweiterungen:** Sollten tief verschachtelte Objekte über die Whitelist hinzugefügt werden, muss der Diff- UND der Frontend-Cache-Merge auf Deep-Merge umgestellt werden (siehe Shallow-Merge-Warnung im Frontend Cache Manager, Phase 2).

## Migration zu Supabase (zukünftig)

Nur der Adapter-Block in `functions/sseUpdates.js` muss ersetzt werden:

```js
// Statt: entity.subscribe(callback)
supabase
  .channel(`realtime:${entityName}`)
  .on('postgres_changes', { event: '*', schema: 'public', table: entityName }, (payload) => {
    const normalized = transformSupabaseEvent(entityName, payload);
    if (normalized) callback(normalized);
  })
  .subscribe();
```

Die Funktionen `computeFilteredDiff`, `filterSnapshot` und `ALLOWED_FIELDS` bleiben **unverändert** — sie sind providerneutral.