# Moodle Sync-Lebenszyklus: Detaillierte Dokumentation

## Datenmodell-Erweiterung

### Neue Felder für Einheiten und Basismodule

```typescript
interface Entity {
  // Existing:
  id: string;
  updated_date: datetime; // Built-in, wann zuletzt geändert
  last_synced_at: datetime | null; // Wann erfolgreich in Moodle synchronisiert

  // NEW:
  last_exported_at: datetime | null; // Wann als JSON-Datei exportiert
}
```

---

## Sync-Status Logik: getDetailedSyncStatus()

### Status-Zustände (4-Farben-Modell)

#### 🟢 GREEN (Synchron / Grün)
```
Bedingung: last_synced_at >= updated_date

Bedeutung:
- Element ist aktuell in Moodle synchronisiert
- Keine Änderungen seit letztem Sync vorhanden
- Kein Export nötig

Beispiel:
  updated_date: 2026-03-25T10:00:00Z
  last_synced_at: 2026-03-31T14:30:00Z
  ✅ Grün (Synced 6 Tage später)
```

#### 🔵 BLUE (Exportiert / Warten / Blau)
```
Bedingung:
  last_exported_at > last_synced_at
  UND
  updated_date <= last_exported_at

Bedeutung:
- Element wurde als JSON exportiert
- Wartet auf manuelle Bestätigung: "Import in Moodle erfolgreich"
- Keine neuen Änderungen seit Export vorhanden
- Kein neuer Export nötig (nur Bestätigung)

Beispiel:
  updated_date: 2026-03-28T08:00:00Z
  last_synced_at: 2026-03-20T15:00:00Z (alt)
  last_exported_at: 2026-03-31T12:00:00Z (neu, noch nicht bestätigt)
  ✅ Blau (Wartet auf "Sync OK" Button)

UI:
- Status-Badge: 🕐 "Exportiert"
- Button: "Sync OK" (setzt last_synced_at = last_exported_at)
```

#### 🟠 ORANGE (Änderungen ausstehend / Orange)
```
Bedingung:
  updated_date > last_synced_at
  UND
  (kein Export vorhanden OR updated_date > last_exported_at)

Bedeutung:
- Element hat Änderungen, die noch nicht exportiert wurden
- Entweder: Noch nie exportiert
- Oder: Wurde nach letztem Export erneut geändert (aber noch nicht zu Rot)

Beispiel 1 (Noch nie exportiert):
  updated_date: 2026-03-31T10:00:00Z
  last_synced_at: null
  last_exported_at: null
  ✅ Orange (Neues Element, braucht Export)

Beispiel 2 (Update nach Export, aber vor nächster Änderung):
  updated_date: 2026-03-31T14:00:00Z
  last_synced_at: 2026-03-20T15:00:00Z
  last_exported_at: 2026-03-30T12:00:00Z
  updated_date > last_exported_at? JA → Orange
  ✅ Orange (Erneut geändert, neuer Export nötig)

UI:
- Status-Badge: ⚠️ "Änderungen ausstehend"
- Kann exportiert werden (im MoodleExportManager sichtbar)
```

#### 🔴 RED (Nach Export erneut geändert / Rot)
```
Bedingung:
  last_exported_at IS SET
  UND
  updated_date > last_exported_at

Bedeutung:
- Element wurde exportiert
- ABER wurde danach sofort/kurz danach erneut geändert
- Das ist eine Warnung: "Hey, du hast was ändert nach dem Export!"

Beispiel:
  last_exported_at: 2026-03-31T12:00:00Z
  updated_date: 2026-03-31T12:15:00Z (15 Min später geändert!)
  ✅ Rot (Warnung!)

UI:
- Status-Badge: 🚨 "Nach Export erneut geändert"
- Button: "Sync OK" ist VERSTECKT (muss zuerst neu exportiert werden)

Flow:
1. User exportiert Element → last_exported_at gesetzt
2. User ändert Element → updated_date wird aktualisiert
3. Status wird Rot
4. User muss erneut "Export generieren" klicken
5. Nach neuem Export: Zurück zu BLAU (warten auf Bestätigung)
```

