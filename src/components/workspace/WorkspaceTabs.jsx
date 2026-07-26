/**
 * WorkspaceTabs.jsx
 *
 * 8-Stufen Workflow für den Workspace einer Einheit.
 * Nur Icons mit sofortigem Tooltip bei Mouse-Over.
 *
 * Hinweis (Phase H Cleanup): Die ehemaligen Tabs 9 (Moodle-Export) und 10
 * (Brian.study Export) wurden aus der Einheitenansicht entfernt — beide
 * Workflows laufen jetzt zentral im eigenständigen Export-Center
 * (Hauptmenü). Tab 8 („Freigabe-Cockpit") bleibt als Übergabepunkt der
 * Einheit erhalten.
 */
import React from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BookOpen, LayoutGrid, Zap, Wand2, ClipboardList, Target, CheckSquare, Compass, ListChecks, Bot } from 'lucide-react';
import HelpDialog from '@/components/ui/HelpDialog';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';

// ✅ TAB-SPERREN: Welche Tabs sind für welche Rolle sichtbar?
const getVisibleTabs = (rolle, isBasismodul = false) => {
  const istAdmin = rolle === ROLLEN.ADMIN;
  const istFachschaft = rolle === ROLLEN.FACHSCHAFT;
  const istMoodleDesigner = rolle === ROLLEN.MOODLE_DESIGNER;
  const istFachlehrkraft = rolle === ROLLEN.FACHLEHRKRAFT;
  const showExportTabs = istAdmin || istMoodleDesigner;

  const allTabs = [
  {
    value: 'einheit', label: 'Einheit verwalten', icon: BookOpen, step: 1,
    help: {
      title: 'Einheit verwalten',
      description: 'Dieser Tab wird ausschließlich von der Fachschaftsleitung bearbeitet. Hier legt sie die Grunddaten der Einheit fest, stellt das Team zusammen und entscheidet, wann die Einheit für die Fachlehrkräfte zur Bearbeitung freigegeben oder wieder gesperrt wird. Fachlehrkräfte sehen diesen Tab nur im Lesemodus.',
      features: [
        'Die Fachschaftsleitung legt Titel, Fach, Jahrgang und Zeitphase der Einheit fest',
        'Sie definiert die Gesamtziele der Einheit (das große „Wo wollen wir hin?")',
        'Sie fügt Fachlehrkräfte als Mitglieder hinzu und vergibt Rollen (Leitung, Editor, Leser)',
        'Sie schaltet die Einheit zwischen „Freigegeben für Bearbeitung" und „Gesperrt" um',
      ],
      faqs: [
        { question: 'Warum kann ich als Fachlehrkraft hier nichts bearbeiten?', answer: 'Tab 1 ist bewusst der Fachschaftsleitung vorbehalten. Sie schafft den Rahmen, in dem die Fachlehrkräfte ihre Lernpakete (Tab 3 ff.) befüllen.' },
        { question: 'Was bedeutet "Einheit gesperrt"?', answer: 'Fachlehrkräfte können keine Inhalte mehr bearbeiten. Nur Fachschaftsleitung und Admins haben weiterhin Schreibzugriff. Sinnvoll, sobald alle Inhalte exportiert sind oder die Einheit qualitätsgesichert wurde.' },
        { question: 'Was sind Einheitsmitglieder?', answer: 'Mitglieder sind die Lehrkräfte, die in dieser Einheit überhaupt arbeiten dürfen. Die Leitung hat volle Rechte, Editoren können Inhalte bearbeiten, Leser dürfen nur zuschauen.' },
      ],
      docsSlug: 'einheiten-struktur',
    },
  },
  {
    value: 'struktur', label: 'Struktur der Einheit', icon: LayoutGrid, step: 2,
    help: {
      title: 'Struktur der Einheit',
      description: 'Auch dieser Tab gehört der Fachschaftsleitung. Hier strukturiert sie die Einheit, indem sie Themenfelder als inhaltliche Blöcke anlegt und ihnen Lernpakete zuweist. So entsteht das Grundgerüst, auf dem die Fachlehrkräfte später ihre Aktivitäten und Aufgaben aufbauen. Fachlehrkräfte sehen die Struktur hier nur lesend.',
      features: [
        'Die Fachschaftsleitung legt Themenfelder an und sortiert sie',
        'Sie erstellt Lernpakete innerhalb der Themenfelder und bestimmt ihre Reihenfolge',
        'Sie wählt pro Themenfeld den Bearbeitungsmodus „offen" oder „sequenziell"',
        'Fachlehrkräfte bekommen einen klaren Überblick, welche Pakete in welchem Themenfeld sitzen',
      ],
      faqs: [
        { question: 'Was ist ein Themenfeld?', answer: 'Ein Themenfeld ist ein thematischer Block (z.B. "Grundrechenarten"), dem mehrere Lernpakete zugeordnet werden können. Es entspricht einem Kapitel oder einer Unterrichtssequenz.' },
        { question: 'Was ist der Unterschied zwischen offen und sequenziell?', answer: 'Offen: Schüler:innen können die Lernpakete in beliebiger Reihenfolge bearbeiten. Sequenziell: Die Pakete müssen der Reihe nach absolviert werden – sinnvoll, wenn sie aufeinander aufbauen.' },
        { question: 'Warum kann ich die Struktur nicht bearbeiten?', answer: 'Tab 2 ist Fachschaftsleitungs- und Admin-Sache. Als Fachlehrkraft können Sie die Struktur einsehen, aber nicht ändern – damit niemand versehentlich das Grundgerüst einer laufenden Einheit zerschießt.' },
      ],
      docsSlug: 'einheiten-struktur',
    },
  },
  {
    value: 'lernziele', label: 'Lernziele', icon: ListChecks, step: 3,
    help: {
      title: 'Lernziele – der zentrale Ort',
      description: 'Hier wohnen alle Lernziele der Einheit an einem Ort, gruppiert nach Themenfeld und Lernpaket. Du formulierst pro Lernpaket, was deine Schüler:innen am Ende können sollen – in Fachsprache und schülergerecht. Die KI-Prüfung hilft dir dabei, jedes Lernziel sauber und präzise zu formulieren. So gehen die Lernziele nicht mehr in Struktur- oder Aktivitäten-Tab unter, sondern bekommen die Aufmerksamkeit, die sie verdienen.',
      features: [
        'Alle Lernpakete der Einheit – gruppiert nach Themenfeld – auf einen Blick',
        'Du legst pro Lernpaket Lernziele an, bearbeitest oder entfernst sie',
        'Pro Lernziel: offizielle Formulierung (Fachsprache) + schülergerechte Übersetzung',
        'KI-Prüfung pro Lernziel: schlägt beide Varianten formuliert vor',
        'Speichern erfolgt pro Lernpaket – gezielt und ohne Seiteneffekte',
      ],
      faqs: [
        { question: 'Warum gibt es jetzt einen eigenen Lernziele-Tab?', answer: 'Lernziele sind das didaktische Herzstück. Früher waren sie über Tab 2 und Tab 3 verstreut. Mit dem eigenen Tab hast du einen klaren Heimatort, an dem du sie in Ruhe und vollständig pflegst.' },
        { question: 'Was ist der Unterschied zwischen Fachsprache und schülergerecht?', answer: 'Die Fachsprache („Ich kann …") ist die offizielle Formulierung. Die schülergerechte Übersetzung erklärt dasselbe in einfacher Sprache – sie erscheint später in der Lernlandkarte für die Schüler:innen.' },
        { question: 'Wie funktioniert die KI-Prüfung?', answer: 'Du tippst deine Idee ein und klickst auf „KI prüfen". Die KI liest deine Eingabe und schlägt eine präzise Fachsprachen- und eine schülergerechte Formulierung vor, die du übernehmen oder verwerfen kannst.' },
      ],
      docsSlug: 'lernpakete-aktivitaeten',
    },
  },
  {
    value: 'aktivitaeten', label: 'Aktivitäten zuordnen', icon: Zap, step: 4,
    help: {
      title: 'Aktivitäten und Lernziele',
      description: 'Ab hier bist du als Fachlehrkraft dran. In Tab 3 legst du für jedes Lernpaket die Lernziele und die didaktischen Aktivitäten fest – also das, was deine Schüler:innen im Lernpaket tatsächlich tun: ein Video schauen, einen Text lesen, ein Quiz lösen. Die eigentlichen konkreten Aufgabeninhalte (z. B. die Lückentext-Sätze) füllst du dann erst in Tab 4 ein.',
      features: [
        'Du formulierst pro Lernpaket die Lernziele („Ich kann …") inklusive schülergerechter Übersetzung',
        'Du wählst pro Phase (Input · Übung · Abschluss) die passenden Aktivitäten aus dem Katalog',
        'Du blendest Phasen, die du nicht brauchst, gezielt aus',
        'Du gibst Aktivitäten frei – freigegebene Aktivitäten sind gesperrt und für den Export bereit',
      ],
      faqs: [
        { question: 'Was ist der Unterschied zwischen Tab 3 und Tab 4?', answer: 'In Tab 3 entscheidest du, WELCHE Aktivitäten ein Lernpaket hat (z. B. „Lückentext" als Übungsform). In Tab 4 füllst du dann die konkreten Inhalte dieser Aktivität (z. B. die einzelnen Lückentext-Sätze und die richtigen Lösungen).' },
        { question: 'Wann ist eine Aktivität „vollständig"?', answer: 'Sobald alle Pflichtfelder ausgefüllt sind, wird sie automatisch als vollständig markiert. Erst vollständige Aktivitäten kannst du freigeben.' },
        { question: 'Was bedeutet das grüne Schloss neben einer Aktivität?', answer: 'Die Aktivität wurde von dir bewusst freigegeben. Sie ist damit gesperrt und kann nicht mehr versehentlich verändert werden. Wenn du doch noch etwas ändern willst, musst du die Freigabe erst aktiv zurückziehen.' },
      ],
      docsSlug: 'lernpakete-aktivitaeten',
    },
  },
  {
    value: 'aufgaben', label: 'Basisaufgaben erstellen', icon: Wand2, step: 5,
    help: {
      title: 'Konkrete Aufgaben (Ebene 1) — die Aufgaben-Werkstatt',
      description: 'In diesem Tab ordnest du als Fachlehrkraft den einzelnen Aktivitäten aus dem vorherigen Tab die konkreten Aufgabeninhalte zu. Wenn du z. B. die Aktivität „Lückentext" gewählt hast, schreibst du hier die einzelnen Lückentext-Sätze – oder du lässt sie dir mithilfe einer Mastervorlage von der KI klonen. Über die integrierte Vorschau siehst du jederzeit, wie die Aufgabe später für die Schüler:innen aussieht. Diese Aufgaben werden später automatisch und unmittelbar in den Lernpaketen ausgewertet.',
      features: [
        'Du wählst links im Baum eine Aktivität und befüllst rechts deren konkrete Aufgabe',
        'Du legst Mastervorlagen an, aus denen die KI dir auf Knopfdruck Varianten (Klone) generiert',
        'Du kontrollierst und justierst jeden Klon einzeln, bevor er freigegeben wird',
        'Über die Vorschau prüfst du pro Aufgabentyp (z. B. Lückentext, Zuordnung, Quiz) die Schüler-Ansicht, bevor du freigibst',
        'Du gibst Aufgaben frei – freigegebene Aufgaben sind gesperrt und tauchen im Freigabe-Cockpit auf',
      ],
      faqs: [
        { question: 'Was ist eine Mastervorlage?', answer: 'Eine Mastervorlage ist eine Muster-Aufgabe, die du einmal sauber baust (z. B. „Berechne den Flächeninhalt"). Aus dieser Vorlage erzeugt die KI dir dann auf Knopfdruck weitere strukturell identische Aufgaben mit anderen Zahlen oder Begriffen.' },
        { question: 'Wozu dient die Vorschau?', answer: 'Über die Vorschau siehst du die Aufgabe genau so, wie sie später den Schüler:innen präsentiert wird – inklusive Interaktion (Lücken füllen, Begriffe zuordnen, Quiz beantworten). So erkennst du Fehler, bevor die Aufgabe freigegeben und exportiert wird.' },
        { question: 'Wann kann ich eine Aufgabe freigeben?', answer: 'Sobald alle Pflichtfelder ausgefüllt sind, erscheint der „Freigeben"-Button. Freigegebene Aufgaben werden im Freigabe-Cockpit für den Export vorgemerkt.' },
        { question: 'Was ist der Unterschied zu den allgemeinen Aufgaben (Ebene 2)?', answer: 'Ebene-1-Aufgaben hier sind kurze, automatisch auswertbare Übungen direkt im Lernpaket (Lückentext, Zuordnung, Quiz …). Die allgemeinen Aufgaben (Ebene 2) sind die größeren, offenen Transfer-Aufgaben, bei denen Schüler:innen selbstständig formulieren und vom KI-Tutor begleitet werden.' },
      ],
      docsSlug: 'ebene-1-basismodule',
    },
  },
  {
    value: 'ebene2', label: 'Allgemeine Aufgaben (Ebene 2)', icon: ClipboardList, step: 6,
    help: {
      title: 'Allgemeine Aufgaben (Ebene 2 – Transfer)',
      description: 'In diesem Tab erstellst du als Fachlehrkraft die allgemeinen Transfer-Aufgaben deiner Einheit (Ebene 2). Das sind die größeren, offenen Aufgaben, bei denen Schüler:innen das in den Lernpaketen Gelernte auf eine neue Situation anwenden müssen – z. B. eine Quelle analysieren, ein Diagramm auswerten oder eine kurze Erörterung schreiben. Begleitet werden sie dabei vom KI-Tutor Brian.study, den du in diesem Tab gleich mit konfigurierst. Beim Anlegen wählst du zunächst die Art der Aufgabe (Mission) – also welche Denkleistung im Vordergrund steht. Wenn dir die Idee fehlt, hilft dir die KI-Ideenbox mit passenden Vorschlägen für das jeweilige Themenfeld.',
      features: [
        'Du legst neue Aufgaben über ein geführtes Modal an und wählst dabei die Art der Aufgabe (Mission: Problem, Entdeckung, Recherche, Anwendung, Transfer, Kreativität)',
        'Du nutzt die KI-Ideenbox, um dir zu einem Themenfeld passende Aufgaben-Ideen vorschlagen zu lassen',
        'Du beschreibst Aufgaben mit Text, Bild, PDF oder Materialien aus dem Lehrwerk und setzt den Schwierigkeitsgrad (1–3 Sterne)',
        'Du verknüpfst die benötigten Lernziele/Basis-Einheiten per Drag & Drop – das ist die Grundlage für das KI-Tutor-Feedback',
        'Du lässt dir vom KI-Aufgaben-Assistenten aus einer groben Idee (auch per Sprache) einen vollständigen Aufgabenentwurf erzeugen',
        'Du füllst den Erwartungshorizont aus oder lässt ihn per KI generieren – das ist das „Gehirn" für den KI-Tutor',
        'Du baust Auswahl-Bündel, in denen Schüler:innen aus mehreren Aufgaben wählen dürfen',
      ],
      faqs: [
        { question: 'Was ist der Unterschied zu den Basisaufgaben (Ebene 1)?', answer: 'Die Basisaufgaben (Ebene 1) sind kurze, automatisch auswertbare Übungen direkt in einem Lernpaket. Die allgemeinen Aufgaben hier (Ebene 2) sind die offenen Transfer-Aufgaben der ganzen Einheit – sie sind nicht an ein einzelnes Lernpaket gebunden, sondern werden später in den Arbeitsplänen der Intensitätsstufen eingesetzt.' },
        { question: 'Was ist die „Art der Aufgabe" (Mission)?', answer: 'Beim Anlegen einer Aufgabe wählst du, welche Denkleistung im Mittelpunkt steht – z. B. ein Problem lösen, etwas entdecken, recherchieren, anwenden, transferieren oder kreativ werden. Die Mission prägt Zuschnitt und Tonalität der Aufgabe und ist später im Lernpfad als Etikett sichtbar.' },
        { question: 'Was ist die KI-Ideenbox?', answer: 'Wenn dir der Einstieg fehlt, schlägt dir die KI-Ideenbox zu einem ausgewählten Themenfeld mehrere konkrete Aufgaben-Ideen vor. Du übernimmst eine Idee als Startpunkt und baust sie weiter aus.' },
        { question: 'Was ist der KI-Aufgaben-Assistent?', answer: 'Über den „Mit KI entwerfen"-Button (Zauberstab) kannst du eine grobe Idee eingeben – auch per Spracheingabe. Die KI erstellt daraus Titel, Aufgabenstellung und passende Kompetenz-Vorschläge, die du danach noch anpassen kannst.' },
        { question: 'Was ist der Erwartungshorizont?', answer: 'Er beschreibt, welche Inhalte und Qualitätsmerkmale eine gute Schülerantwort enthalten muss. Der KI-Tutor nutzt ihn als Leitplanke für sein Feedback – je präziser, desto hilfreicher die KI.' },
      ],
      docsSlug: 'ebene-2-allgemeine-aufgaben',
    },
  },
  {
    value: 'ebene3', label: 'Anwendungs- & Projektaufgaben', icon: Target, step: 7,
    help: {
      title: 'Anwendungs- & Projektaufgaben (Ebene 3)',
      description: 'In diesem Tab erstellst du als Fachlehrkraft die anspruchsvollen Anwendungs- und Projektaufgaben (Ebene 3). Das sind die offenen, kreativen Aufgaben, bei denen deine Schüler:innen ein Produkt oder Projekt selbstständig planen und erstellen – z. B. ein Plakat, ein Podcast, eine Präsentation oder ein Portfolio. Da es hier keine eindeutige Musterlösung gibt, definierst du die Abgabeformate, Bewertungsrubriken und einen Projekt-Coach (KI-Tutor), der die Lernenden über mehrere Sitzungen begleitet.',
      features: [
        'Du wählst zwischen Anwendungsaufgabe (kürzer, fokussiert) und Projektaufgabe (umfangreicher, produktorientiert)',
        'Du nutzt den KI-Aufgaben-Assistenten, um aus einer groben Idee (auch per Sprache) einen Aufgabenentwurf zu erzeugen',
        'Du legst die Abgabeformate per Kachel fest (Text · Präsentation · Zeitleiste · Bild · Grafik · Audio/Podcast) oder definierst ein eigenes Format',
        'Du beschreibst einen „Besonderen Fokus" und lässt dir daraus die Bewertungsrubriken per KI vorschlagen',
        'Du verfeinerst Rubriken (Titel · Punkte · Kriterientext) im Brian-Format manuell nach',
        'Du füllst die Lernlandkarte: welche Lernziele/Basis-Einheiten sind für dieses Projekt zwingend nötig?',
        'Du lässt den vollständigen Projekt-Coach-Prompt automatisch aus Aufgabe + Rubriken + Lernlandkarte generieren',
      ],
      faqs: [
        { question: 'Was ist der Unterschied zwischen Anwendungs- und Projektaufgabe?', answer: 'Anwendungsaufgaben sind kürzer und fokussierter (z. B. einen Text analysieren). Projektaufgaben sind umfangreicher und verlangen eigenständige Planung, Recherche und Umsetzung – meist über mehrere Sitzungen.' },
        { question: 'Wozu dienen die Abgabeformate?', answer: 'Sie legen fest, in welcher Form die Schüler:innen ihr Ergebnis einreichen (z. B. Präsentation, Zeitleiste, Podcast). Wichtig: Brian bewertet das fertige Format nicht, sondern begleitet die Lernenden bei dessen Erstellung – deshalb braucht er die Angabe, in welche Richtung er unterstützen soll. Mehrfachauswahl und ein eigenes Format sind möglich.' },
        { question: 'Was sind Bewertungsrubriken im Brian-Format?', answer: 'Anstelle starrer Schulnoten gibt es thematische Kategorien (z. B. „Inhaltliche Tiefe", „Darstellung") mit Punktzahl und Kriterientext. Die KI generiert dir auf Basis von Aufgabe und Fokus passende Kategorien als Startpunkt. Sie sind keine starre Vorgabe, sondern lenken Brians Begleitung.' },
        { question: 'Was ist der Projekt-Coach?', answer: 'Ein speziell konfigurierter KI-Tutor, der Schüler:innen per Sokrates-Methode durch das Projekt führt – ohne die Lösung vorwegzunehmen. Du erzeugst seinen Prompt im Reiter „KI-Tutor Prompt" auf Knopfdruck.' },
        { question: 'Warum verlangt das System Lernziele für ein Projekt?', answer: 'Damit Brian.study weiß, welche Grundlagen aus Ebene 1 das Projekt voraussetzt. Wenn ein:e Lerner:in scheitert, kann der Tutor gezielt zurück zu den passenden Basis-Übungen verweisen.' },
      ],
      docsSlug: 'ebene-3-projektaufgaben',
    },
  },
  {
    value: 'dashboards', label: 'Arbeitspläne (Lernpfade)', icon: Compass, step: 8,
    help: {
      title: 'Arbeitspläne – Lernpfad-Architekt',
      description: 'In diesem Tab baust du als Fachlehrkraft die vier individuellen Lernpfade deiner Einheit – einen pro Intensitätsstufe (Minimalist · Pragmatiker · Ehrgeizig · Passioniert). Du arrangierst dabei die allgemeinen Aufgaben (Ebene 1/2) und Projektaufgaben (Ebene 3) sowie globale System-Bausteine (Lernlandkarte, Diagnose, Wissensspeicher …) zu klar strukturierten Sektoren. Ergebnis: Jede:r Lernende sieht später einen Arbeitsplan, der genau auf die gewählte Intensität zugeschnitten ist.',
      features: [
        'Du wählst oben die Intensitätsstufe aus und arbeitest pro Stufe an einem eigenen Pfad',
        'Im Material-Pool links findest du alle allgemeinen Aufgaben und Projektaufgaben sowie globale System-Bausteine',
        'Über den „Guide" spielst du das passende Standard-Raster für die Intensitätsstufe ein (Orientierung → Einstieg → Training → Test → Projekt)',
        'Du legst neue Sektoren an und steuerst pro Sektor die Bearbeitungsreihenfolge („sequenziell" / „frei") sowie die Freischaltung (sofort oder nach Abschluss eines anderen Sektors)',
        'Per Drag & Drop sortierst du Aufgaben und Bausteine in die Sektoren ein – mit Live-Ampel-Status pro Aufgabe',
        'Mit „Prüfen & freigeben" markierst du den Pfad pro Intensitätsstufe als geprüft und sperrst ihn gegen versehentliche Änderungen',
      ],
      faqs: [
        { question: 'Was sind die vier Intensitätsstufen?', answer: 'Stufen mit unterschiedlicher Bearbeitungsintensität: Minimalist (Fokus auf Basis sichern), Pragmatiker (will effizient zum Ziel), Ehrgeizig (vollständige Prüfungsvorbereitung), Passioniert (große Freiheit, Schwerpunkt Projekte).' },
        { question: 'Was bedeutet die Sektor-Freischaltung?', answer: 'Pro Sektor legst du fest, ob er sofort zugänglich ist oder erst, nachdem ein anderer Sektor vollständig erledigt wurde. So baust du gestufte Lernpfade, ohne starre Gesamt-Reihenfolge.' },
        { question: 'Was macht „Standard-Raster laden"?', answer: 'Der Guide spielt das didaktisch passende Sektor-Gerüst für die aktuelle Intensitätsstufe ein. Bestehende Aufgaben werden dabei NICHT überschrieben – du bekommst nur die Struktur dazu.' },
        { question: 'Was bedeutet „Prüfen & freigeben"?', answer: 'Der Pfad wird auf vollständige (grüne) Aufgaben geprüft und als „geprüft" markiert. Danach ist der Pfad gegen Änderungen gesperrt (und erscheint im Freigabe-Cockpit als „Geprüft") – Änderungen sind erst nach „Entsperren" wieder möglich.' },
        { question: 'Verändere ich hier die Aufgaben selbst?', answer: 'Nein. Die Aufgaben aus den Aufgaben-Tabs bleiben unverändert. Du legst hier nur fest, IN WELCHEM Sektor und in welcher Reihenfolge sie für die jeweilige Intensitätsstufe angeboten werden.' },
        { question: 'Warum kann ich nicht bearbeiten?', answer: 'Dieser Tab hat eine eigene strukturelle Sperre. Wenn jemand anderes gerade an diesem Lernpfad arbeitet oder der Pfad bereits geprüft/freigegeben ist, siehst du nur den Lese-Modus.' },
      ],
      docsSlug: 'dashboards-v2',
    },
  },
  {
    value: 'cockpit', label: 'Freigabe-Cockpit (Moodle)', icon: CheckSquare, step: 9,
    help: {
      title: 'Freigabe-Cockpit – Status auf einen Blick',
      description: 'Das Freigabe-Cockpit ist eine reine Informationsseite. Es zeigt dir den Zustand der gesamten Einheit auf einen Blick: Strukturboard, Einheits-Informationen, Lernpakete, allgemeine Aufgaben, Projektaufgaben und die vier Arbeitspläne – jeweils mit ihrem Lebenszyklus (Moodle-Sync) und Freigabestatus. Hier wird nichts bearbeitet und nichts exportiert; du erkennst nur sofort, welche Bestandteile fertig sind und welche noch Aufmerksamkeit brauchen. Der eigentliche Export findet im zentralen Export-Center (Hauptmenü) statt.',
      features: [
        'Übersicht aller Einheiten-Bestandteile in einer kompakten Tabelle',
        'Lebenszyklus-Badge pro Element: Neu · Synchron · Geändert (Moodle-Sync-Status)',
        'Freigabe-Badge (Entwurf / Freigegeben) bei Lernpaketen und Aufgaben',
        'Bei den Arbeitsplänen zusätzlich der Prüf-Status: „In Bearbeitung" oder „Geprüft" (gesperrt)',
        'Per Klick auf eine Aufgabe springst du direkt in den passenden Arbeitsbereich',
      ],
      faqs: [
        { question: 'Kann ich hier etwas bearbeiten oder exportieren?', answer: 'Nein. Das Cockpit ist nur eine Statusübersicht. Bearbeitet wird in den Tabs 1–7, der eigentliche Export läuft im zentralen Export-Center (Hauptmenü).' },
        { question: 'Was bedeutet das Badge „Neu" bzw. „Geändert"?', answer: '„Neu" heißt: noch nie nach Moodle exportiert. „Synchron" heißt: aktuell live in Moodle. „Geändert" heißt: seit dem letzten Export wurde etwas verändert – ein erneuter Export ist nötig.' },
        { question: 'Was bedeutet „Geprüft" bei einem Arbeitsplan?', answer: '„Geprüft" zeigt, dass der Lernpfad geprüft und gegen Bearbeitung gesperrt wurde. „In Bearbeitung" heißt, dass am Pfad noch Änderungen möglich sind.' },
        { question: 'Warum sehe ich dieses Cockpit als Fachlehrkraft nicht?', answer: 'Es ist auf Admin und Moodle-Designer / Export-Team beschränkt. Fachlehrkräfte sind mit der Freigabe ihrer Inhalte in den Tabs 3–7 fertig.' },
      ],
      docsSlug: 'export-workflow',
    },
  },
  ];

  return allTabs.filter(tab => {
    // Tab 8 (Freigabe-Cockpit) nur für Admin und Moodle-Designer.
    // Bei Basismodulen zusätzlich für die Fachschaftsleitung — sie kontrolliert
    // die (öffentlichen) Basismodule und übergibt sie an das Export-Center.
    if (tab.value === 'cockpit') {
      return showExportTabs || (isBasismodul && istFachschaft);
    }
    // Tab 7 (Dashboards): für alle Lehrkräfte/Admins sichtbar
    if (tab.value === 'dashboards') return true;
    // Tabs 1 & 2 (Einheit verwalten, Struktur) sind für ALLE sichtbar (auch Fachlehrkräfte)
    // Tabs 3-6 sind für alle Lehrkräfte sichtbar
    return true;
  });
};

