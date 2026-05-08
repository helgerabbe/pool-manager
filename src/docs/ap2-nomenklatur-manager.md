# AP2 · Nomenklatur-Manager (Schul-Stammdaten)

**Ticket:** #MBK-AP2-NOMENKLATUR
**Status:** Design-Spec — bereit für Implementierungs-Freigabe
**Stand:** 2026-05-08
**Geltungsbereich:** Admin-Bereich → Schul-Stammdaten → Tab „Nomenklatur".
**Vorgelagert:** [docs/mbk-integration.md](./mbk-integration.md) §3 (Payload C-Global).

> Dieses Dokument spezifiziert die Eingabemaske und das Datenformat für die
> **schulweite Sprache** ("Sprache der Schule"), die in jeden C-Global-
> Payload an die MBK eingewoben wird. Damit Lehrkräfte einer Schule eine
> einheitliche Notation, Terminologie und Stilregeln durchsetzen können —
> ohne dass die KI sie raten muss.

---

## 1. Zielsetzung

**Problem:** Die MBK generiert Aufgaben, die fachlich korrekt sind, aber
gegen schulinterne Konventionen verstoßen — z. B. `y = mx + b` statt
`y = m·x + n`, `*` statt `·`, oder Erzählzeit Perfekt statt Präteritum.

**Lösung:** Die Schul-Stammdaten erhalten ein flexibles Schlüssel-Wert-
System pro Fach. Die Konventionen werden in jedem System-Prompt der MBK
mitgeführt, sodass die KI sie konsequent anwendet.

**Designprinzip:** **Keine festen Felder.** Jede Fachschaft definiert
ihre eigenen Schlüssel — was in Mathe „y_achsenabschnitt" heißt, ist in
Deutsch „zitierweise". Die UI ist für alle Fächer identisch.

---

## 2. UI-Layout

### 2.1 Wireframe

```
┌─────────────────────────────────────────────────────────────────────┐
│ Schul-Stammdaten · Nomenklatur                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ Fach: [ Mathematik ▼ ]  ← Dropdown (alle aktiven LookupFaecher)     │
│                                                                     │
│ ┌─ Definitionen ─────────────────────────────────────────────────┐  │
│ │ Begriff / Variable        │ Konvention / Schreibweise          │  │
│ │ ─────────────────────────  ─────────────────────────────────── │  │
│ │ Lineare Funktion          │ y = m·x + n                  [✕]   │  │
│ │ Y-Achsenabschnitt         │ Variable n (nicht b)         [✕]   │  │
│ │ Punkt-Notation            │ P(x|y), Trennzeichen "|"     [✕]   │  │
│ │ Multiplikationszeichen    │ · (Mittelpunkt, kein × oder *) [✕] │  │
│ │ ─────────────────────────  ─────────────────────────────────── │  │
│ │ [+ Eintrag hinzufügen]                                         │  │
│ └────────────────────────────────────────────────────────────────┘  │
│                                                                     │
│ ┌─ Globaler Stil (Mathematik) ──────────────────────────────────┐   │
│ │ Ergebnisse immer auf zwei Nachkommastellen runden.            │   │
│ │ Bei Brüchen immer die gekürzte Form verwenden.                │   │
│ │                                                               │   │
│ └───────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                                  [Abbrechen]  [Speichern]           │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Komponenten-Verhalten

| Komponente | Verhalten |
|---|---|
| **Fach-Dropdown** | Listet alle aktiven `LookupFaecher`. Wechsel verwirft ungespeicherte Änderungen mit Bestätigung (`UnsavedChangesModal`). |
| **Definitionen-Grid** | Zwei Spalten + Lösch-Icon. Beide Spalten sind Freitext (kein Enum), damit jede Fachschaft eigene Begriffe anlegen kann. |
| **„+ Eintrag hinzufügen"** | Fügt eine leere Zeile am Ende ein und fokussiert das erste Feld. |
| **Globaler Stil** | Einzelnes mehrzeiliges Textfeld, max. 2.000 Zeichen. Markdown erlaubt. |
| **Speichern** | Schreibt den ganzen Fach-Datensatz in einem Roundtrip. Touched den `system_context_hash`. |
| **Berechtigung** | Sichtbar nur für `admin` / `Administrator` / `Fachschaftsleitung` ihres Fachs. Andere Rollen sehen Read-Only-Ansicht. |

### 2.3 Komponentenstruktur

```
components/admin/nomenklatur/
  NomenklaturManagerView.jsx       (Tab-Wrapper, Fach-Dropdown, Save-Logik)
  NomenklaturFachEditor.jsx        (Definitionen-Grid + globaler Stil pro Fach)
  NomenklaturDefinitionRow.jsx     (eine Zeile im Grid)
