# SCORM-Integration · Schnittstellen-Spezifikation

**Ticket:** #SCORM-INT-001
**Status:** Schema-Entwurf zur gemeinsamen Abnahme
**Stand:** 2026-05-08
**Geltungsbereich:** Datenübergabe vom Planungstool (Pool-Manager) an die
Moodle-Builder-KI (MBK) für die automatisierte SCORM-Generierung.

> Dieses Dokument ist der **vertragliche Anker** zwischen Planungstool und
> SCORM-Welt. Erst nach beidseitiger Abnahme wird die Backend-Function
> `exportSCORMPlan` und der SCORM-Prototyp-Generator gegen dieses Schema
> implementiert. Änderungen am Schema MÜSSEN beidseitig dokumentiert und
> die `meta.schema_version` hochgezählt werden.

---

## 1. Zielsetzung & Designprinzipien

Stabile Identitäts-Anker für jedes Element der Unterrichtsplanung, damit die
Moodle-seitige Speicherung in `cmi.suspend_data` (Schüler-Fortschritte,
Tagebucheinträge, Dashboard-Haken) auch über inhaltliche Versionierungen
hinweg konsistent bleibt.

**Designprinzipien:**

1. **UUIDs statt semantische IDs.** Jedes Element nutzt seine
   plattformseitig vergebene, unveränderliche `id`. Lesbarkeit kommt über
   Typ-Präfixe (`lernpaket:<uuid>`).
2. **Tree + Flat-Map.** Die hierarchische Navigation lebt im `tree`, der
   schnelle O(1)-Lookup für Patches und Dashboard-Rendering im `flat_map`.
3. **Tombstones erhalten.** Gelöschte Elemente verschwinden nicht aus dem
   Export, sondern erscheinen mit `tombstoned: true` — Bestandsdaten in
   Moodle bleiben adressierbar.
4. **Keine Halluzination.** Inhalte werden 1:1 ausgegeben. Fehlende
   Pflichtinhalte werden explizit als `null` markiert, niemals geraten.

---

## 2. ID-Konventionen

Jede ID besteht aus einem Typ-Präfix + Stamm-ID. Stamm-IDs sind entweder
Plattform-UUIDs (Base44-`id`-Feld) oder semantische Schlüssel (System-
Bausteine, Lerntypen, Material-Hashes).

| Präfix | Stamm-ID-Typ | Quelle | Veränderlich? |
|---|---|---|---|
| `einheit:<uuid>` | UUID | `Einheiten.id` | Nein |
| `themenfeld:<uuid>` | UUID | `Themenfeld.id` | Nein |
| `lernpaket:<uuid>` | UUID | `Lernpakete.id` | Nein |
| `lernziel:<uuid>` | UUID | `Lernziele.id` | Nein |
| `aktivitaet:<uuid>` | UUID | `LernpaketPhaseAktivitaet.id` | Nein |
| `master:<uuid>` | UUID | `MasterAufgabe.id` | Nein |
| `aufgabe:<uuid>` | UUID | `AllgemeineAufgabe.id` | Nein |
| `katalog:<uuid>` | UUID | `AktivitaetenKatalog.id` | Nein |
| `systembaustein:<key>` | semantisch | `SystemBausteine.baustein_id` | Nein¹ |
| `sektor:<instance_id>` | UUID | Eintrag in `lernpfade_konfiguration` | Nein² |
| `item:<instance_id>` | UUID | Eintrag in `sektor.items[]` | Nein² |
| `material:<hash12>` | sha1[0:12] | berechnet aus `url + label` | Nein³ |
| `lerntyp:<key>` | enum | `minimalist | pragmatiker | ehrgeizig | passioniert` | Nein⁴ |

¹ `baustein_id` ist plattformweit eindeutig und wird beim Anlegen eines
   System-Bausteins durch Admin/Moodle-Designer fixiert.
² `instance_id` wird beim Anlegen eines Sektors/Items durch das Frontend
   als UUID erzeugt und nie überschrieben (Phase-1-Migration abgeschlossen).
³ Der Material-Hash ist deterministisch über `sha1(url + "|" + label)`
   berechnet, damit Reorder/Insert keine ID-Drift erzeugt. Nur die ersten
   12 Hex-Zeichen werden verwendet (Kollisionsraum 2⁴⁸, ausreichend).
