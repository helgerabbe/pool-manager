# Umfassendes System-Audit: PoolPlaner v2 (Phase 6)

**Datum:** 2026-04-01  
**Fokus:** Stabilitätsanalyse, Sicherheitsprüfung, Datenkonsistenz, UX-Robustheit

---

## 🚨 KRITISCHE PROBLEME (Sofort adressieren)

### 1. **Cascade Delete & Orphaned Records**
**Problem:** Wenn Entitäten gelöscht werden, entstehen verwaiste Records.

**Beispiele:**
- Lernpaket gelöscht → Lernziele gelöscht ✅
- Lernziel gelöscht → `AllgemeineAufgabeLernzielMapping` bleibt bestehen ❌
- Themenfeld gelöscht → Verwaiste Lernpakete ❌
- Aufgabe gelöscht → Mappings (`MappingAufgabeBasisziel`) bleiben ❌
- EinheitMember gelöscht → Keine Cascading ❌

**Impact:** 
- Datenbank wird mit Müll gefüllt
- Queries werden langsamer
- Fehlerhafte Referenzen in UI

**Lösung erforderlich:**
```javascript
// Bei jedem Delete MUSS geprueft werden:
// 1. Welche Entitäten referenzieren diese?
// 2. Cascade vs. Prevent Pattern?
// 3. Audit Trail für gelöschte Daten?
```

**Prüfpunkte:**
- [ ] `deleteLernziel` - Mappings auch löschen?
- [ ] `deleteThemenfeld` - Was mit Paketen passieren?
- [ ] `deleteEinheit` - Alles cascaden?
- [ ] `deleteAufgabe` - Mappings cleanup?

---

### 2. **Concurrency & Race Conditions**
**Problem:** Mehrere User könnten gleichzeitig gleiche Ressource bearbeiten.

**Szenarien:**
```
Szenario A: Structural Lock Bypass
1. User A öffnet Einheit X (Struktur-Edit)
2. User B navigiert auch zu Einheit X
3. User A speichert → Lock wird aufgeräumt
4. User B hat keinen Lock, kann aber bearbeiten
→ Konflikt nicht erkannt

Szenario B: Lernpaket verschieben
1. User A: Paket von Themenfeld 1 → Feld 2
2. User B: Arbeitet noch in Feld 1 an diesem Paket
3. Package Move Event kommt zu spät
→ UI zeigt altes Themenfeld
```

**Impact:**
- Dateninkonsistenz möglich
- User sehen veraltete Daten
- Broadcast Channel kann Messages verlieren

**Lösung erforderlich:**
- [ ] Optimistic Locking Versioning (z.B. `version` Feld)
- [ ] Update-Konflikte erkennen und User benachrichtigen
- [ ] Structural Lock timeout prüfen (60 Min ausreichend?)
- [ ] BroadcastChannel Reliability testen

---

### 3. **RBAC Backend-Validierung fehlt**
**Problem:** UI prüft Berechtigungen, aber Backend validiert nicht.

**Szenario:**
```
1. User (Fachlehrkraft) hat nur Deutsch
2. UI zeigt Mathe-Button deaktiviert ✅
3. User öffnet DevTools und ruft API direkt auf:
   PATCH /entities/Einheiten/{id} { fach: "Mathematik" }
4. Backend validiert NICHT → Änderung erfolgreich ❌
5. User kann nun Mathe-Inhalte verwalten
```

**Betroffene Operationen:**
- [ ] Entity Updates (alle Typen)
- [ ] Deletions (besonders kritisch)
- [ ] Batch Operations
- [ ] Status Changes (freigegeben für Moodle)

**Lösung erforderlich:**
```javascript
// ALLE Mutations müssen Backend-RBAC validieren:
// - User.role prüfen
// - Subject-Zuständigkeit prüfen
// - Spezielle Berechtigungen für Operationen
```

---

## ⚠️ ERNSTHAFTE SICHERHEITSBEDENKEN

### 4. **Fehlende Audit Trail & Soft Deletes**
**Problem:** Keine Nachverfolgung, wer was wann änderte oder löschte.

**Fehlende Daten:**
- Wer hat eine Einheit erstellt?
- Wer hat ein Lernziel gelöscht?
- Wann wurde Status von "Entwurf" zu "Freigegeben" geändert?
- Kann gelöschter Inhalt wiederhergestellt werden?

**Impact:**
- Keine Accountability für Lehrkräfte
- Keine Möglichkeit, Änderungen zu revertieren
- Compliance/Audit-Probleme bei Schulen

