/**
 * docs/neueKapitel.js
 * Neue Dokumentations-Kapitel (2026-07): Bereiche & Austausch, Schülerbereich,
 * Moodle-Anbindung (LTI), Probleme melden. Wird in docsContent.js eingebunden.
 */

export const NEUE_KAPITEL = {

  'bereiche-und-austausch': `# Die drei Bereiche: Poolzeit, Austausch & Privat

Der Pool-Manager organisiert alle Unterrichtseinheiten in **drei klar getrennten Bereichen**. Auf der Einheiten-Seite wählen Sie oben über die drei großen Kacheln, in welchem Bereich Sie sich bewegen – die aktive Kachel ist immer farblich hervorgehoben, damit Sie jederzeit wissen, wo Sie sind.

| Bereich | Farbe | Was ist das? |
|---------|-------|--------------|
| **Poolzeit-Einheiten** | 🔵 Blau | Die verbindlichen, offiziellen Einheiten für die Poolzeit. Sie werden gemeinschaftlich von der Fachschaft erstellt und von der Fachschaftsleitung betreut. Hier gelten strenge Regeln (Freigaben, Sperren, Export-Workflow). |
| **Freigegebene Einheiten** | 🟢 Grün | Die **Tauschbörse des Kollegiums**. Hier stellen Kolleg:innen ihre privaten Einheiten zum Stöbern bereit. Sie können jede Einheit ansehen und sich mit einem Klick eine eigene private Kopie ziehen. |
| **Private Einheiten** | 🟡 Gelb | Ihr **persönlicher Arbeitsbereich**. Private Einheiten sehen nur Sie selbst (und Administratoren). Hier experimentieren Sie frei – ohne Abstimmung mit der Fachschaft. |

## Der Grundgedanke

Nicht jede gute Einheit muss sofort eine offizielle Poolzeit-Einheit sein. Der typische Lebensweg einer Einheit sieht so aus:

1. **Privat starten:** Sie legen eine private Einheit an und bauen sie in Ruhe für Ihren eigenen Unterricht.
2. **Freigeben (optional):** Wenn die Einheit gut geworden ist, geben Sie sie für das Kollegium frei – sie erscheint in der Tauschbörse.
3. **Kolleg:innen ziehen Kopien:** Andere Lehrkräfte schauen sich Ihre Einheit an und übernehmen sie als eigene private Kopie, die sie beliebig anpassen dürfen.
4. **Aufstieg zur Poolzeit-Einheit (optional):** Die Fachschaftsleitung entdeckt eine besonders gelungene Einheit und übernimmt sie als offizielle Poolzeit-Einheit.

## Private Einheiten: Ihr Sandkasten

* **Standard für Fachlehrkräfte:** Wenn Sie als Fachlehrkraft eine neue Einheit anlegen, ist sie automatisch privat.
* **Volle Freiheit:** Sie können bei privaten Einheiten sogar auswählen, welche der vier Lerntypen-Dashboards Sie anbieten möchten (z. B. nur einen einzigen Lernpfad statt aller vier).
* **Duplikate sind immer privat:** Wenn Sie eine bestehende Einheit duplizieren, landet die Kopie immer in Ihrem Privatbereich.

## Eine Einheit für das Kollegium freigeben

Auf der Karte Ihrer privaten Einheit finden Sie das **Bibliotheks-Symbol** 📚:

* **Ein Klick** → die Einheit erscheint im Bereich „Freigegebene Einheiten" und trägt bei Ihnen das grüne Badge **„Freigegeben"**.
* **Noch ein Klick** → Sie ziehen die Freigabe zurück; die Einheit verschwindet aus der Bibliothek. **Wichtig:** Kopien, die sich Kolleg:innen bereits gezogen haben, bleiben davon unberührt – sie gehören den Kolleg:innen.
* Ihr Original bleibt dabei immer **Ihre** private Einheit. Niemand kann darin etwas verändern.

## In der Tauschbörse stöbern

Im Bereich „Freigegebene Einheiten" können Sie die Liste **nach Fächern** oder **nach Kolleg:innen** gruppieren. Pro Einheit stehen Ihnen zur Verfügung:

| Symbol | Aktion | Wer darf das? |
|--------|--------|---------------|
| 👁️ Auge | **Vorschau** aus Schülersicht öffnen | Alle |
| 📄 Kopieren | **Private Kopie ziehen** – eine eigene, unabhängige Kopie in Ihren Privatbereich übernehmen | Alle |
| 🚀 Rakete | **Zu den Poolzeit-Einheiten kopieren** – die Einheit wird als neue, offizielle Poolzeit-Einheit übernommen (das Original bleibt beim Besitzer) | Nur Fachschaftsleitung im Fach / Admin |
| ↩️ Zurückziehen | Freigabe zurücknehmen | Nur Besitzer / Admin |

> **Tipp:** Bei gezogenen Kopien vermerkt das System die Herkunft („Von … erhalten") – so bleibt nachvollziehbar, von wem eine gute Idee ursprünglich stammt.

## Der Weg zur Poolzeit-Einheit

Eine Einheit wird auf zwei Wegen zur offiziellen Poolzeit-Einheit – **beide sind der Fachschaftsleitung (im jeweiligen Fach) und Administratoren vorbehalten**:

1. **Direkt umwandeln:** Über das Globus-Symbol auf einer privaten Einheit („Zur Poolzeit-Einheit machen"). Die Einheit verlässt den Privatbereich und wird öffentlich.
2. **Aus der Tauschbörse kopieren:** Über das Raketen-Symbol in der Bibliothek. Es entsteht eine **Kopie** als Poolzeit-Einheit – das private Original der Kollegin/des Kollegen bleibt unangetastet.

> **Warum so streng?** Poolzeit-Einheiten sind verbindlich für alle Schüler:innen. Damit die Qualität stimmt, entscheidet die Fachschaftsleitung, was in diesen Bereich aufgenommen wird.

## Eine Einheit gezielt weitergeben

Neben der öffentlichen Tauschbörse gibt es auch das **direkte Weitergeben**: Über das Weitergeben-Symbol auf Ihrer privaten Einheit schicken Sie eine Kopie gezielt in den Privatbereich einer einzelnen Kollegin / eines einzelnen Kollegen – z. B. bei einem Klassenwechsel oder zur Vertretung.
`,

  'schuelerbereich': `# Der Schülerbereich

Der Pool-Manager hat neben dem Lehrer-Arbeitsbereich einen vollwertigen **Schülerbereich** – das ist die Ansicht, in der Ihre Schüler:innen später tatsächlich lernen. Als Lehrkraft erreichen Sie ihn jederzeit über das **Absolventenhut-Symbol** 🎓 oben in der Leiste. So können Sie alles selbst ausprobieren, bevor Ihre Klasse es sieht.

## Wie kommen Schüler:innen in den Schülerbereich?

| Weg | Beschreibung |
|-----|--------------|
| **Über Moodle (LTI)** | Der Standard-Weg: Schüler:innen klicken in ihrem Moodle-Kurs auf einen Link und landen direkt in der verknüpften Einheit – **ohne eigenes Konto im Pool-Manager**. Details im Kapitel [Moodle-Anbindung](/docs/moodle-anbindung). |
| **Über die Schüler-App** | Eine eigenständige, schlanke Schüler-Version der App mit eigenem Login (wird von der Administration bereitgestellt). |
| **Als Lehrkraft zum Testen** | Über das 🎓-Symbol in der Top-Leiste – Sie sehen exakt das, was Schüler:innen sehen, und können jederzeit über den schwebenden Button zurück in den Lehrerbereich. |

## Das Poolzeit-Cockpit

Die Startseite des Schülerbereichs ist das **Poolzeit-Cockpit**. Zu Beginn einer Poolzeit-Sitzung planen die Schüler:innen dort ihre Arbeit:

1. **Gesamtzeit festlegen** – Wie lange dauert die heutige Poolzeit?
2. **Fächer wählen und Zeit verteilen** – Die Schüler:innen entscheiden, in welchen Fächern sie heute arbeiten und wie viel Zeit sie je Fach einplanen.
3. **Loslegen** – Pro Fach sehen sie die verfügbaren Einheiten als Kacheln und starten in die Arbeit. Eine Zeitleiste zeigt den Fortschritt der Sitzung.
4. **Fachwechsel** – Beim Wechsel in ein anderes Fach können sie eine kurze **Zwischennotiz** hinterlassen („Bis Aufgabe 3 gekommen").
5. **Abschluss** – Am Ende der Poolzeit reflektieren sie kurz („Was habe ich geschafft?") und schreiben eine **Nachricht an sich selbst**, die ihnen beim nächsten Mal als Erinnerung angezeigt wird.

## Das Lerntagebuch

Alle Reflexionen, Notizen und Nachrichten landen automatisch im fächerübergreifenden **Lerntagebuch**. Die Schüler:innen können dort auch jederzeit freie Einträge verfassen. So entsteht über das Schuljahr ein persönliches Logbuch des eigenen Lernens.

## Das Einheiten-Onboarding

Wenn Schüler:innen eine Einheit zum ersten Mal öffnen, startet automatisch die **Orientierungsphase** (Onboarding). Diese Inhalte werden von der KI auf Basis Ihrer Einheit erzeugt und von Ihnen im Dashboard-Tab geprüft:

1. **Einführung** – Ein motivierender, schülergerechter Überblick: Worum geht es in dieser Einheit?
2. **Wissens-Check** – Ein kurzes Quiz zum Vorwissen (Einstiegsdiagnose).
3. **Selbsteinschätzung** – Die Schüler:innen schätzen ihre eigene Arbeitsweise ein.
4. **Lerntyp-Empfehlung** – Auf Basis von Wissens-Check und Selbsteinschätzung empfiehlt das System einen der vier Lerntypen. Wer möchte, kann sich dazu auch mit dem KI-Assistenten **Brian** unterhalten.
5. **Dashboard-Wahl** – Die Schüler:innen wählen ihren Lerntyp (die Empfehlung ist keine Pflicht) und landen in ihrem persönlichen Dashboard.

> **Hinweis:** Der Lerntyp kann später jederzeit gewechselt werden – der Fortschritt wird pro Lerntyp getrennt gespeichert.

## Das Schüler-Dashboard

Das Dashboard ist der Lernpfad, den Sie als Lehrkraft im [Dashboard-Architekt](/docs/dashboards-v2) gebaut haben – aus Schülersicht:

* **Sektoren** gliedern den Pfad (z. B. „Orientierung", „Training", „Test"). Je nach Ihrer Einstellung sind Sektoren sofort offen oder werden erst nach Abschluss eines anderen Sektors freigeschaltet.
* **Aufgaben und Lernpakete** werden direkt in der App bearbeitet: Lückentexte, Zuordnungen, Quizze, Videos, Texte, offene Aufgaben u. v. m.
* **Fortschritts-Ampeln** zeigen pro Aufgabe: offen · in Bearbeitung · erledigt.
* **Lernlandkarte:** Hier schätzen die Schüler:innen pro Lernziel ein, wie sicher sie sich fühlen („Kann ich" · „Bin unsicher" · „Brauche Hilfe") – eine Art GPS des eigenen Lernstands.

## Die Vorschau: Testen aus Lehrersicht

Sie müssen nicht raten, wie Ihre Einheit für Schüler:innen aussieht:

* **Auge-Symbol auf der Einheiten-Karte** → öffnet die komplette Einheit als Schüler-Vorschau, umschaltbar zwischen den Lerntypen.
* **Vorschau im Dashboard-Architekt** → zeigt den gerade gebauten Lernpfad live aus Schülersicht.
* **Vorschau pro Aufgabe** (in der Aufgaben-Werkstatt) → zeigt die einzelne Aufgabe inklusive Interaktion, bevor Sie sie freigeben.
`,

  'moodle-anbindung': `# Moodle-Anbindung (LTI): Schüler-Zugang ohne Extra-Konto

Der Pool-Manager ist auf zwei Arten mit Moodle verbunden:

1. **Inhalte-Export:** Fertige Einheiten werden über das Export-Center nach Moodle übertragen (siehe [Export-Workflow](/docs/export-workflow)).
2. **Schüler-Zugang (LTI):** Schüler:innen gelangen direkt aus ihrem Moodle-Kurs in den Schülerbereich des Pool-Managers – **ohne eigenes Konto** anlegen zu müssen. Darum geht es in diesem Kapitel.

## Was ist LTI – in einfachen Worten?

LTI ist ein sicherer Standard, mit dem sich Lernplattformen gegenseitig „vertrauen". Moodle bestätigt dem Pool-Manager kryptografisch signiert: *„Diese Person ist wirklich Schüler:in X aus meinem Kurs."* Der Pool-Manager übernimmt diese Identität – niemand muss sich Passwörter für ein zweites System merken.

## So funktioniert es für die Schüler:innen

1. Die Lehrkraft (bzw. der Moodle-Spezialist) legt im Moodle-Kurs ein **„Externes Tool"** an, das auf eine bestimmte Einheit im Pool-Manager zeigt.
2. Schüler:innen klicken in Moodle auf diesen Link.
3. Sie landen **direkt in der verknüpften Einheit** – Onboarding, Dashboard, Aufgaben, alles wie im Kapitel [Schülerbereich](/docs/schuelerbereich) beschrieben.
4. Ihr Fortschritt wird gespeichert und beim nächsten Klick aus Moodle wieder geladen.

> **Wichtig:** Schüler:innen, die über Moodle kommen, sehen **ausschließlich die verknüpfte Einheit** – keine Einheiten-Übersicht, keine anderen Fächer. Der Moodle-Kurs bleibt das „Zuhause" der Klasse.

## Einrichtung (einmalig, durch die Administration)

Die Verbindung wird einmal pro Schule eingerichtet – in den **Admin-Einstellungen** auf der Karte **„Moodle-LTI"**:

| Schritt | Wo? | Was? |
|---------|-----|------|
| 1 | Moodle (Administration) | Den Pool-Manager als externes Tool registrieren. Die dafür nötigen Adressen (Login-URL, Launch-URL, Schlüssel-URL) zeigt die LTI-Karte im Pool-Manager zum Kopieren an. |
| 2 | Moodle | Nach dem Registrieren zeigt Moodle drei Werte an: **Plattform-ID (Issuer)**, **Client-ID** und **Deployment-ID**. |
| 3 | Pool-Manager | Diese drei Werte in die LTI-Karte eintragen und speichern. Fertig. |

Danach kann jede Lehrkraft in ihren Moodle-Kursen Links auf beliebige Einheiten setzen.

## Häufige Fragen

**Brauchen meine Schüler:innen ein Konto im Pool-Manager?**
> Nein. Die Identität kommt sicher aus Moodle. Der Pool-Manager legt automatisch ein internes Schülerprofil an, damit der Fortschritt gespeichert werden kann.

**Was sieht ein:e Schüler:in, wenn die Einheit noch nicht verknüpft ist?**
> Einen freundlichen Hinweis, dass noch keine Einheit zugeordnet wurde – bitte an die Lehrkraft wenden.

**Kann ich mehrere Einheiten pro Kurs verknüpfen?**
> Ja. Legen Sie einfach pro Einheit ein eigenes externes Tool / einen eigenen Link im Moodle-Kurs an.
`,

  'problem-melden': `# Probleme melden

Etwas funktioniert nicht, sieht komisch aus oder verhält sich unerwartet? Dafür gibt es den **„Problem melden"-Button** direkt in der App – Sie müssen keine E-Mail schreiben und niemanden suchen.

## Wo finde ich den Button?

Oben in der Leiste, zwischen den Navigations-Symbolen, finden Sie das **Problem-melden-Symbol**. Es ist auf jeder Seite verfügbar.

## So melden Sie ein Problem

1. Klicken Sie auf das Symbol – ein Dialog öffnet sich.
2. **Beschreiben Sie in eigenen Worten**, was passiert ist. Hilfreich ist:
   * Was wollten Sie tun? (z. B. „Ich wollte eine Aktivität freigeben")
   * Was ist stattdessen passiert? (z. B. „Es kam eine Fehlermeldung / nichts ist passiert")
3. Fügen Sie – wenn möglich – einen **Screenshot** hinzu. Ein Bild sagt oft mehr als tausend Worte.
4. Absenden – fertig.

## Was passiert mit meiner Meldung?

Ihre Meldung wird automatisch als **Ticket beim Entwicklungsteam** angelegt. Dabei hängt die App von selbst nützliche Kontext-Informationen an (z. B. auf welcher Seite und in welcher Einheit Sie gerade waren) – Sie müssen also keine technischen Details liefern.

> **Tipp:** Melden Sie lieber einmal zu viel als einmal zu wenig. Auch „Kleinigkeiten" wie ein unverständlicher Text oder ein verrutschter Button sind wertvolle Hinweise.

## Wann melde ich wo?

| Anliegen | Weg |
|----------|-----|
| **Fehler / technisches Problem** | „Problem melden"-Button |
| **Inhaltliche Frage zu einer Einheit** | Fachschaftsleitung ansprechen |
| **Frage zu Rollen/Rechten oder Konto** | Administrator:in der Schule |
| **„Wie geht das nochmal?"** | Diese Dokumentation 😉 |
`,
};