⁴ Hartkodiert. Eine Änderung dieser vier Schlüssel ist ein Breaking Change
   und erfordert eine Schema-Major-Version.

---

## 3. JSON-Schema des `exportSCORMPlan`-Endpoints

### 3.1 Top-Level

```jsonc
{
  "meta":   { /* siehe 3.2 */ },
  "tree":   { /* siehe 3.3 */ },
  "flat_map": { /* siehe 3.4 */ }
}
```

### 3.2 `meta`

```jsonc
{
  "schema_version": "1.0.0",                    // Schema-Vertragsversion (semver)
  "template_version": "v1.9.0",                 // MBK_TEMPLATE_VERSION (für Kontext)
  "einheit_id": "einheit:<uuid>",
  "einheit_version": 7,                          // Einheiten.version (Optimistic Locking)
  "exported_at": "2026-05-08T14:23:00.000Z",    // ISO 8601 UTC
  "exported_by": "user@example.org",
  "lifecycle_status": "final_freigegeben",      // draft | final_freigegeben | export_running | published
  "fach": "Mathematik",
  "jahrgangsstufe": "7",
  "titel": "Lineare Funktionen",
  "schul_stammdaten": {
    "land":       "Deutschland",
    "bundesland": "Niedersachsen",
    "schulform":  "IGS"
  }
}
```

**Pflicht-Vorbedingung:** `lifecycle_status` muss `final_freigegeben`,
`export_running` oder `published` sein. Im Status `draft` liefert der
Endpoint **HTTP 409** und exportiert nicht — das Planungstool stellt
sicher, dass Inhalte vor Export fachlich abgenommen sind.

### 3.3 `tree` — hierarchische Sicht

```jsonc
{
  "einheit": {
    "id": "einheit:<uuid>",
    "titel": "Lineare Funktionen",
    "gesamtziele": ["Funktionsbegriff verstehen", "..."]
  },

  "themenfelder": [
    {
      "id": "themenfeld:<uuid>",
      "titel": "Grundlagen",
      "reihenfolge": 1,
      "lernpaket_ids": ["lernpaket:<uuid>", "..."]
    }
  ],

  "lernpakete": [
    {
      "id": "lernpaket:<uuid>",
      "themenfeld_id": "themenfeld:<uuid>",     // null = orphan
      "titel": "Funktionsbegriff",
      "geschaetzte_dauer_minuten": 45,
      "reihenfolge_nummer": 1,
      "lernziel_ids": ["lernziel:<uuid>", "..."],
      "phase_aktivitaet_ids": {                 // gruppiert nach Phase
        "Input":     ["aktivitaet:<uuid>"],
        "Übung":     ["aktivitaet:<uuid>", "..."],
        "Abschluss": ["aktivitaet:<uuid>"]
      }
    }
  ],

  "allgemeine_aufgaben": [
    {
      "id": "aufgabe:<uuid>",
      "titel": "Funktionsanalyse-Projekt",
      "anforderungsebene": "3 - Projekt",       // 1 - Basis | 2 - Transfer | 3 - Projekt
      "aufgaben_typ": "projekt_anker"           // inhalt | buendel | prozess | projekt_anker | handlung | auswahl_buendel
    }
  ],

  "lernpfade": {
    "lerntyp:minimalist":  [ /* sektoren-array, siehe unten */ ],
    "lerntyp:pragmatiker": [ ],
    "lerntyp:ehrgeizig":   [ ],
    "lerntyp:passioniert": [ ]
  }
}
```

**Sektor-Eintrag in `lernpfade.<lerntyp>[]`:**

```jsonc
{
  "id": "sektor:<instance_id>",
  "typ": "arbeitsphase_themenfeld",            // siehe lib/sektorTypen.js
  "typ_label": "Arbeitsphase",
  "titel": "Arbeitsphase · Grundlagen",
  "titel_snapshot": "Grundlagen",              // eingefroren beim Lock
  "themenfeld_id": "themenfeld:<uuid>",        // nur bei arbeitsphase_themenfeld
  "items": [
    {
      "id": "item:<instance_id>",
      "type": "aufgabe",                       // aufgabe | system
      "ref_id": "lernpaket:<uuid>",            // verweist auf flat_map-Eintrag
      "parent_instance_id": null,              // null = Root, sonst Item-ID des Bündels
      "bundle_config": {                       // nur bei Bündel-Items, sonst weglassen
        "erforderliche_anzahl": 3,
        "modus": "sequenziell"                 // sequenziell | frei
      }
    }
  ]
}
```

