# Master-Aufgaben Freigabe-Workflow (Phase 3)

Dokumentation des Freigabe-Konzepts für Master-Aufgaben und deren Aggregation auf Aktivitäten.  
**Version:** 2026-05-15 | **Status:** Implementiert & Validiert

---

## Übersicht

Das System unterscheidet zwischen zwei Vollständigkeits-Aggregaten:

1. **Master-Aufgaben-Vollständigkeit** (`MasterAufgabe.is_complete`)  
   Prüft nur den *Inhalt* einer einzelnen Masteraufgabe (Lückentext, Begriffe zuordnen, etc.)

2. **Aktivitäts-Freigabe** (`LernpaketPhaseAktivitaet.content_status`)  
   Prüft ob *alle* Masteraufgaben der Aktivität freigegeben sind.

---

## Zustandsübergänge

### Phase 1: Neue Master-Aufgabe (Initial)

```
Aktivität: Lückentext (mit supports_master=true)
  ├─ Status: unvollständig (is_complete = false)
  └─ Freigabe: draft

Neue Master-Aufgabe erstellt:
  ├─ is_complete = false  (noch keine Inhalte)
  ├─ content_status = 'draft'
  └─ Aktivität wird von Guardian als unvollständig markiert
```

**Auslöser:** `masterAufgabeTouchActivity` (automation: `create`)  
→ Activity wird auf `is_complete = false` gesetzt  
→ `lernpaketAggregateGuardian` berechnet neu: 0 Masters, keine sind vollständig → Aktivität bleibt unvollständig

---

### Phase 2: Master mit Inhalt füllen (z.B. Lückentext mit Text + Lücken)

```
Bearbeiter gibt ein:
  ├─ Lückentext-Text (mindestens 10 Zeichen)
  └─ Mindestens eine Lücke mit Lösung

Speichern ausgelöst → updateActivitySecure → field_values aktualisiert
```

**Backend-Automatisierung:**

1. **`masterAufgabeTouchActivity` (update-Event)**  
   - Liest `field_values` der Master-Aufgabe
   - Validiert mit `isMasterComplete()` gegen Aktivitätstyp
   - Setzt `MasterAufgabe.is_complete = true`

2. **`lernpaketAggregateGuardian` (Entity-Automation auf LernpaketPhaseAktivitaet)**  
   - Liest alle `MasterAufgabe` der Aktivität
   - **Aktivität ist vollständig wenn:**  
     - Mindestens 1 Master vorhanden UND  
     - **ALLE** Masters haben `is_complete = true`
   - Setzt `LernpaketPhaseAktivitaet.is_complete = true`

**Ergebnis:**
```
Master-Aufgabe #1:
  ├─ is_complete = true  ✓
  └─ content_status = 'draft'

Aktivität:
  └─ is_complete = true  ✓ (durch Guardian aggregiert)
```

---

### Phase 3: Freigegeben Button

Wenn eine Master-Aufgabe `is_complete = true` ist, erscheint der Button **"Freigeben"**  
(Toggle-Button mit Häkchen-Icon).

```
Bearbeiter klickt "Freigeben" auf Master #1
  ↓
approveMasterAufgabe({ masterId, action: 'approve' })
  ├─ Setzt MasterAufgabe.content_status = 'approved'
  ├─ Setzt MasterAufgabe.sync_status = 'pending' (Moodle-Trigger)
  └─ **Aggregiert Activity-Status auf 'approved' wenn ALLE Masters approved**

Activity wird über approveMasterAufgabe aktualisiert:
  ├─ Liest ALLE MasterAufgaben der Activity
  ├─ Prüft: sind SIE ALLE approved?
  ├─ Wenn JA: setze Activity.content_status = 'approved'
  └─ Wenn NEIN: setze Activity.content_status = 'draft'
```

**Ergebnis nach Freigabe:**
```
Master-Aufgabe #1:
  ├─ is_complete = true
  ├─ content_status = 'approved'  ← Freigegeben
  ├─ sync_status = 'pending'
  └─ UI: Schloss-Icon (gesperrt), grüner Badge "Freigegeben"

Aktivität:
  ├─ content_status = 'approved'  ← Vererbt von Master #1
  └─ UI: "Freigegeben" Badge im Header
```

---

### Phase 4: Master wird bearbeitet → Freigabe aufheben

```
Bearbeiter klickt "Freigabe zurückziehen" auf Master #1
  ↓
approveMasterAufgabe({ masterId, action: 'unapprove' })
  ├─ Setzt MasterAufgabe.content_status = 'draft'
  ├─ sync_status bleibt UNVERÄNDERT (bereits gespeichert)
  └─ **Aggregiert Activity-Status zurück auf 'draft'**

Activity wird aktualisiert:
  ├─ Mindestens 1 Master hat content_status = 'draft'
  ├─ Deshalb: setze Activity.content_status = 'draft'
  └─ Aktivität kann wieder bearbeitet werden
```

---

### Phase 5: Mehrere Masters freigeben

```
Aktivität Lückentext mit 3 Masters:

Master #1: is_complete=true, content_status='approved' ✓
Master #2: is_complete=true, content_status='approved' ✓
Master #3: is_complete=true, content_status='approved' ✓

  → approveMasterAufgabe prüft: ALLE approved?
  → JA → Activity.content_status = 'approved'
  
Activity wird als KOMPLETT FREIGEGEBEN markiert:
  └─ Schloss-Icon im Menübaum, "Freigegeben" Badge
```

---

### Phase 6: Neue Master hinzufügen → Freigabe-Reset