**Lösung erforderlich:**
- [ ] Soft Delete Pattern implementieren (mit `deleted_at`)
- [ ] Audit Log Entity erstellen
- [ ] Updated_by + Updated_date Felder überall konsistent
- [ ] Change History UI

---

### 5. **Moodle-Export Konsistenz**
**Problem:** Sync-Status kann inkonsistent sein.

**Probleme:**
```javascript
// Entity A: sync_status = "new"
// Entity B (abhängig): sync_status = "exported"
// → Welche wird exportiert? Zusammen oder separat?

// Status nach Export nicht aktualisiert?
// → Nächster Export macht Duplikate?

// Feldmapping: Sind alle erforderlichen Felder für Moodle da?
// - Gesamtziel: Text oder Markdown?
// - Lernziele: Welches Format erwartet Moodle?
// - Aufgabentext: HTML oder Plain Text?
```

**Impact:**
- Moodle Import schlägt fehl
- Duplikate im Moodle
- Lehrkräfte verlieren Vertrauen

**Lösung erforderlich:**
- [ ] Export-Validierung: Alle erforderlichen Felder vorhanden?
- [ ] Format-Validierung: HTML? Markdown? Plain Text?
- [ ] Feldmapping dokumentiert?
- [ ] Dry-Run für Export vor echtem Export?
- [ ] Rollback-Möglichkeit nach fehlgeschlagenem Export?

---

## 🔧 ARCHITECTUR-PROBLEME

### 6. **State Management - Props Drilling & localStorage Konflikte**
**Problem:** Keine zentralisierte State Management, localStorage kann zu Synchronisationsproblemen führen.

**Szenarien:**
```javascript
// localStorage in mehreren Tabs:
// Tab 1 öffnet Einheit 5 → localStorage["workspace_view_5"] = "detail"
// Tab 2 öffnet Einheit 3 → localStorage["workspace_view_3"] = "struktur"
// Tab 1 wechselt zu Einheit 3 → localStorage sagt "struktur"
// Aber Tab 1 State sagt "detail"
// → Desynchronisierung

// useDraftState Problem:
// User bearbeitet Aufgabe in Tab 1
// User öffnet gleiche Aufgabe in Tab 2
// Beide Tabs speichern Draft in localStorage
// Welcher Draft ist aktuell?
```

**Impact:**
- Verwirrende UX
- Datenverlust durch überschreiben
- Mehrere offene Tabs sind problematisch

**Lösung erforderlich:**
- [ ] sessionStorage statt localStorage für Session-spezifische Daten
- [ ] localStorage nur für User Preferences
- [ ] Draft-System mit Timestamps/UUIDs
- [ ] Cross-Tab Synchronisierung (BroadcastChannel)

---

### 7. **Query Optimization & N+1 Problems**
**Problem:** Zu viele separate Queries, keine Optimierung.

**Beispiele im Workspace:**
```javascript
// 1. einheiten.list()
// 2. lernpakete.list() → filter by einheit_id (im Frontend!)
// 3. lernziele.list() → filter by paket_id (im Frontend!)
// 4. aufgaben.list() → filter by paket_id (im Frontend!)
// 5. themenfelder.list()
// 6. allgemeineAufgaben.list()
// 7. mappings.list() → filter by aufgabe_id (im Frontend!)
// 8. lernpaketAktivitaeten.list()
// 9. aktivitaetenKatalog.list()

// Wenn 100 Lernpakete × 10 Lernziele = 1000 Items in ein Query
// → Große Payload, lange Parsing-Zeit
```

**Impact:**
- Langsame Seite besonders beim Workspace-Load
- Viel Daten-Transfer
- Frontend macht Server's Job (Filtering)

**Lösung erforderlich:**
- [ ] Backend-Filter nutzen: `.filter({ einheit_id: X })`
- [ ] Nur notwendige Felder abfragen (kein `*`)
- [ ] Pagination für große Datasets
- [ ] Preloading-Strategie (Was wird wahrscheinlich gebraucht?)

---

### 8. **Error Handling Konsistenz**
**Problem:** Error Handling ist nicht überall konsistent.

**Beispiele:**
```javascript
// Workspace:
const deleteLernpaket = useMutation({
  mutationFn: async (id) => {
    // Keine try/catch, could throw
    for (const z of relZiele) await base44.entities.Lernziele.delete(z.id);
    // Wenn Fehler hier → Partial delete! Kein Rollback
    return base44.entities.Lernpakete.delete(id);
  },
  onSuccess: () => { /* ... */ },
  // Kein onError Handler sichtbar
});

// AllgemeineAufgaben:
const handleSubmit = async (formData) => {
  setIsSaving(true);
  try {
    // Was wenn Error?
    await base44.entities.AllgemeineAufgabe.create(formData);
  } catch (err) {
    toast.error('Error');
  } finally {
    setIsSaving(false);
  }
};
```

