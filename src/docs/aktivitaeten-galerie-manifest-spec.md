# Spezifikation: Manifest-Erweiterung der Aktivitäten-Galerie (v2)

**An:** MBK-Team
**Von:** PoolManager
**Betrifft:** `galerie/aktivitaeten.json` im Repo `IGS-Seevetal/Poolzeit`
**Stand:** 2026-07-03

## Ziel

Der PoolManager erhält eine neue Aktivität **„Aktivitätengalerie"** (Phase Übung). Lehrkräfte wählen dort eine kreative Aktivität aus der Galerie (z. B. Mindmap, Wortnetz), sehen die Anforderungen und liefern einen Übergabetext. An die MBK geht beim Export nur ein schlankes Paket: **Galerie-ID + Übergabetext**. Die MBK baut die Aktivität auf Basis der Galerie-Vorlage selbst zusammen.

Damit das funktioniert, braucht das Manifest (`aktivitaeten.json`) pro Aktivität **drei neue Felder** und **zwei verbindliche Regeln**.

## 1. Neue Felder pro Aktivitäts-Eintrag

Bestehende Felder (`id`, `name`, `typ`, `kategorie`, `kontrolle`, `eingabe`, `kurzbeschreibung`) bleiben unverändert. Neu hinzu kommen:

| Feld | Typ | Pflicht | Bedeutung |
|---|---|---|---|
| `galerie_sichtbar` | boolean | ja (für Galerie-Einträge) | `true` = erscheint in der Lehrer-Galerie des PoolManagers. Standardaktivitäten (text, video, quiz, …), die der PoolManager bereits nativ anbietet, bekommen `false` oder lassen das Feld weg — sie sollen in der Galerie nicht doppelt auftauchen. |
| `reihenfolge` | number | nein | Anzeige-Reihenfolge in der Galerie (aufsteigend). Darf jederzeit geändert werden. Fehlt das Feld, wird alphabetisch nach `name` sortiert. |
| `uebergabe_beschreibung` | string (Markdown) | ja (wenn `galerie_sichtbar: true`) | **Das Herzstück.** Klartext-Anleitung an die Lehrkraft: „Folgende Informationen musst du liefern, damit diese Aktivität gut und sicher funktioniert." Konkret und überprüfbar formulieren, z. B.: *„Gib mindestens 20 Fachbegriffe zum Thema an, jeweils mit einer kurzen Erklärung (1 Satz). Nenne außerdem das Oberthema des Wortnetzes."* Dieser Text wird 1:1 im PoolManager angezeigt und dient dort auch der KI-Unterstützung als Bauanleitung. |
| `demo_html` | string (Repo-Pfad) | empfohlen | Pfad zu einer **lauffähigen, in sich geschlossenen HTML-Demo** der Aktivität mit Beispielinhalten, z. B. `galerie/demos/mindmap.html`. Wird im PoolManager in einem iFrame (Sandbox, `allow-scripts`) angezeigt. Anforderungen: keine externen Abhängigkeiten außer über CDN erreichbare, alles inline oder eingebettet; funktioniert offline im iFrame; keine Netzwerk-Calls nötig. |

### Beispiel-Eintrag

```json
{
  "id": "wortnetz",
  "name": "Wortnetz",
  "typ": "wortnetz",
  "kategorie": "kreativ",
  "kontrolle": "selbstbestaetigung",
  "eingabe": "interaktiv",
  "kurzbeschreibung": "Schüler verbinden Fachbegriffe zu einem Netz zusammenhängender Wörter.",
  "galerie_sichtbar": true,
  "reihenfolge": 10,
  "uebergabe_beschreibung": "Damit diese Aktivität funktioniert, liefere bitte:\n\n1. **Oberthema** des Wortnetzes (1 Begriff)\n2. **Mindestens 20 Fachbegriffe** zum Thema, je mit 1-Satz-Erklärung\n3. Optional: 3–5 vorgegebene Verbindungen als Startpunkt (Begriff A – Begriff B – Beziehung)",
  "demo_html": "galerie/demos/wortnetz.html"
}
```

## 2. Verbindliche Regeln (Stabilitäts-Vertrag)

1. **IDs sind unveränderlich und für immer reserviert.** Eine einmal vergebene `id` darf nie umbenannt, umgedeutet oder gelöscht werden — der PoolManager speichert konfigurierte Aufgaben nur mit dieser ID. Ausmustern: `galerie_sichtbar: false` setzen (der Eintrag bleibt im Manifest, damit bestehende Aufgaben weiter aufgelöst werden können).
2. **Nur additive Änderungen an `uebergabe_beschreibung` mit Bedacht.** Inhaltliche Verschärfungen der Anforderungen sollten abwärtskompatibel bleiben, da bestehende Lehrer-Eingaben gegen die alte Beschreibung erstellt wurden. Bei jeder Änderung das Feld `stand` (Datum) im Manifest-Kopf aktualisieren.

## 3. Export-Vertrag PoolManager → MBK

Für jede konfigurierte Galerie-Aktivität übergibt der PoolManager:

```json
{
  "aktivitaet": "galerie",
  "galerie_id": "wortnetz",
  "galerie_stand_bei_auswahl": "2026-07-03",
  "inhalt": "<Übergabetext der Lehrkraft gemäß uebergabe_beschreibung>"
}
```

Die MBK löst `galerie_id` gegen das Manifest + die Demo-/Vorlagendateien im Repo auf und baut daraus die Schüleransicht. `galerie_stand_bei_auswahl` dient nur der Nachvollziehbarkeit (welche Manifest-Version die Lehrkraft gesehen hat).

## 4. Ablagestruktur im Repo (Vorschlag)

```
galerie/
├── aktivitaeten.json      ← Manifest (bestehend, wird um Felder ergänzt)
├── README.md
└── demos/
    ├── wortnetz.html
    ├── mindmap.html
    └── …
``