# MBK-Abstimmung · Schema-Erweiterung für Schritt 5 (Lehrkraft-UX)

**Status:** 🟡 Entwurf zur Abstimmung mit der MBK-Entwicklung
**Stand:** 2026-05-08
**Vorgeschlagene Schema-Version:** **1.1.0** (Minor-Bump — additive + ablösende Änderung)
**Vorgänger:** `docs/mbk-integration.md` (v1.0.1, abgenommen 2026-05-08)
**Antwortfrist (Vorschlag):** _zu vereinbaren_

---

## 1. Kontext und Anlass

Während der UX-Detailplanung von Schritt 5 (Frontend-Implementierung der
KI-Briefing-Felder im Pool-Manager) haben wir auf unserer Seite festgestellt,
dass die in Schema **v1.0.1** spezifizierten Felder `lehrer_notiz` (Sandwich)
und `visuelle_vorgabe` für die didaktische Zielgruppe (Lehrkräfte ohne
KI-Erfahrung) **zu offen und zu unstrukturiert** sind.

Praxis-Beobachtung:

- Eine Lehrkraft, die ein leeres Miniquiz anlegt und es von der MBK füllen
  lässt, weiß oft nicht, welche Information die KI braucht. Sie schreibt
  entweder gar nichts oder etwas wie *„mach was zum Thema Steigung"*.
- Das Sandwich-Modell (Anweisung + Beispiel) funktioniert bei
  **AllgemeineAufgaben** (offene Sandbox-Aufgaben) gut, aber bei
  **Standard-Aktivitäten** (Miniquiz, Lückentext, Begriffe zuordnen, …)
  greift es zu kurz, weil der Aktivitätstyp selbst schon viel Struktur
  vorgibt (Anzahl Fragen, Schwierigkeit, Wortarten, …).

Wir möchten daher das Schema **v1.1.0** so anpassen, dass es zwei klar
getrennte Briefing-Modelle bedient — eines für Standard-Aktivitäten mit
typabhängigen Mini-Fragenkatalogen, eines für offene Aufgaben mit drei
festen Fragen. Beide werden in einem einheitlichen Container-Feld
`ki_briefing` zusammengeführt, das `lehrer_notiz` + `visuelle_vorgabe`
ablöst.

Dieses Dokument beschreibt die geplanten Änderungen, bittet um Freigabe
oder Gegenvorschläge **vor der Implementierung**.

---

## 2. Was sich für die MBK ändert (Kurzfassung)

| Aspekt | v1.0.1 (heute) | v1.1.0 (Vorschlag) |
|---|---|---|
| Container-Feld | `lehrer_notiz` + `visuelle_vorgabe` (zwei separate Objekte) | **ein** Objekt `ki_briefing` |
| Inhalt bei Standard-Aktivität | freier Text (`anweisung` + `beispiel`) | **typabhängiger Mini-Fragenkatalog** (siehe §4) |
| Inhalt bei AllgemeineAufgabe (offen) | freier Text + visuelle Vorgabe | **drei feste Felder**: `lernziel`, `funktionsweise`, `visuelle_vorlage` |
| Neuer Marker | — | `erstellungs_modus`: `'manuell'` \| `'ki'` (zeigt der MBK, ob sie überhaupt etwas tun soll) |
| Alt-Text-Logik | `alt_text_required` (abgeleitet) | unverändert — bleibt erhalten |
| Bild-Upload | nur als URL in `materialien[]` | zusätzlich strukturiert in `ki_briefing.visuelle_vorlage.bild_url` |

**Breaking Change?** Ja — `lehrer_notiz` und `visuelle_vorgabe` werden im
Payload nicht mehr ausgegeben, sondern durch `ki_briefing` ersetzt. Da v1.0.1
noch nicht in Produktion lief und das Pool-Manager-UI noch keine Eingaben
sammelt, gibt es **keine Bestandsdaten zu migrieren**. Aus MBK-Sicht ist es
trotzdem eine Schema-Anpassung — daher Minor-Bump auf 1.1.0.

---

## 3. Der neue `erstellungs_modus`-Marker

Auf jeder Aktivität / Aufgabe steckt jetzt ein expliziter Marker, der der
MBK sagt, was zu tun ist:

```jsonc
"blueprint": {
  "aktivitaets_typ": "Miniquiz",
  "aktivitaet_id": "aktivitaet:<uuid>",
  "erstellungs_modus": "ki",         // "manuell" | "ki"
  "ki_briefing": { /* nur befüllt wenn erstellungs_modus === "ki" */ },
  "feldwerte_vorab": { /* nur befüllt wenn erstellungs_modus === "manuell" */ }
}
```