> Hierarchie-Regel: max. 1 Ebene Verschachtelung (Bündel → Children). Tiefer
> verschachtelte Strukturen sind im Frontend ausgeschlossen und treten im
> Export nicht auf.

### 3.4 `flat_map` — O(1)-Lookup-Tabelle

Schlüssel sind die in §2 definierten ID-Strings, Werte folgen einem
einheitlichen Wrapper:

```jsonc
{
  "<id>": {
    "type": "einheit | themenfeld | lernpaket | lernziel | aktivitaet | master | aufgabe | systembaustein | sektor | item | material",
    "tombstoned": false,                       // true = Element ist gelöscht / sync_status='to_delete'
    "data": { /* typabhängig, siehe unten */ }
  }
}
```

#### 3.4.1 Typ-spezifische `data`-Inhalte

**`type: "lernpaket"`**

```jsonc
{
  "id": "lernpaket:<uuid>",
  "titel": "Funktionsbegriff",
  "themenfeld_id": "themenfeld:<uuid>",
  "geschaetzte_dauer_minuten": 45,
  "is_complete": true,
  "content_status": "approved",
  "lernziele": [
    { "id": "lernziel:<uuid>", "formulierung_fachsprache": "Ich kann ..." }
  ]
}
```

**`type: "aktivitaet"` (LernpaketPhaseAktivitaet)**

```jsonc
{
  "id": "aktivitaet:<uuid>",
  "lernpaket_id": "lernpaket:<uuid>",
  "phase": "Übung",
  "katalog_id": "katalog:<uuid>",
  "katalog_name": "Begriffe zuordnen",
  "supports_master": true,
  "field_values": { /* Roh-Feldwerte aus dem AktivitaetenKatalog-form_schema */ },
  "master_ids": ["master:<uuid>", "..."],     // leer wenn supports_master=false
  "materialien": ["material:<hash12>", "..."] // aus field_values extrahiert
}
```

**`type: "master"` (MasterAufgabe)**

```jsonc
{
  "id": "master:<uuid>",
  "activity_id": "aktivitaet:<uuid>",
  "lernpaket_id": "lernpaket:<uuid>",
  "titel": "Variante A",
  "reihenfolge": 1,
  "field_values": { /* … */ },
  "content_status": "approved"
}
```

**`type: "aufgabe"` (AllgemeineAufgabe)**

```jsonc
{
  "id": "aufgabe:<uuid>",
  "titel": "Photosynthese erklären",
  "anforderungsebene": "2 - Transfer",
  "aufgaben_typ": "inhalt",
  "mission_type": "transfer",
  "schwierigkeitsgrad": 2,
  "aufgabenstellung": "...",
  "erwartungshorizont": "...",
  "musterloesung": "...",
  "verlinkte_lernpaket_ids": ["lernpaket:<uuid>"],   // bei buendel
  "verlinkte_aufgaben_ids":  ["aufgabe:<uuid>"],     // bei auswahl_buendel
  "verlinkte_projekt_ids":   ["aufgabe:<uuid>"],     // bei projekt_anker
  "erforderliche_anzahl": 3,
  "interne_reihenfolge": "frei",
  "rubric_criteria": [ /* … */ ],
  "brian_dialog": { /* … oder null */ },
  "materialien": ["material:<hash12>", "..."]
}
```

**`type: "systembaustein"`**

```jsonc
{
  "id": "systembaustein:<baustein_id>",
  "titel": "Kurze Einführung",
  "icon": "message-circle",
  "baustein_modus": "static",                  // static | placeholder_1to1 | bundle_1ton
  "accepted_types": ["lernpaket"],
  "export_instruktion": "..."                  // Roh-Text für die KI
}
```

**`type: "material"`**

