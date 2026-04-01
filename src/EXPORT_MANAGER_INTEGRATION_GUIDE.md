# MoodleExportManager - Integration Guide

## Komponenten-Features

### 1. Filter-Logik
```javascript
// Nur Elemente mit Status "Freigegeben für Moodle" + Änderungen seit letztem Export
filterExportableEinheiten(einheiten)
// Bedingung 1: freigabe_status === "Freigegeben für Moodle"
// Bedingung 2: last_synced_at ist null ODER älter als updated_date (Delta vorhanden)
```

### 2. Checkbox-Selektion
- **Standard**: Alle exportierbaren Elemente sind automatisch checked
- **Toggle einzeln**: Kann ein Element de-selektieren
- **Toggle-Gruppe**: "Alle auswählen / Aufheben" pro Gruppe (Einheiten / Basismodule)

### 3. Export-Payload
```json
{
  "timestamp": "2026-04-01T...",
  "export_type": "moodle_selective_delta",
  "einheiten": [
    {
      "id": "uuid-123",
      "titel_der_einheit": "Grundrechenarten",
      "fach": "Mathematik",
      "jahrgangsstufe": "5",
      "gesamtziel": "...",
      "freigabe_status": "Freigegeben für Moodle",
      "updated_date": "2026-03-31T10:00:00Z",
      "last_synced_at": "2026-03-25T15:30:00Z"
    }
  ],
  "basismodule": [...],
  "statistics": {
    "einheiten_count": 3,
    "basismodule_count": 2,
    "total_count": 5
  }
}
```

### 4. Visuelles Feedback
- **Neues Element**: Grünes Badge "Neues Element" (last_synced_at = null)
- **Update**: Blaues Badge "Update" (last_synced_at älter als updated_date)
- **Auswahl-Counter**: "X von Y Element(e) ausgewählt"

---

## Integration in ExportCenter.jsx

```javascript
// pages/ExportCenter.jsx

import { useState } from 'react';
import MoodleExportManager from '@/components/export/MoodleExportManager';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export default function ExportCenter() {
  const [exportManagerOpen, setExportManagerOpen] = useState(false);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Moodle Export</h1>
        {/* ✅ Amber Alert Button für ausstehende Exporte */}
        <Button
          onClick={() => setExportManagerOpen(true)}
          variant="outline"
          className="gap-2 border-amber-200 text-amber-700 hover:bg-amber-50"
        >
          <AlertTriangle className="w-4 h-4" />
          Export Manager
        </Button>
      </div>

      {/* Export Manager Modal */}
      <MoodleExportManager
        open={exportManagerOpen}
        onOpenChange={setExportManagerOpen}
      />

      {/* Rest of page */}
    </div>
  );
}
```

---

## Verwendung in anderen Komponenten

### Beispiel: Als Drawer statt Dialog

```javascript
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

// Wrapper falls du Drawer lieber magst:
export default function MoodleExportManagerDrawer({ open, onOpenChange }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="max-w-md">
        <SheetHeader>
          <SheetTitle>Moodle Export Manager</SheetTitle>
        </SheetHeader>
        {/* Copy-paste der Dialog-Content in hier */}
      </SheetContent>
    </Sheet>
  );
}
```

---

## Delta-Status Erklärung

### Neues Element (Never Synced)
```
last_synced_at === null oder undefined
Badge: "Neues Element" (grün)
Grund: Element wurde noch nie nach Moodle exportiert
```

### Update (Out of Sync)
```
last_synced_at < updated_date
Badge: "Update" (blau)
Grund: Einheit wurde verändert seit letztem Export
Beispiel: last_synced_at: 2026-03-25, updated_date: 2026-03-31
```

### In Sync (Nicht exportierbar)
```
last_synced_at >= updated_date
Nicht in der Liste!
Grund: Keine Änderungen seit letztem Export → kein Delta
```

---

## Test-Szenarien

### ✅ Szenario 1: Mehrere Einheiten mit unterschiedlichem Status
```
Datenbank:
1. Mathematik (status: "Freigegeben für Moodle", last_synced_at: null) → SICHTBAR
2. Deutsch (status: "Freigegeben für Moodle", last_synced_at: 2026-03-20, updated_at: 2026-03-31) → SICHTBAR
3. Englisch (status: "In Planung") → VERSTECKT
4. Geschichte (status: "Freigegeben für Moodle", last_synced_at: 2026-03-31, updated_at: 2026-03-30) → VERSTECKT (keine Änderungen)

Export Manager zeigt:
✅ Mathematik (Badge: Neues Element) - Checked
✅ Deutsch (Badge: Update) - Checked
```

### ✅ Szenario 2: Nutzer deselektiert eines
```
1. Export Manager öffnet sich
2. Alle 3 Einheiten sind checked
3. Nutzer deselektiert "Mathematik"
4. Klickt "Datei generieren"
5. JSON enthält nur "Deutsch" + "Basismodule" (falls vorhanden)
6. Toast: "3 Element(e) exportiert." (oder die Anzahl der ausgewählten)
```

### ✅ Szenario 3: Keine exportierbaren Elemente
```
Alle Einheiten sind entweder:
- Status "In Planung" (nicht freigegeben)
- ODER last_synced_at >= updated_date (keine Änderungen)

Ergebnis:
- Info-Banner: "Keine exportierbaren Elemente"
- Button: Disabled
```

---

## API-Anforderungen

### Einheiten Entity
```json
{
  "id": "uuid",
  "titel_der_einheit": "string",
  "fach": "enum",
  "jahrgangsstufe": "string",
  "gesamtziel": "string",
  "freigabe_status": "In Planung | Freigegeben für Moodle",
  "updated_date": "datetime", // Built-in
  "last_synced_at": "datetime | null"
}
```

### Basismodule Entity
```json
{
  "id": "uuid",
  "fach": "enum",
  "titel": "string",
  "beschreibung_thema": "string",
  "status": "Entwurf | Bereit für Moodle",
  "updated_date": "datetime", // Built-in
  "last_synced_at": "datetime | null"
}
```

---

## Performance-Hinweise

- **Query**: `base44.entities.Einheiten.list()` + `base44.entities.Basismodule.list()` - Beide in Parallel (React Query)
- **Filter**: Erfolgt im Frontend (useMemo) - effizient bei < 500 Einheiten
- **Download**: JSON-Datei generiert und via `Blob` heruntergeladen - kein Backend-Call nötig
- **Größe**: Payload ist relativ klein (nur ausgewählte Metadaten, nicht die ganzen Strukturen)

---

## Zukünftige Erweiterungen

1. **Batch-Sync**: Nach Download → Automatisches `last_synced_at` Update
2. **Preview**: JSON-Inhalt vor Download anzeigen
3. **Teilweiser Export**: Nur Einheiten einer bestimmten Jahrgangsstufe oder eines Fachs
4. **Scheduling**: Geplante Exports zu bestimmten Zeiten
5. **Audit Trail**: Exporthistory mit Timestamps und User-Info