**Verhaltensregeln für die MBK:**

| `erstellungs_modus` | Verhalten der MBK |
|---|---|
| `"manuell"` | Lehrkraft hat die Aufgabe selbst ausgearbeitet (Master-Aufgaben, Klone, fertige Inhalte). MBK übernimmt 1:1, **erfindet nichts dazu**, formatiert nur für Moodle. `ki_briefing` ist `null`. |
| `"ki"` | Lehrkraft hat die Aufgabe bewusst leer gelassen und einen Auftrag erteilt. MBK erstellt den Inhalt vollständig auf Basis von `ki_briefing` + System-Kontext (C-Global). `feldwerte_vorab` ist `null` oder leer. |

**Vorteil für die MBK:** Eindeutige Steuerung, kein Raten mehr. Die heute
in `MBKGlobalPrompt(global_leere_aktivitaeten)` formulierte Konvention
*„leere Aktivität = KI-Auftrag"* wird damit explizit im Payload
ausgedrückt statt nur in der Konvention.

---

## 4. `ki_briefing` für Standard-Aktivitäten (typabhängige Mini-Fragen)

Bei den Standard-Aktivitätstypen rendert das Pool-Manager-UI je nach Typ
einen kleinen Fragenkatalog. Die Antworten werden als strukturiertes Objekt
unter `ki_briefing.standard` an die MBK geliefert.

**Allgemeine Struktur:**

```jsonc
"ki_briefing": {
  "variant": "standard",
  "standard": {
    "schwerpunkt": "...",        // Pflicht — was soll erreicht werden?
    "parameter": {                // typspezifische optionale Parameter
      "anzahl_fragen": 5,
      "schwierigkeit": "mittel",
      "...": "..."
    }
  }
}
```

### 4.1 Mini-Fragenkataloge pro Aktivitätstyp (Vorschlag)

> Quelle der Aktivitätstyp-Namen: `AktivitaetenKatalog.name` (Pool-Manager).

#### Miniquiz / Multiple-Choice / Test

```jsonc
"ki_briefing": {
  "variant": "standard",
  "standard": {
    "schwerpunkt": "Steigung in Linearen Funktionen ablesen und berechnen.", // Pflicht
    "parameter": {
      "anzahl_fragen": 5,                // optional, sonst entscheidet MBK
      "schwierigkeit": "mittel",         // "leicht" | "mittel" | "schwer" | "gemischt"
      "schwerpunktbereich": null         // optional, freier Text für Eingrenzung
    }
  }
}
```

#### Lückentext

```jsonc
"ki_briefing": {
  "variant": "standard",
  "standard": {
    "schwerpunkt": "Fachbegriffe der Zellbiologie.",
    "parameter": {
      "anzahl_luecken": 8,               // optional
      "wortarten_fokus": ["Substantive", "Verben"],  // optional
      "themenbereich": null
    }
  }
}
```

#### Begriffe zuordnen

```jsonc
"ki_briefing": {
  "variant": "standard",
  "standard": {
    "schwerpunkt": "Englisch-Vokabeln Klasse 7, Unit 3.",
    "parameter": {
      "anzahl_paare": 10,                // optional
      "themenbereich": null              // optional
    }
  }
}
```

#### Sortier- / Reihenfolge-Aufgabe

```jsonc
"ki_briefing": {
  "variant": "standard",
  "standard": {
    "schwerpunkt": "Stationen der industriellen Revolution.",
    "parameter": {
      "anzahl_elemente": 6,              // optional
      "sortierkriterium": "zeitlich"     // optional, freier Text
    }
  }
}
```

#### Erklärtext / Input / Video-Beschreibung

```jsonc
"ki_briefing": {
  "variant": "standard",
  "standard": {
    "schwerpunkt": "Was ist eine Hypotenuse?",
    "parameter": {
      "kernpunkte": [                    // optional
        "Definition",
        "Lage im rechtwinkligen Dreieck",
        "Beispiel"
      ],
      "wortlimit_override": null         // optional, sonst Default aus C-Global
    }
  }
}
```

**Hinweis:** Felder mit `null` oder `[]` zeigen explizit „Lehrkraft hat
nichts angegeben — entscheide selbst nach C-Global". Felder mit Wert sind
**bindend** und gehen vor C-Global-Defaults.