**Impact:**
- Inconsistent error messages
- User weiß nicht was schiefging
- Partial updates möglich

**Lösung erforderlich:**
- [ ] Transactional Updates (alle oder keine)
- [ ] Konsistente Error Messages
- [ ] Error Logging (wo gehen die Errors hin?)
- [ ] User-freundliche Error Messages statt technische Details

---

## 📊 DATENKONSISTENZ-PROBLEME

### 9. **Entity Relationships nicht klar definiert**
**Problem:** Nicht klar, welche Relationships obligatorisch vs. optional sind.

**Beispiele:**
```javascript
// Lernpaket
{
  einheit_id: "uuid", // FK - MUSS vorhanden sein?
  themenfeld_id: "uuid", // FK - Optional? Dann kann Paket verloren sein?
  titel_des_pakets: "", // Required?
  geschaetzte_dauer_minuten: null, // Optional - fallback auf "?"
}

// Aufgabenbausteine
{
  lernpaket_id: "uuid", // FK - was wenn Paket gelöscht?
  lernziel_id: "uuid", // FK - optional? manchmal null?
  aufgabentext_inhalt: "", // Required?
  erwartungshorizont_ki_prompt: "", // Required für KI-Betrieb?
}

// AllgemeineAufgabe
{
  anforderungsebene: "1 - Basis", // enum - alle Werte gültig?
  schwierigkeitsgrad: null, // optional - aber sollte für Export definiert sein?
}
```

**Impact:**
- UI muss überall null-checks machen
- Export zu Moodle schlägt fehl wenn Felder fehlen
- Bugs durch fehlende Validierung

**Lösung erforderlich:**
- [ ] Entity Schema Dokumentation: Required vs Optional
- [ ] Frontend Validierung: Alle erforderlichen Felder vor Save
- [ ] Backend Validierung: JSON Schema Enforcement
- [ ] Daten-Reparatur-Tool: Fehlende Felder füllen

---

### 10. **Status Workflows nicht dokumentiert**
**Problem:** Welche Status-Übergänge sind erlaubt? Nicht dokumentiert.

**Beispiele:**
```javascript
// Einheit
{
  freigabe_status: "In Planung" | "Freigegeben für Moodle"
  // Kann man von "Freigegeben" zurück zu "In Planung"?
  // Was passiert wenn man eine Einheit bearbeitet nachdem sie freigegeben wurde?
  // Automatisch auf "In Planung" zurück?
}

// Basismodule
{
  status: "Entwurf" | "Bereit für Moodle"
  // Ähnliche Fragen
}

// Aufgabenbausteine
{
  sync_status: "new" | "exported" | "modified"
  // "new" → "exported" ✓
  // "exported" → "new" ? (User macht Änderung - sollte auto "modified" werden?)
  // "modified" → "exported" ? (Was mit alten Export passieren?)
}
```

**Impact:**
- Verwirrende UX
- Export können Versionskonfikte haben
- User verstehen nicht, welche Operationen erlaubt sind

**Lösung erforderlich:**
- [ ] State Machine für jeden Status
- [ ] Dokumentation: Erlaubte Übergänge
- [ ] UI: Nur erlaubte Actions anzeigen
- [ ] Automatische Status-Updates bei Änderungen

---

## 🎨 UX/INTERFACE-PROBLEME

### 11. **Ladezeiten & Skeleton Konsistenz**
**Problem:** Unterschiedliche Loading States, nicht überall Skeletons.

**Probleme:**
```javascript
// Workspace: Hat SkeletonWorkspace ✅
// Aber: Nur für initial load. 
// Was wenn User Tab wechselt und data wird neu geladen?
// Kein Skeleton, UI "gefriert"

// AllgemeineAufgaben: Nutzt SkeletonLoader?
// AufgabeKompetenzMapping: Loading während Drag-and-Drop?
```

**Impact:**
- Verwirrend wenn Daten plötzlich verschwinden
- Sieht aus wie Fehler
- Schlechte Perceived Performance

**Lösung erforderlich:**
- [ ] Skeleton für JEDEN Query, nicht nur initial
- [ ] Loading State während Mutations
- [ ] Consistent Skeleton Höhe mit echtem Content
- [ ] Timeout: Wenn Loading > 3sec → Show Message