// Brian-Export-Tab — NUR für PRIVATE Einheiten. Bei Poolzeit-Einheiten läuft
// der Brian-Workflow zentral im Export-Center; bei privaten Einheiten macht
// die Lehrkraft die Übertragung nach Brian.study selbst (händisch, mit
// Anleitung und Kopier-Cockpit direkt im Workspace).
const BRIAN_TAB = {
  value: 'brian', label: 'Export (Moodle & Brian)', icon: Bot, step: 9,
  help: {
    title: 'Export — Moodle-Einbindung & Brian-Übertragung',
    description: 'Der Exportbereich deiner privaten Einheit. Oben findest du die Schritt-für-Schritt-Anleitung, wie deine Einheit über den Einheiten-Code in deinen Moodle-Kurs kommt. Darunter überträgst du die KI-Tutor-Aufgaben deiner privaten Einheit nach Brian.study — händisch, aber komfortabel: Der Poolmanager bereitet für jede freigegebene Aufgabe die fertigen Brian-Segmente (Dialogname, Anweisung für Lernende, System-Anweisung, Completion-Rule) vor. Du kopierst sie per Knopfdruck in Brian, testest die Aufgabe und trägst die Brian-ID zurück ein — dann kann z. B. deine Moodle-Seite direkt auf die richtige Brian-Aufgabe verlinken.',
    features: [
      'Aufklappbare Schritt-für-Schritt-Anleitung: vom Anlegen der Aufgabe in Brian bis zur Rückmeldung der ID',
      'Pro Aufgabe alle Brian-Segmente einzeln kopierbar — inklusive Bewertungsrubriken bei Projektaufgaben',
      'Bei Aufgabensequenzen steckt der Schritt-Ablauf bereits in der System-Anweisung',
      '„Übertragen"-Bestätigung erfasst Brian-ID und optionalen Deep-Link',
      'Status-Übersicht: Welche Aufgaben sind bereit, welche schon in Brian?',
    ],
    faqs: [
      { question: 'Warum muss ich das händisch machen?', answer: 'Brian.study bietet aktuell keine öffentliche Schnittstelle, über die Aufgaben automatisch angelegt werden könnten. Der Poolmanager bereitet dir aber alle Texte fertig vor — pro Aufgabe brauchst du nur wenige Minuten. Sobald eine API verfügbar ist, wird dieser Schritt automatisiert.' },
      { question: 'Welche Aufgaben erscheinen hier?', answer: 'Alle freigegebenen KI-Tutor-Aufgaben der Einheit — allgemeine Aufgaben (auch Ebene 1), Transfer- und Projektaufgaben. Handlungsaufgaben und externe HTML-Seiten brauchen keinen Brian-Export.' },
      { question: 'Wozu dient die Brian-ID?', answer: 'Sie verknüpft die Aufgabe im Poolmanager mit der Aufgabe in Brian. Bei Exporten (z. B. Moodle-Seiten) wird die ID mitgegeben, sodass direkt auf die richtige Brian-Aufgabe verlinkt werden kann.' },
      { question: 'Was passiert, wenn ich eine Aufgabe später ändere?', answer: 'Ihr Brian-Status springt auf „Geändert". Du kopierst die aktualisierten Segmente erneut in die bestehende Brian-Aufgabe und bestätigst die Übertragung noch einmal.' },
    ],
    docsSlug: 'export-workflow',
  },
};