```jsonc
{
  "id": "material:<hash12>",
  "owner_ref": "aufgabe:<uuid>",               // ODER aktivitaet:<uuid>, master:<uuid>
  "owner_field": "materialien",                // Feldname im Owner
  "index": 2,                                  // Phase-1-Fallback-Anker
  "kind": "pdf",                               // pdf | image | video | audio | book_ref | free_text | url
  "url": "https://medien.example.org/foo.pdf", // null bei book_ref/free_text
  "label": "Infoblatt zur Photosynthese",
  "raw_content": null                          // bei book_ref/free_text statt URL
}
```

> **Hash-Berechnung:** `sha1(url + "|" + (label || ""))`, davon die ersten
> 12 Hex-Zeichen. Bei rein textuellen Materialien (`book_ref`, `free_text`)
> wird statt `url` der `content`-Text in den Hash gespeist. Damit ist der
> Anker reorder-stabil und insert-stabil.

### 3.5 Tombstones

Elemente mit `sync_status === 'to_delete'` werden im Export **mitgeführt**:

- Sie erscheinen im `flat_map` mit `tombstoned: true`.
- `data` enthält den letzten bekannten Stand (für Anzeige im SCORM-
  Dashboard als „Veraltet").
- Sie erscheinen **nicht** mehr im `tree` — der Tree zeigt nur den
  aktiven Lernpfad.

Damit bleibt jede in `cmi.suspend_data` gespeicherte ID auflösbar, auch
nachdem das Element aus der aktiven Planung entfernt wurde.

---

## 4. Vorbedingungen & Fehlerverhalten

| Fall | HTTP | `error.code` |
|---|---|---|
| Nicht authentifiziert | 401 | `unauthorized` |
| Keine Leseberechtigung auf Einheit | 403 | `forbidden` |
| Einheit nicht gefunden | 404 | `not_found` |
| `lifecycle_status === 'draft'` | 409 | `unit_not_finalized` |
| Interner Fehler | 500 | `internal_error` |

Erfolg: HTTP 200, `Content-Type: application/json`, Body = Schema oben.

---

## 5. Versionierung dieses Schemas

- Das Feld `meta.schema_version` ist die **einzige verbindliche Versions-
  Aussage** für SCORM-Konsumenten.
- Erhöhung nach SemVer:
  - **Patch (1.0.x):** redaktionelle Klarstellung, kein Strukturwechsel.
  - **Minor (1.x.0):** additive Felder, rückwärtskompatibel.
  - **Major (x.0.0):** Breaking Change. Erfordert beidseitige Abnahme.
- Quelle der Wahrheit ist diese Datei.

---

## 6. Meilensteine (zur Erinnerung)

| MS | Verantwortlich | Status |
|---|---|---|
| 1 | SCORM-Team — Dummy-Datensatz + Prototyp | offen |
| 2 | App-Team — `exportSCORMPlan` Backend + Schema-Doku | **Schema → Review** |
| 3 | Beide — Echte Test-Einheit gegen Schema validieren | offen |

---

## 7. Offene Punkte / Spätere Phasen

- **Phase 2 (Material-Ebene):** Falls der deterministische Hash in der
  Praxis nicht ausreicht (z. B. weil URLs sich legitim ändern), führen wir
  echte `material_id`-UUIDs im Schema ein und migrieren Bestandsdaten.
- **Phase 2 (Asset-Metadaten):** Erweiterung von `data.material` um
  `mime_type`, `byte_size`, `duration_sec` (bei Video/Audio), sobald die
  Medienverwaltung diese Felder verlässlich liefert.
- **Phase 3 (Inkrementeller Export):** Optionaler `since=<timestamp>`-
  Parameter, der nur geänderte Elemente liefert (für effiziente Re-Sync-
  Läufe in Moodle).

---

## 8. Abnahme

| Rolle | Name | Datum | Status |
|---|---|---|---|
| App-Team | _(zu ergänzen)_ |  | ☐ |
| SCORM-Team | _(zu ergänzen)_ |  | ☐ |
| MBK-Team | _(zu ergänzen)_ |  | ☐ |

> Sobald alle drei Häkchen gesetzt sind, gilt dieses Schema als final und
> die Implementierung von `exportSCORMPlan` startet.