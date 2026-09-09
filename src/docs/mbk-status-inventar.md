# Status-Inventar des Pool-Managers (für die Systemübersicht des Kursbaus)

Stand: 2026-09-09 · Zweck: Der Bau (MBK) soll unsere Wortlaute kennen und
übernehmen, statt eigene Bezeichnungen zu erfinden. Jeder Wert unten ist ein
echter, gespeicherter Zustand — kein UI-Text.

---

## 1. Einheit — Lebenszyklus des Exports (`Einheiten.export_lifecycle_status`)

| Wert | Bedeutung | Wirkung |
|---|---|---|
| `draft` | in Arbeit | alles bearbeitbar |
| `final_freigegeben` | Fachgruppe hat die Einheit final freigegeben | Bearbeitung aller Inhalte gesperrt |
| `export_running` | Bau läuft | gesperrt |
| `published` | Kurs ist in Moodle live | gesperrt |

Begleitfelder: `export_lifecycle_changed_at/by`, `export_started_at/by`,
`export_published_at/by`, `last_exported_at`.

Weitere Einheiten-Zustände:

- `sichtbarkeit`: `oeffentlich` (Poolzeit-Einheit) | `privat` (Sandbox einer Person)
- `format`: `einheit` | `uebungsblock`
- `im_austausch` (bool), `zur_veroeffentlichung_vorgeschlagen` (bool)
- `ist_basismodul`, `aus_basismodul` (bool)
- `grundgeruest_status`: `leer` | `entwurf` | `analysiert`
- `update_strategy` / `_empfehlung` / `_override`: `no_reset` | `full_reset`
- `dashboards_auto_status` pro Lerntyp: `auto` | `bestaetigt` (fehlt = manuell gebaut)

## 2. Freigabe der Inhalte (`content_status`)

Gilt bei `Lernpakete`, `AllgemeineAufgabe`, `MasterAufgabe`, `Aufgabenbausteine`,
`Themenfeld`, `Einheiten`:

- `draft` — in Bearbeitung
- `approved` — freigegeben

Beim **Lernpaket** ist zusätzlich `released_at` (+ `released_by`) ausschlaggebend:
`approved` OHNE `released_at` gilt als *nicht* freigegeben (Altbestand,
Auto-Grün der Struktur-Container). Freigegebene Lernpakete sperren ihre
Aktivitäten und Master. Aktivitäten haben seit 2026-08-11 **keine** eigene
Freigabe mehr — nur noch `is_complete` (vollständig ja/nein).

## 3. Übertragungsstand (`sync_status`, `moodle_sync_status`, `brian_sync_status`)

- `new` — noch nie übertragen
- `pending` — wartet auf Übertragung
- `synced` — im Zielsystem vorhanden
- `modified` — nach der Übertragung verändert
- `to_delete` — zur Löschung vorgesehen
- `error` — nur bei `moodle_sync_status` / `brian_sync_status`

Begleitfelder: `last_synced_at`, `brian_synced_at`, `export_error` (bool).
Hinweis: Brian-Gespräche werden nicht mehr von Hand übertragen — der Bau legt
sie an und meldet die Adressen zurück (`brian-urls-1`).

## 4. Vollständigkeitsprüfung (Reiter 8)

### Prüflauf (`Prueflauf`)
- `status`: `laeuft` | `fertig` | `abgebrochen` | `fehler`
- `umfang`: `voll` | `delta`
- `stufen`: `regel` (mechanisch) | `ki`

### Befund (`Pruefbefund`)

Kategorien:

| Nr. | Wortlaut |
|---|---|
| 1 | Leer oder Platzhalter |
| 2 | Arbeitsauftrag unklar oder nicht bearbeitbar |
| 3 | Erwartungshorizont fehlt oder trägt nicht |
| 4 | Rückmeldeweg nicht entschieden |
| 5 | Material und Text nicht schülertauglich |
| 6 | Keinem Themenfeld zugeordnet (Ergänzung des Pool-Managers) |
| 7 | Von der MBK gemeldet, ohne Kategorie |

- `schwere`: `blockiert` | `stoert` | `hinweis`
- `quelle`: `regel` | `ki` | `mbk`
- `mbk_quelle` (nur bei `mbk`): `bau` | `sichtung`
- `kurs_umgehung`: `keine` | `entfernt` | `baustelle` | `ausgeblendet` |
  `korrektur` | `korrektur ausgesetzt` | `gestaltung`
- `entscheidung`: `offen` | `behoben` | `bewusst` (Pflichtkommentar) |
  `widerspruch` (Pflichtkommentar, nur bei `quelle='mbk'`)
- `dublette_status`: `offen` | `dublette` | `eigenstaendig`
- Rückweg: `antwort_gesendet_am` gesetzt = Entscheidung ist beim Bau angekommen
  (Antwortdatei `antwort-1`); `mbk_erledigt_gemeldet_am` = der Bau hat den Punkt
  selbst als erledigt gemeldet.

### Punkte für die Administration (`MbkAdminTodo`)
- `art`: `moodle` | `ki_prompt` | `sonstiges`
- `status`: `offen` | `erledigt`

## 5. KI-erzeugte Seiten (`SchuelerInhaltSnapshot`)

- `geltungsbereich`: `pfad_instanz` | `einheit`
- gesichtet ja/nein über `gesichtet_am` / `gesichtet_von` — leer = ungesichteter
  KI-Text, erscheint als Befund in Reiter 8.

## 6. Arbeitspläne und Bausteine

- Lerntypen: `minimalist` | `pragmatiker` | `ehrgeizig` | `passioniert`
- Systembaustein `typ`: `baustein` | `buendel`
- Aufgaben-`aufgaben_typ`: `inhalt` | `buendel` | `prozess` | `projekt_anker` |
  `handlung` | `auswahl_buendel` | `externe_html_seite`
- Aufgaben-`aufgaben_modus`: `einzeln` | `sequenz`
- Schritt-`typ`: `material` | `aufgabe` | `katalog` | `offen` | `brian` |
  `handlung` | `extern` | `abgabe`
- Schritt-`status`: `geplant` | `gebaut` | `uebernommen` (fehlt = Altbestand,
  gilt als `uebernommen`)
- `lernpaket_logik`: `standard` | `fast_track` | `wissensspeicher` | `test_only`
- Anforderungsebenen: `1 - Basis` | `2 - Transfer` | `3 - Projekt`
- Aufgabenkategorien (`mission_type`): `erstbegegnung` | `erarbeitung` |
  `sicherung` | `anwendung`

## 7. Schülerseitige Zustände

- `SchuelerAktivitaetFortschritt.status`: `offen` | `in_bearbeitung` | `erledigt`
- Selbsteinschätzung auf der Lernlandkarte
  (`SchuelerLernzielEinschaetzung.einschaetzung`): `schwierig` | `unsicher` |
  `teilweise` | `sicher` (kein Eintrag = noch nicht eingeschätzt)

## 8. Bearbeitungssperren (nur intern, nicht exportrelevant)

`is_locked` / `locked_by_email` / `locked_at` (Lernpaket), `lock_status` /
`locked_by_user` (Master), `locked_by` / `locked_at` (Aufgabe),
`structural_lock` (Einheit) — Timeout-gesteuert, nur zur Vermeidung
gleichzeitiger Bearbeitung. Für den Kursbau ohne Bedeutung.