// Tabs, die im Basismodul-Modus sichtbar sind (in dieser Reihenfolge).
// Basismodule sind reduzierte, ÖFFENTLICHE Einheiten: keine allgemeinen/
// Projekt-Aufgaben, keine Dashboards — aber MIT Freigabe-Cockpit, weil sie
// kollaborativ gepflegt und über das Export-Center exportiert werden.
// Die Steps werden für die Anzeige frisch von 1 durchnummeriert.
const BASISMODUL_TAB_VALUES = ['einheit', 'struktur', 'lernziele', 'aktivitaeten', 'aufgaben', 'cockpit'];

export default function WorkspaceTabs({ activeTab, onTabChange, isBasismodul = false, istPrivat = false }) {
  const { rolle } = useRBAC();
  let visibleTabs = getVisibleTabs(rolle, isBasismodul);

  // Private Einheiten: kein Freigabe-Cockpit — der Moodle-Weg läuft dort
  // direkt über den Einheiten-Code auf Tab 1. Dafür bekommen sie den
  // Brian-Export-Tab, weil die Lehrkraft die Übertragung selbst macht.
  if (istPrivat) {
    visibleTabs = visibleTabs.filter((t) => t.value !== 'cockpit');
    visibleTabs = [...visibleTabs, BRIAN_TAB];
  }

  if (isBasismodul) {
    visibleTabs = BASISMODUL_TAB_VALUES
      .map((val) => visibleTabs.find((t) => t.value === val))
      .filter(Boolean)
      .map((tab, idx) => ({ ...tab, step: idx + 1 }));
  }
  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {visibleTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          return (
            <div key={tab.value} className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                      'flex items-center gap-1.5 py-1 rounded-md border transition-all font-medium',
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm px-3 justify-start'
                        : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/50 px-2 justify-center'
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-all',
                      isActive
                        ? 'bg-primary-foreground text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}>
                      {tab.step}
                    </span>
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs font-medium">
                  {tab.label}
                </TooltipContent>
              </Tooltip>
              {isActive && <div className="absolute -top-1 -right-1"><HelpDialog {...tab.help} /></div>}
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}