---

### 12. **Responsive Design Gaps**
**Problem:** Nicht alle Komponenten sind tablet-freundlich getestet.

**Ungetestete Bereiche:**
- [ ] AufgabeKompetenzMapping auf iPad (768px)
- [ ] WorkspaceDetailPanel: Mehrspaltig-Forms auf Mobile?
- [ ] LernlandkartePreview: Scrollbar auf kleinen Screens?
- [ ] StrukturBoardEmbedded: Kann man Drag-and-Drop mit Touch machen?
- [ ] Tables: Überlaufen sie auf Tablets?
- [ ] Modals: Zu groß für Mobile?

**Impact:**
- App unbenutzbar auf Tablets/Mobiles
- Lehrer nutzen IPads - die können nicht arbeiten

**Lösung erforderlich:**
- [ ] Real Device Testing (nicht nur Browser DevTools)
- [ ] Touch-freundliche Drag-and-Drop
- [ ] Modals auf Mobile als Sheet/Drawer
- [ ] Overflow-Text: Keine gestautchten Inhalte

---

### 13. **Empty States nicht überall konsistent**
**Problem:** Verschiedene Empty States in der App.

**Beispiele:**
```javascript
// PromptEmptyState: Schöne Amber Box ✅
// Aber: Andere Bereiche?
// - Keine Einheiten? Text + Icon
// - Keine Lernpakete? Einfach leer?
// - Keine Aufgaben? ?

// Konsistenz?
// - Gleiche Icons?
// - Gleiche Farben?
// - Gleiche Button Styles?
```

**Impact:**
- Unprofessionell wirkend
- User sind verwirrt

**Lösung erforderlich:**
- [ ] EmptyState Component (standard)
- [ ] Überall nutzen wo Listen leer sind
- [ ] Consistent copy: "Keine X vorhanden. [Create Button]"

---

## 🔐 SICHERHEIT & COMPLIANCE

### 14. **Authentication Edge Cases**
**Problem:** Edge Cases in Auth nicht gehandhabt.

**Szenarien:**
```javascript
// 1. User wird während Workspace geladen deauthenticated
// → App crashed oder zeigt falsche Daten?

// 2. Token expires während User schreibt
// → Speichern fehlgeschlagen, Draft verloren?

// 3. User A wird von Admin zu Reader downgraded
// → A hat noch Edit-Access in geöffneter Einheit?

// 4. User wird zu Projekt hinzugefügt (EinheitMembers)
// → Neue Permissions sofort verfügbar? Oder nach Refresh?
```

**Impact:**
- Sicherheitslöcher
- Datenverlust
- Verwirrte User

**Lösung erforderlich:**
- [ ] Token Refresh handling
- [ ] Permissions cached - wie lange?
- [ ] Permission Changes real-time Notification
- [ ] Session Timeout Handling

---

### 15. **Data Privacy & DSGVO**
**Problem:** Keine sichtbaren Privacy-Kontexte.

**Fragen:**
- [ ] Wer sieht welche Student Daten?
- [ ] Können Lehrkräfte Daten exportieren?
- [ ] Audit Trail: Wer griff auf welche Daten zu?
- [ ] Lösch-Anforderungen: Kann man alle Daten eines Users löschen?
- [ ] Encryption: Sind Inhalte verschlüsselt?

**Impact:**
- DSGVO-Verstöße möglich
- Schule hat Legal Risk
- User Vertrauen fehlt

**Lösung erforderlich:**
- [ ] Privacy Policy & Data Handling dokumentiert
- [ ] DSGVO-Compliance Checklist
- [ ] Data Export Funktion
- [ ] Data Deletion (inkl. Audit Trail)

---

## 📈 PERFORMANCE

### 16. **Bundle Size & Imports**
**Problem:** Zu viele Dependencies?

**Fragen:**
- [ ] Wie groß ist der Final Bundle?
- [ ] Sind alle Libraries nötig? (z.B. three.js für 3D?)
- [ ] Tree Shaking konfiguriert?
- [ ] Code Splitting für Routes?
- [ ] Dynamic Imports für Heavy Components?

**Impact:**
- Langsam im Browser
- Besonders auf mobilen Netzwerken

---

### 17. **Rendering Performance**
**Problem:** Unnötige Re-renders?

**Fragen:**
- [ ] useMemo/useCallback überall wo nötig?
- [ ] React DevTools Profiler: Wo sind Hot Spots?
- [ ] Komponenten: Sind sie zu groß?
- [ ] Workspace Sidebar: Kann Hunderte von Items sein?
- [ ] Virtual Scrolling für lange Listen?