---

## Lebenszyklus: Export → Sync

### Phase 1: Initialer Export

```
Schritt 1: Element ist neu/geändert
  ├─ Status: ORANGE (Änderungen ausstehend)
  └─ UI: "Änderungen ausstehend – Export erforderlich"

Schritt 2: User klickt "Datei generieren" im MoodleExportManager
  ├─ ✅ last_exported_at = NOW (aktueller Zeitstempel)
  ├─ JSON-Datei wird heruntergeladen
  └─ Status: BLUE (Exportiert, warten auf Bestätigung)
       └─ UI: "Exportiert – Wartet auf Moodle-Bestätigung"
          └─ "Sync OK" Button ist sichtbar

Schritt 3a: User klickt "Sync OK" (erfolgreicher Import in Moodle)
  ├─ ✅ last_synced_at = last_exported_at
  └─ Status: GREEN (Synchron)
       └─ UI: "In Moodle synchronisiert" ✅

Schritt 3b: User ändert Element bevor "Sync OK" gedrückt wird
  ├─ ✅ updated_date wird aktualisiert
  └─ Status: RED (Nach Export erneut geändert)
       └─ UI: "Nach Export erneut geändert – Erneuter Export erforderlich"
       └─ "Sync OK" Button ist VERSTECKT
       └─ Zurück zu Schritt 2
```

### Flow-Diagramm

```
┌─────────────────┐
│  NEUES ELEMENT  │
│   (created)     │
│ Status: ORANGE  │
└────────┬────────┘
         │
         ▼ User klickt "Export generieren"
         
    last_exported_at = NOW
         │
         ▼
    ┌────────────────┐
    │  EXPORTED      │
    │  Status: BLUE  │
    └────────┬───────┘
             │
        ┌────┴────┐
        │          │
        ▼          ▼
   "Sync OK"   User ändert
   geklickt    Element
        │          │
        │          ▼
        │      last_synced_at = null
        │      updated_date = NOW
        │          │
        │          ▼
        │      ┌───────────────┐
        │      │ CHANGED AFTER │
        │      │ Status: RED   │
        │      └───────┬───────┘
        │              │
        │              ▼ Erneut "Export generieren"
        │          last_exported_at = NEW NOW
        │              │
        │              ▼
        │          ┌──────────────┐
        │      ┌──▶│ EXPORTED     │
        │      │   │ Status: BLUE │
        │      │   └──────┬───────┘
        │      │          │
        │      └──────────┘
        │
        ▼
    ┌───────────────┐
    │  SYNCED       │
    │ Status: GREEN │
    │ ✅ In Moodle  │
    └───────────────┘
```

---

## MoodleExportManager: Integration

### Exports mit last_exported_at

```javascript
// Beim Klick auf "Datei generieren"

const nowTimestamp = new Date().toISOString();

// 1. Setze last_exported_at für alle ausgewählten Elemente
await Promise.all([
  ...selectedEinheiten.map(e =>
    base44.entities.Einheiten.update(e.id, {
      last_exported_at: nowTimestamp
    })
  ),
  ...selectedBasismodule.map(b =>
    base44.entities.Basismodule.update(b.id, {
      last_exported_at: nowTimestamp
    })
  ),
]);

// 2. Generiere JSON mit last_exported_at
const exportPayload = {
  einheiten: selectedEinheiten.map(e => ({
    ...e,
    last_exported_at: nowTimestamp  // Eingeschlossen in JSON
  })),
  // ...
};

// 3. Download JSON
// ...
```

### UI-Anzeige: Export-Datum

```javascript
// In ExportItemRow.jsx

{item.last_exported_at && (
  <p className="text-xs text-slate-600 mt-2">
    💾 Zuletzt exportiert: {formatExportDate(item.last_exported_at)}
    {/* z.B. "1. Apr 2026, 14:30" */}
  </p>
)}
```

### "Sync OK" Button