```

Begründung der Aufteilung: `NomenklaturFachEditor` lässt sich später isoliert
in einem Wizard wiederverwenden. `NomenklaturDefinitionRow` ist dünn genug,
um direkt in einer ListReorder-Komponente eingesetzt zu werden, falls wir
später Drag&Drop anbieten.

---

## 3. Datenmodell

### 3.1 Neue Entity: `SchulNomenklatur`

```jsonc
{
  "name": "SchulNomenklatur",
  "type": "object",
  "description": "Schulweit gültige Konventionen pro Fach. Wird in jeden C-Global-Payload an die MBK eingewoben (siehe docs/mbk-integration.md §3).",
  "properties": {
    "fach": {
      "type": "string",
      "description": "Fach-Name aus LookupFaecher (z. B. 'Mathematik'). Pro Fach existiert genau ein Datensatz."
    },
    "conventions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "key":   { "type": "string", "description": "Lesbarer Begriff, z. B. 'Y-Achsenabschnitt'." },
          "value": { "type": "string", "description": "Schulweite Schreibweise, z. B. 'Variable n (nicht b)'." }
        },
        "required": ["key", "value"]
      },
      "default": []
    },
    "global_style": {
      "type": "string",
      "description": "Übergreifende Stilregel für dieses Fach (Markdown, max. 2000 Zeichen)."
    },
    "ist_aktiv": {
      "type": "boolean",
      "default": true,
      "description": "Inaktive Fach-Datensätze werden nicht in den C-Global-Payload geschrieben."
    }
  },
  "required": ["fach"],
  "rls": {
    "read":   {},
    "create": { "user_condition": { "role": "admin" } },
    "update": { "user_condition": { "role": "admin" } },
    "delete": { "user_condition": { "role": "admin" } }
  }
}
```

> **Anwendungsseitige Eindeutigkeit:** `fach` muss unique sein — wird in
> der `updateSchulNomenklaturSecure`-Funktion durchgesetzt (gleiches
> Pattern wie `updateMBKGlobalPromptSecure`).

> **Warum eine eigene Entity statt `Systemeinstellungen`?** Die Datensätze
> werden pro Fach von verschiedenen Fachschaftsleitungen gepflegt → eigene
> Records mit eigenen RLS-Hooks sind sauberer als ein einziger JSON-Blob.

### 3.2 Output im C-Global-Payload

```jsonc
"schul_nomenklatur": {
  "Mathematik": {
    "conventions": [
      { "key": "Lineare Funktion",    "value": "y = m·x + n" },
      { "key": "Y-Achsenabschnitt",   "value": "Variable n (nicht b)" },
      { "key": "Punkt-Notation",      "value": "P(x|y)" },
      { "key": "Multiplikationszeichen","value": "· (Mittelpunkt)" }
    ],
    "global_style": "Ergebnisse auf 2 Nachkommastellen runden. Brüche gekürzt."
  },
  "Deutsch": {
    "conventions": [
      { "key": "Erzählzeit",  "value": "Präteritum" },
      { "key": "Zitierweise", "value": "(Z. [Zeilennummer])" },
      { "key": "Einleitungsschema", "value": "TATTE: Titel, Autor, Thema, Textart, Erscheinungsjahr" }
    ],
    "global_style": "Nominalstil vermeiden. Aktivierende Verben. Neue Rechtschreibung."
  }
}
```

Nur Fächer mit `ist_aktiv = true` UND mindestens einer Convention ODER
einem `global_style` werden ausgegeben. Leere Fächer fallen raus, damit
die MBK keine leeren Blöcke verarbeiten muss.

---

## 4. Backend

### 4.1 Neue Function: `updateSchulNomenklaturSecure`

**Pattern analog zu `updateMBKGlobalPromptSecure`.**

| Aspekt | Details |
|---|---|
| **Auth** | `admin` ODER `Fachschaftsleitung` (für eigenes Fach). |
| **Payload** | `{ fach, conventions, global_style, ist_aktiv }` |
| **Logik** | Upsert über `fach` als Schlüssel. Wenn Record existiert → update; sonst create. |
| **Validierung** | `conventions[].key` und `value` jeweils 1–200 Zeichen. `global_style` max. 2.000 Zeichen. Max. 100 Conventions pro Fach. |
| **Side-Effect** | Touched indirekt den `system_context_hash` (s. §5), weil `SchulNomenklatur.updated_date` in den Hash einfließt. |

### 4.2 Erweiterung von `useSchulStammdaten`

Der bestehende Hook (`hooks/useSchulStammdaten.js`) wird um
`nomenklatur_pro_fach` erweitert: lädt alle aktiven `SchulNomenklatur`-
Records und gruppiert sie nach `fach` — analog zu `useMBKGlobalPrompts`.

---

## 5. System-Context-Hash

**Mechanik:** Vor jedem Versand des C-Global-Payloads berechnet das Backend:

```
hash = sha1(
  JSON.stringify({
    schul_stammdaten,
    schul_nomenklatur,
    global_prompts: globalPrompts.filter(p => p.ist_aktiv).sort(byKey),
    operatoren_liste,
    wortlimit_regeln,
    guardrail_feedback,
  })
).slice(0, 16)
```

Dieser Hash landet als `meta.system_context_hash` im Payload an die MBK.
Die MBK cached den System-Prompt sessionweise unter diesem Hash. Sobald
sich irgendetwas am Regelwerk ändert (Convention bearbeitet, globalPrompt
deaktiviert, Stammdaten geändert), kippt der Hash → MBK lädt neu.

**Implementierung:** Eine reine Helper-Funktion in `lib/systemContextHash.js`
— deterministisch, ohne Side-Effects, gut testbar.

---

## 6. Tabu-Liste (Was wir bewusst nicht tun)

| Ablehnung | Begründung |
|---|---|
| ❌ Festes Schema mit fixen Mathe-/Deutsch-Feldern | Schule kann eigene Begriffe anlegen, ohne dass wir das Datenmodell anfassen. |
| ❌ Nomenklatur pro Einheit/Lehrkraft | Das ist die **Sprache der Schule** — wenn jede Lehrkraft eigene Notation hat, gibt es schulweit keine Konsistenz mehr. |
| ❌ Auto-Migration aus bestehenden Daten | Es gibt keine Bestandsdaten, die migriert werden könnten. Schulen starten mit leerer Liste. |
| ❌ KI-gestützte Vorschläge für Conventions | Wäre Feature-Creep für AP2. Kann später ergänzt werden. |

---

## 7. Implementierungs-Schritte (für AP2)

1. **Entity** `entities/SchulNomenklatur.json` anlegen.
2. **Backend** `functions/updateSchulNomenklaturSecure.js` (Pattern: `updateMBKGlobalPromptSecure`).
3. **Helper** `lib/systemContextHash.js` (rein, testbar).
4. **Komponenten:**
   - `components/admin/nomenklatur/NomenklaturManagerView.jsx`
   - `components/admin/nomenklatur/NomenklaturFachEditor.jsx`
   - `components/admin/nomenklatur/NomenklaturDefinitionRow.jsx`
5. **Hook-Erweiterung** `hooks/useSchulStammdaten.js` um `nomenklatur_pro_fach`.
6. **Einbau** in `pages/AdminSettings` als neuer Tab unter Schul-Stammdaten.
7. **Tests:**
   - `lib/__tests__/systemContextHash.test.js` (Determinismus + Sortier-Stabilität).
   - Manuell: zwei Conventions anlegen → Hash ändert sich → Speichern → Hash stabil.

---

## 8. Abnahme

| Rolle | Status |
|---|---|
| App-Team | ☐ |
| MBK-Entwicklung | ☐ |
| Didaktik-/Planungs-Lead | ☐ |