```
Bearbeiter erstellt eine 4. Master-Aufgabe

  ↓ masterAufgabeTouchActivity (create)
  ├─ Activity wird auf is_complete = false gesetzt
  
  ↓ lernpaketAggregateGuardian
  ├─ Neue Master hat is_complete = false
  ├─ Prüfung: ALLE Masters vollständig? NEIN
  └─ Aktivität bleibt is_complete = false
  
  ↓ approveMasterAufgabe (Aggregation)
  ├─ Master #4 hat content_status = 'draft'
  ├─ Prüfung: ALLE Masters approved? NEIN
  └─ Activity.content_status = 'draft'  ← Freigabe automatisch aufgehoben

Aktivität ist nun wieder edierbar:
  └─ Master #4 muss zunächst mit Inhalten gefüllt + freigegeben werden
```

---

### Phase 7: Master löschen

```
Bearbeiter löscht Master #2 von 3 Masters

  ↓ masterAufgabeTouchActivity (delete)
  ├─ Activity wird auf is_complete = false gesetzt
  
  ↓ lernpaketAggregateGuardian
  ├─ Nur noch 2 Masters übrig (Master #1, #3)
  ├─ Beide sind is_complete = true
  └─ Aktivität bleibt is_complete = true
  
  ↓ approveMasterAufgabe (Aggregation) — wenn Masters approved waren
  ├─ Wenn alle verbleibenden Masters noch approved sind
  └─ Activity.content_status bleibt 'approved'

Wenn alle Masters gelöscht:
  └─ Aktivität wird is_complete = false, content_status = 'draft'
```

---

## Validierungsregeln pro Aktivitätstyp

Die Funktion `isMasterComplete()` in `masterAufgabeTouchActivity.js` definiert:

| Typ | Regel | Mindestanforderung |
|-----|-------|------------------|
| **Lückentext** | field_values.lueckentext mit Text + Lücken | Text + mind. 1 Lücke mit Lösung |
| **Begriffe zuordnen** | field_values.pairs | ≥ 1 vollständiges Paar (left + right gefüllt) |
| **Sortierung** | field_values.orderedItems | ≥ 2 Items |
| **Mini-Quiz** | field_values.questions | ≥ 1 Frage |
| **Bildbeschriftung** | field_values.backgroundImage + dropZones | Bild + mind. 1 Zone mit Label |
| **KI-Tutor** | field_values.aufgabenstellung | Text ≠ leer |
| **Fallback** | Beliebige field_values | Irgendein nicht-leeres Feld |

---

## Bekannte Schwachstelle (Akzeptiert)

### Aktivitäts-Aufgabenstellung ist nicht gesperrt

Die `Aufgabenstellung` liegt auf der Ebene der **Aktivität**, nicht der **Master-Aufgabe**.

**Scenario:**
```
Aktivität Lückentext (alle 3 Masters freigegeben):
  ├─ Aufgabenstellung: "Finde die Lücken im Text"
  ├─ status: 'approved'  (freigegeben)
  
Bearbeiter könnte theoretisch die Aktivitäts-Aufgabenstellung ändern:
  └─ System blockiert das korrekt mit updateActivitySecure (status 423)
  └─ Aber Schema hat keine Bearbeitungssperre auf Field-Ebene
```

**Entscheidung:** Dieses Risiko wird **in Kauf genommen**, da:
- Die Aufgabenstellung ist üblicherweise stabil (ändert sich nicht nach Freigabe)
- Frontend sperrt bereits bei `content_status = 'approved'`
- Moodle-Export hält eine Kopie der freigegebenen Aufgabenstellung
- Audit-Log erfasst Änderungen

---

## Klone sind NICHT in Freigabe-Aggregaten enthalten

- Nur **Master-Aufgaben** beeinflussen `is_complete` und `content_status`
- **Klone** (Kopien der Masters) beeinflussen NICHTS
- Dies ist intentional — Klone sind Studentenmaterial, nicht Strukturelemente

---

## Sync-Status-Propagation

Bei Freigabe eines Masters:

```
approveMasterAufgabe({ action: 'approve' })
  ├─ MasterAufgabe.content_status = 'approved'
  ├─ MasterAufgabe.sync_status = 'pending'  ← Trigger für Moodle-Export
  └─ Activity wird ebenfalls auf sync_status geprüft (nicht direkt im approve-Endpoint)
```

---

## Implementierungs-Referenz

**Entity-Automationen:**
- `masterAufgabeTouchActivity` — Validierung + Activity-Touch bei Master-CRUD
- `approveMasterAufgabe` — Freigabe + Activity-Aggregation
- `lernpaketAggregateGuardian` — Globale is_complete-Aggregation

**Validierungs-Funktionen:**
- `lib/completenessValidation.js` — Single Source of Truth (Frontend + Backend)
- `functions/masterAufgabeTouchActivity` — Inline-Validierung pro Typ

**Frontend:**
- `MasterAufgabeCard` — Approval Button + UI für Freigabe
- `ActivityMasterPanel` — Activity-Header mit "Freigegeben" Badge

---

## Checkliste: Workflow ist korrekt implementiert

- [x] Master-Vollständigkeit wird pro Aktivitätstyp validiert
- [x] Activity wird zu `is_complete=false` gesetzt wenn Master hinzugefügt/gelöscht
- [x] Activity wird zu `is_complete=true` aggregiert wenn ALLE Masters complete
- [x] Activity wird zu `content_status='approved'` wenn ALLE Masters approved
- [x] Activity wird zu `content_status='draft'` wenn 1+ Master unapproved werden
- [x] Neue Masters werden mit `is_complete=false` erstellt
- [x] Klone beeinflussen Aktivitäts-Status nicht
- [x] Audit-Log erfasst alle State-Übergänge
- [x] Moodle-Export-Lock blockiert Änderungen
- [x] Freigabe-Sperre sperrt alle Inhalte der Aktivität (updateActivitySecure Status 423)