```javascript
// Sichtbar nur wenn: last_exported_at > last_synced_at

{item.last_exported_at && !item.last_synced_at && (
  <Button
    size="sm"
    variant="outline"
    onClick={() => onConfirmSync(item.id)}
    className="h-7 text-xs gap-1"
  >
    <Check className="w-3 h-3" />
    Sync OK
  </Button>
)}

// onClick: Setzt last_synced_at = current time
// → Status wird GRÜN
// → Button verschwindet
```

---

## Test-Szenarien

### ✅ Szenario 1: Klassischer Export-Flow

```
Zeitstempel:
  T0: 2026-03-25 10:00 — Einheit erstellt (updated_date)
  T1: 2026-03-31 14:00 — User klickt "Export generieren"
  T2: 2026-03-31 14:05 — User klickt "Sync OK"

Status-Verlauf:
  T0: ORANGE (updated_date = 2026-03-25, last_synced_at = null)
  T1: BLUE (last_exported_at = 2026-03-31 14:00)
  T2: GREEN (last_synced_at = 2026-03-31 14:00)

UI-Anzeige:
  T0: ⚠️ "Änderungen ausstehend – Export erforderlich"
  T1: 🕐 "Exportiert – Wartet auf Moodle-Bestätigung" + "Sync OK" Button
  T2: ✅ "In Moodle synchronisiert"
```

### ⚠️ Szenario 2: Änderung nach Export

```
Zeitstempel:
  T0: 2026-03-25 10:00 — Einheit erstellt
  T1: 2026-03-31 14:00 — User exportiert (last_exported_at)
  T2: 2026-03-31 14:15 — User ändert Titel (updated_date)

Status-Verlauf:
  T0: ORANGE
  T1: BLUE (warten auf Sync)
  T2: RED (Nach Export erneut geändert!)

UI-Anzeige:
  T2: 🚨 "Nach Export erneut geändert – Erneuter Export erforderlich"
      "Sync OK" Button ist VERSTECKT
      Nutzer muss erneut exportieren

Nächster Schritt:
  T3: User klickt "Export generieren" erneut
      → last_exported_at = T3 (aktualisiert)
      → Status: BLUE (wieder warten)
      → "Sync OK" Button reappears
```

### 🟢 Szenario 3: Schon synchronisiert (kein Export nötig)

```
Bedingung: last_synced_at >= updated_date

UI in MoodleExportManager:
- Element ist NICHT in der Liste "Exportierbare Elemente"
- Grund: Filter prüft last_synced_at < updated_date oder last_synced_at = null
- Nutzer sieht: "Keine exportierbaren Elemente"

Status-Badge (falls trotzdem angezeigt):
- ✅ "In Moodle synchronisiert"
```

---

## Implementierungs-Checklist

- [x] `getDetailedSyncStatus()` in `lib/statusLogic.js`
- [x] `formatExportDate()` Helper-Funktion
- [x] `last_exported_at` wird beim Export gesetzt
- [x] `last_synced_at` wird beim "Sync OK" gesetzt
- [x] Status-Badges mit 4 Farben (Green/Blue/Orange/Red)
- [x] ExportItemRow zeigt Exportdatum
- [x] "Sync OK" Button bei Blau
- [x] Filter: Nur Orange/Red in Export Manager sichtbar
- [ ] Entities: `last_exported_at` Feld hinzufügen (DB-Seite)
- [ ] Dashboard: Sync-Status Übersicht (optional)

---

## Zukünftige Erweiterungen

1. **Batch Sync-Bestätigung**: "Alle Elemente auf Grün setzen" Button
2. **Sync-History**: Zeige letzte 5 Exporte/Syncs mit Timestamps
3. **Moodle-Webhook Integration**: Automatische Bestätigung wenn Moodle erfolgreich importierte
4. **Conflict Resolution**: Was tun, wenn Moodle reject den Import? (Status: "Sync Failed")
5. **Auto-Cleanup**: last_exported_at auf null setzen nach X Tagen (configurable)