**Impact:**
- App wird langsam
- Bad User Experience

---

## 🧪 TESTING & QA

### 18. **Test Coverage**
**Problem:** Unklar, welche Szenarien getestet sind.

**Fragen:**
- [ ] Unit Tests: Vorhanden? Coverage %?
- [ ] Integration Tests: Workflow end-to-end?
- [ ] E2E Tests: Komplexe User Journeys?
- [ ] Cross-browser Testing: Chrome, Firefox, Safari?
- [ ] Accessibility Testing: a11y Score?
- [ ] Load Testing: Wie viele User gleichzeitig?

**Impact:**
- Unbekannte Bugs in Production
- Regressions nach Updates

---

### 19. **Known Limitations & Workarounds**
**Problem:** Sind alle bekannten Limationen dokumentiert?

**Fragen:**
- [ ] Maximale Anzahl Lernpakete pro Einheit?
- [ ] Maximale Aufgabentext-Länge?
- [ ] Drag-and-Drop: Funktioniert mit allen Browsern?
- [ ] Broadcast Channel: Funktioniert überall?
- [ ] IE11 Support: Notwendig?

**Impact:**
- User stoßen auf Limits und sind überrascht
- Bug Reports für nicht-Bugs

---

## 🚀 DEPLOYMENT & OPERATIONS

### 20. **Environment Configuration**
**Problem:** Wie werden verschiedene Umgebungen konfiguriert?

**Fragen:**
- [ ] Dev/Staging/Production: Verschiedene Configs?
- [ ] API Endpoints: Hardcoded oder konfigurierbar?
- [ ] Feature Flags: Feature Rollout möglich?
- [ ] Error Logging: Wo gehen Errors hin?
- [ ] Monitoring: Uptime, Performance Metrics?

**Impact:**
- Schwierig zu debuggen
- Kann nicht schnell Features an/ausschalten

---

### 21. **Database & Scaling**
**Problem:** Skalierbarkeit der Datenbankqueries?

**Fragen:**
- [ ] Indexes auf Foreign Keys?
- [ ] Query Performance Testing mit großen Datasets?
- [ ] Pagination: Implementiert?
- [ ] Caching: Redis für häufige Queries?
- [ ] Backup Strategy: Wie oft, wo?

**Impact:**
- Database wird zum Bottleneck
- Datenverlust bei Crash

---

## ✅ PRIORISIERTE AKTIONSLISTE

### 🔴 **KRITISCH (Diese Woche)**
1. Backend RBAC Validierung für alle Entity Operations
2. Cascade Delete Pattern für alle Foreign Keys
3. Audit Trail für alle Änderungen
4. Transaktionale Updates (z.B. beim Löschen)

### 🟠 **WICHTIG (Diese 2 Wochen)**
5. Status Workflow Dokumentation + State Machines
6. Query Optimization (Filter im Backend)
7. Soft Delete für wichtige Entities
8. Moodle Export Validierung & Format Check

### 🟡 **SOLLTE (Diese 4 Wochen)**
9. Cross-Tab Synchronisierung Fix
10. Responsive Design Audit & Mobile Testing
11. Performance Profiling & Optimization
12. Test Coverage Assessment

### 🟢 **GUT-ZU-HABEN (Later)**
13. Feature Flags
14. Advanced Error Logging
15. Real-time Sync (WebSockets)
16. Offline Mode Support

---

## 📋 AUDIT CHECKLISTE

- [ ] Alle Cascade Delete Paths getestet
- [ ] Backend RBAC auf 100% der Operationen
- [ ] Concurrency Scenarios manuell durchgespielt
- [ ] Moodle Export mit echtem Moodle getestet
- [ ] Real Device Testing (iPad, Mobile)
- [ ] Empty States überall konsistent
- [ ] Error Messages User-freundlich
- [ ] Performance Baseline gemessen
- [ ] Security Review von Fachperson durchgeführt
- [ ] DSGVO Compliance Checklist abgehakt

---

## 🎯 NÄCHSTE SCHRITTE

1. **Diese Woche Kickoff:** Welche Items sind wirklich Critical?
2. **Priorisierung:** Was macht die App kaputt wenn es falsch ist?
3. **Task Breakdown:** Jedes Issue in konkrete Tickets
4. **Testing Strategy:** Wie prüfen wir ob Fix funktioniert?
5. **Timeline:** Wann will man diese Fixes live haben?

Soll ich einen spezifischen Bereich zuerst angehen?