### 4.2 Erweiterungspolitik

Der Pool-Manager hat aktuell ~10 Aktivitätstypen, aber wir wollen pragmatisch
starten. Vorschlag:

- **Phase 1 (Schritt 5):** Wir liefern Mini-Fragenkataloge für die fünf
  oben genannten Typen aus.
- **Phase 2 (später):** Weitere Typen (z.B. Image-Labeling, Sortierliste mit
  Bildern) bekommen ihre eigenen Mini-Kataloge, sobald die MBK sie
  technisch bedient.
- Aktivitätstypen ohne eigenen Mini-Katalog fallen auf einen **Default-
  Fragenkatalog** zurück (`schwerpunkt` Pflicht, keine Parameter).

---

## 5. `ki_briefing` für AllgemeineAufgaben (offene Sandbox)

Hier behalten wir das Sandwich-Prinzip aus v1.0.1 in der Sache bei,
übersetzen es aber in **drei feste, lehrkraftverständliche Felder** statt
„anweisung" und „beispiel".

```jsonc
"ki_briefing": {
  "variant": "offen",
  "offen": {
    "lernziel": "Die Schüler sollen Steigungsdreiecke aus Graphen ablesen können.",   // Pflicht
    "funktionsweise": "Die Aufgabe zeigt einen Graphen. Die Schüler sollen das Steigungsdreieck einzeichnen und die Steigung berechnen.",  // Pflicht
    "visuelle_vorlage": {                                                              // optional
      "bild_url": "https://medien.example.org/uploads/aufgabe-steigung.png",
      "beschreibung": "So ähnlich soll es aussehen — wichtig ist die markierte y-Achse."
    }
  }
}
```

### 5.1 Mapping zur alten v1.0.1-Struktur

| Alt (v1.0.1) | Neu (v1.1.0) |
|---|---|
| `lehrer_notiz.anweisung` | `ki_briefing.offen.funktionsweise` |
| `lehrer_notiz.beispiel` | entfällt — durch Bild-Upload ersetzt (siehe `visuelle_vorlage`) |
| `visuelle_vorgabe.beschreibung` | `ki_briefing.offen.visuelle_vorlage.beschreibung` |
| `visuelle_vorgabe.format` | entfällt im Payload — wird intern abgeleitet, MBK bekommt nur `bild_url` |
| _(neu)_ | `ki_briefing.offen.lernziel` (didaktische Frage *„Was sollen sie lernen?"*) |
| _(neu)_ | `ki_briefing.offen.visuelle_vorlage.bild_url` (Lehrkraft kann Foto/Screenshot hochladen) |

Pflichtfelder sind `lernziel` **und** `funktionsweise`. Beides muss von der
Lehrkraft beantwortet werden, sonst gilt die Aufgabe als unvollständig
(Pre-Flight-Block).

### 5.2 Alt-Text-Logik (unverändert ggü. v1.0.1)

Wenn die MBK auf Basis von `visuelle_vorlage` einen visuellen Inhalt
**generiert**, liefert sie den Alt-Text wie in v1.0.1 §4.2 spezifiziert
zurück. Die Logik bleibt 1:1 erhalten.

---

## 6. Auswirkungen auf C-Local (vollständiges Beispiel)

**Vorher (v1.0.1, Standard-Aktivität Miniquiz):**

```jsonc
{
  "blueprint": {
    "aktivitaets_typ": "Miniquiz",
    "aktivitaet_id": "aktivitaet:abc",
    "lehrer_notiz": {
      "anweisung": "Erstelle 5 Fragen zum Steigungsdreieck.",
      "beispiel":  "So wie in der letzten Einheit zu Funktionen."
    },
    "visuelle_vorgabe": { "format": "none", "alt_text_required": false },
    "feldwerte_vorab": { /* … */ }
  }
}
```

**Nachher (v1.1.0, gleiche Aktivität, KI-Modus):**

```jsonc
{
  "blueprint": {
    "aktivitaets_typ": "Miniquiz",
    "aktivitaet_id": "aktivitaet:abc",
    "erstellungs_modus": "ki",
    "ki_briefing": {
      "variant": "standard",
      "standard": {
        "schwerpunkt": "Steigungsdreieck — Ablesen und Berechnen.",
        "parameter": {
          "anzahl_fragen": 5,
          "schwierigkeit": "mittel",
          "schwerpunktbereich": null
        }
      }
    },
    "feldwerte_vorab": null
  }
}
```

**Nachher (v1.1.0, gleiche Aktivität, manueller Modus):**

```jsonc
{
  "blueprint": {
    "aktivitaets_typ": "Miniquiz",
    "aktivitaet_id": "aktivitaet:abc",
    "erstellungs_modus": "manuell",
    "ki_briefing": null,
    "feldwerte_vorab": { /* fertige Master-Aufgaben + Klone */ }
  }
}
```

---

## 7. Auswirkungen auf den `system_context_hash`

Schema-Änderungen am Payload-Format selbst werden **nicht** über den
`system_context_hash` invalidiert (der ist für inhaltliche Konfig wie
Schul-Nomenklatur und Prompts gedacht). Die MBK erkennt das neue Schema an
`meta.schema_version === "1.1.0"`. Solange `system_context_hash` stabil
bleibt, muss die MBK ihren System-Kontext-Cache nicht erneuern.

---

## 8. Was die MBK prüfen / freigeben sollte

Bitte gebt uns Rückmeldung zu den folgenden Punkten:

1. **Konsolidierung** `lehrer_notiz` + `visuelle_vorgabe` → `ki_briefing` —
   technisch und didaktisch in Ordnung?
2. **Diskriminator** `ki_briefing.variant` (`"standard"` | `"offen"`) —
   passende Modellierung, oder bevorzugt ihr eine andere Diskriminierung
   (z.B. anhand `aktivitaets_typ`)?
3. **Mini-Fragenkataloge** der fünf Aktivitätstypen — sind die
   vorgeschlagenen Parameter (`anzahl_fragen`, `schwierigkeit`,
   `wortarten_fokus`, …) für die MBK gut handhabbar? Fehlt etwas, das ihr
   für saubere Generierung braucht?
4. **Zusätzliche Typen** — gibt es Aktivitätstypen, die nicht in unserer
   Phase-1-Liste stehen, für die ihr aber dringend einen eigenen Mini-
   Katalog braucht?
5. **`erstellungs_modus`-Marker** — explizit im Payload (Vorschlag) oder
   wollt ihr lieber implizit (z.B. *„`ki_briefing` ist gesetzt → KI-Modus,
   sonst manuell"*)? Wir bevorzugen explizit, weil es Fehler bei `null`-
   vs. `{}`-Auslegungen ausschließt.
6. **Default-Fragenkatalog** für nicht spezifizierte Typen (Phase-2-Typen) —
   reicht euch ein einzelnes Pflichtfeld `schwerpunkt`, oder wollt ihr ein
   anderes Minimum?
7. **Bonus-Idee „1 Master → MBK erzeugt 3–4 Varianten":** Wir parken sie
   bewusst als eigenes späteres Ticket. Für die MBK schon jetzt relevant
   (z.B. weil ihr ein Flag dafür reserviert haben möchtet)?

---

## 9. Zeitplan (Vorschlag)

| Schritt | Zeitfenster | Beteiligte |
|---|---|---|
| 1. MBK-Review dieses Dokuments | _(zu vereinbaren)_ | MBK-Team |
| 2. Klärungsrunde / Anpassungen | _(zu vereinbaren)_ | beide Teams |
| 3. Freigabe Schema v1.1.0 | _(zu vereinbaren)_ | MBK-Lead, App-Lead |
| 4. Implementierung Pool-Manager (Schritt 5) | nach Freigabe | App-Team |
| 5. Implementierung MBK-Side-Adapter | parallel nach Freigabe | MBK-Team |
| 6. Schema-Doku-Update `mbk-integration.md` → v1.1.0 | nach Freigabe | App-Team |

**Wichtig:** Wir starten Schritt 5 erst nach Freigabe. Bis dahin bleibt das
Pool-Manager-UI auf dem Stand vor Schritt 5.

---

## 10. Abnahme

| Rolle | Name | Datum | Status |
|---|---|---|---|
| App-Team | App-Team-Lead | 2026-05-08 | ✅ (Vorschlag eingereicht) |
| MBK-Entwicklung | MBK-Entwicklungsleitung |  | ☐ |
| Planungs-/Didaktik-Lead | _(zu ergänzen)_ |  | ☐ |

---

## 11. Änderungshistorie dieses Dokuments

| Version | Datum | Änderung |
|---|---|---|
| 0.1 | 2026-05-08 | Initialer Entwurf zur MBK-Abstimmung (Schritt 5) |