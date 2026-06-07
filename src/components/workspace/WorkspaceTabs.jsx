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
import { BookOpen, LayoutGrid, Zap, Wand2, ClipboardList, Target, CheckSquare, Compass, ListChecks } from 'lucide-react';
import HelpDialog from '@/components/ui/HelpDialog';
import { useRBAC } from '@/hooks/useRBAC';
import { ROLLEN } from '@/lib/rbac';

// ✅ TAB-SPERREN: Welche Tabs sind für welche Rolle sichtbar?
const getVisibleTabs = (rolle) => {
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
      description: 'In Tab 4 ordnest du als Fachlehrkraft den einzelnen Aktivitäten aus Tab 3 die konkreten Aufgabeninhalte zu. Wenn du z. B. in Tab 3 die Aktivität „Lückentext" gewählt hast, schreibst du hier die einzelnen Lückentext-Sätze – oder du lässt sie dir mithilfe einer Mastervorlage von der KI klonen. Diese Aufgaben werden später automatisch und unmittelbar in den Lernpaketen ausgewertet.',
      features: [
        'Du wählst links im Baum eine Aktivität und befüllst rechts deren konkrete Aufgabe',
        'Du legst Mastervorlagen an, aus denen die KI dir auf Knopfdruck Varianten (Klone) generiert',
        'Du kontrollierst und justierst jeden Klon einzeln, bevor er freigegeben wird',
        'Du gibst Aufgaben frei – freigegebene Aufgaben sind gesperrt und tauchen im Freigabe-Cockpit (Tab 8) auf',
      ],
      faqs: [
        { question: 'Was ist eine Mastervorlage?', answer: 'Eine Mastervorlage ist eine Muster-Aufgabe, die du einmal sauber baust (z. B. „Berechne den Flächeninhalt"). Aus dieser Vorlage erzeugt die KI dir dann auf Knopfdruck weitere strukturell identische Aufgaben mit anderen Zahlen oder Begriffen.' },
        { question: 'Wann kann ich eine Aufgabe freigeben?', answer: 'Sobald alle Pflichtfelder ausgefüllt sind, erscheint der „Freigeben"-Button. Freigegebene Aufgaben werden in Tab 8 (Freigabe-Cockpit) für den Export vorgemerkt.' },
        { question: 'Was ist der Unterschied zu Tab 5 (Allgemeine Aufgaben)?', answer: 'Ebene-1-Aufgaben hier in Tab 4 sind kurze, automatisch auswertbare Übungen direkt im Lernpaket (Lückentext, Zuordnung, Quiz …). Tab 5 enthält die größeren, offenen Transfer-Aufgaben, bei denen Schüler:innen selbstständig formulieren und vom KI-Tutor begleitet werden.' },
      ],
      docsSlug: 'ebene-1-basismodule',
    },
  },
  {
    value: 'ebene2', label: 'Allgemeine Aufgaben (Ebene 2)', icon: ClipboardList, step: 6,
    help: {
      title: 'Allgemeine Aufgaben (Ebene 2 – Transfer)',
      description: 'In Tab 5 erstellst du als Fachlehrkraft die allgemeinen Transfer-Aufgaben deiner Einheit (Ebene 2). Das sind die größeren, offenen Aufgaben, bei denen Schüler:innen das in den Lernpaketen Gelernte auf eine neue Situation anwenden müssen – z. B. eine Quelle analysieren, ein Diagramm auswerten oder eine kurze Erörterung schreiben. Begleitet werden sie dabei vom KI-Tutor Brian.study, den du in diesem Tab gleich mit konfigurierst. Verschiedene Aufgabentypen (Inhalts-Aufgabe, Prozess-Aufgabe, Handlungs-Aufgabe, Auswahl-Bündel) stehen dir zur Verfügung, je nachdem, welche Denkleistung du fordern willst.',
      features: [
        'Du beschreibst Aufgaben mit Text, Bild, PDF oder Materialien aus dem Lehrwerk',
        'Du wählst pro Aufgabe Typ und Mission (Problem, Recherche, Anwendung, Transfer …) sowie Schwierigkeitsgrad (1–3 Sterne)',
        'Du verknüpfst die benötigten Lernziele/Basismodule per Drag & Drop – das ist die Grundlage für das KI-Tutor-Feedback',
        'Du lässt dir vom KI-Aufgaben-Assistenten aus einer groben Idee (auch per Sprache) einen vollständigen Aufgabenentwurf erzeugen',
        'Du füllst den Erwartungshorizont aus oder lässt ihn per KI generieren – das ist das „Gehirn" für den KI-Tutor',
        'Du baust Auswahl-Bündel, in denen Schüler:innen aus mehreren Aufgaben wählen dürfen',
      ],
      faqs: [
        { question: 'Was ist der Unterschied zu Tab 4 (Ebene 1)?', answer: 'Tab 4 enthält kurze, automatisch auswertbare Übungen direkt in einem Lernpaket. Tab 5 enthält die offenen Transfer-Aufgaben der ganzen Einheit – sie sind nicht an ein einzelnes Lernpaket gebunden, sondern werden später in den Lerntypen-Pfaden (Tab 7) eingesetzt.' },
        { question: 'Was ist die Kompetenz- bzw. Lernziel-Zuordnung?', answer: 'Du weist der Aufgabe per Drag & Drop genau die Lernziele zu, die sie trainiert. Brian.study nutzt diese Verknüpfung, um Schüler:innen bei Lücken gezielt auf passende Ebene-1-Übungen zurückzuverweisen.' },
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
      description: 'In Tab 6 erstellst du als Fachlehrkraft die anspruchsvollen Anwendungs- und Projektaufgaben (Ebene 3). Das sind die offenen, kreativen Aufgaben, bei denen deine Schüler:innen ein Produkt oder Projekt selbstständig planen und erstellen – z. B. ein Plakat, ein Podcast, eine Präsentation oder ein Portfolio. Da es hier keine eindeutige Musterlösung gibt, definierst du Abgabeformat, Bewertungsrubriken und einen Projekt-Coach (KI-Tutor), der die Lernenden über mehrere Sitzungen begleitet.',
      features: [
        'Du wählst zwischen Anwendungsaufgabe (kürzer, fokussiert) und Projektaufgabe (umfangreicher, produktorientiert)',
        'Du nutzt den KI-Aufgaben-Assistenten, um aus einer groben Idee (auch per Sprache) einen Aufgabenentwurf zu erzeugen',
        'Du legst Abgabeformat und „Besonderen Fokus" fest und lässt dir daraus die Bewertungsrubriken per KI vorschlagen',
        'Du verfeinerst Rubriken (Titel · Punkte · Kriterientext) im Brian-Format manuell nach',
        'Du füllst die Lernlandkarte: welche Lernziele/Basismodule sind für dieses Projekt zwingend nötig?',
        'Du lässt den vollständigen Projekt-Coach-Prompt automatisch aus Aufgabe + Rubriken + Lernlandkarte generieren',
      ],
      faqs: [
        { question: 'Was ist der Unterschied zwischen Anwendungs- und Projektaufgabe?', answer: 'Anwendungsaufgaben sind kürzer und fokussierter (z. B. einen Text analysieren). Projektaufgaben sind umfangreicher und verlangen eigenständige Planung, Recherche und Umsetzung – meist über mehrere Sitzungen.' },
        { question: 'Was sind Bewertungsrubriken im Brian-Format?', answer: 'Anstelle starrer Schulnoten gibt es thematische Kategorien (z. B. „Inhaltliche Tiefe", „Darstellung") mit Punktzahl und Kriterientext. Die KI generiert dir auf Basis von Aufgabe und Fokus 2–3 passende Kategorien als Startpunkt.' },
        { question: 'Was ist der Projekt-Coach?', answer: 'Ein speziell konfigurierter KI-Tutor, der Schüler:innen per Sokrates-Methode durch das Projekt führt – ohne die Lösung vorwegzunehmen. Du erzeugst seinen Prompt im Reiter „KI-Tutor Prompt" auf Knopfdruck.' },
        { question: 'Warum verlangt das System Lernziele für ein Projekt?', answer: 'Damit Brian.study weiß, welche Grundlagen aus Ebene 1 das Projekt voraussetzt. Wenn ein:e Lerner:in scheitert, kann der Tutor gezielt zurück zu den passenden Basis-Übungen verweisen.' },
      ],
      docsSlug: 'ebene-3-projektaufgaben',
    },
  },
  {
    value: 'dashboards', label: 'Dashboards (Lernpfade)', icon: Compass, step: 8,
    help: {
      title: 'Dashboards – Lernpfad-Architekt',
      description: 'In diesem Tab baust du als Fachlehrkraft die vier individuellen Lernpfade deiner Einheit – einen pro Lerntyp (Minimalist · Pragmatiker · Ehrgeizig · Passioniert). Du arrangierst dabei die allgemeinen Aufgaben (Ebene 1/2) und Projektaufgaben (Ebene 3) sowie globale System-Bausteine (Lernlandkarte, Diagnose, Wissensspeicher …) zu klar strukturierten Sektoren. Ergebnis: Jede:r Lernende sieht später ein Dashboard, das genau auf sein Lernprofil zugeschnitten ist.',
      features: [
        'Du wählst oben den Lerntyp aus und arbeitest pro Lerntyp an einem eigenen Pfad',
        'Im Material-Pool links findest du alle allgemeinen Aufgaben und Projektaufgaben sowie globale System-Bausteine',
        'Über den „Guide" spielst du das passende Standard-Raster für den Lerntyp ein (Orientierung → Einstieg → Training → Test → Projekt)',
        'Du legst neue Sektoren an und steuerst pro Sektor die Bearbeitungsreihenfolge („sequenziell" / „frei") sowie die Freischaltung (sofort oder nach Abschluss eines anderen Sektors)',
        'Per Drag & Drop sortierst du Aufgaben und Bausteine in die Sektoren ein – mit Live-Ampel-Status pro Aufgabe',
        'Mit „Prüfen & freigeben" markierst du den Pfad pro Lerntyp als geprüft und sperrst ihn gegen versehentliche Änderungen',
      ],
      faqs: [
        { question: 'Was sind die vier Lerntypen?', answer: 'Schülerprofile mit unterschiedlicher Lernstrategie: Minimalist (Fokus auf Basis sichern), Pragmatiker (will effizient zum Ziel), Ehrgeizig (vollständige Prüfungsvorbereitung), Passioniert (große Freiheit, Schwerpunkt Projekte).' },
        { question: 'Was bedeutet die Sektor-Freischaltung?', answer: 'Pro Sektor legst du fest, ob er sofort zugänglich ist oder erst, nachdem ein anderer Sektor vollständig erledigt wurde. So baust du gestufte Lernpfade, ohne starre Gesamt-Reihenfolge.' },
        { question: 'Was macht „Standard-Raster laden"?', answer: 'Der Guide spielt das didaktisch passende Sektor-Gerüst für den aktuellen Lerntyp ein. Bestehende Aufgaben werden dabei NICHT überschrieben – du bekommst nur die Struktur dazu.' },
        { question: 'Was bedeutet „Prüfen & freigeben"?', answer: 'Der Pfad wird auf vollständige (grüne) Aufgaben geprüft und als „geprüft" markiert. Danach ist der Pfad gegen Änderungen gesperrt (und erscheint im Freigabe-Cockpit als „Geprüft") – Änderungen sind erst nach „Entsperren" wieder möglich.' },
        { question: 'Verändere ich hier die Aufgaben selbst?', answer: 'Nein. Die Aufgaben aus den Aufgaben-Tabs bleiben unverändert. Du legst hier nur fest, IN WELCHEM Sektor und in welcher Reihenfolge sie für den jeweiligen Lerntyp angeboten werden.' },
        { question: 'Warum kann ich nicht bearbeiten?', answer: 'Dieser Tab hat eine eigene strukturelle Sperre. Wenn jemand anderes gerade an diesem Lernpfad arbeitet oder der Pfad bereits geprüft/freigegeben ist, siehst du nur den Lese-Modus.' },
      ],
      docsSlug: 'dashboards-v2',
    },
  },
  {
    value: 'cockpit', label: 'Freigabe-Cockpit (Moodle)', icon: CheckSquare, step: 9,
    help: {
      title: 'Freigabe-Cockpit – Status auf einen Blick',
      description: 'Das Freigabe-Cockpit ist eine reine Informationsseite. Es zeigt dir den Zustand der gesamten Einheit auf einen Blick: Strukturboard, Einheits-Informationen, Lernpakete, allgemeine Aufgaben, Projektaufgaben und die vier Dashboards – jeweils mit ihrem Lebenszyklus (Moodle-Sync) und Freigabestatus. Hier wird nichts bearbeitet und nichts exportiert; du erkennst nur sofort, welche Bestandteile fertig sind und welche noch Aufmerksamkeit brauchen. Der eigentliche Export findet im zentralen Export-Center (Hauptmenü) statt.',
      features: [
        'Übersicht aller Einheiten-Bestandteile in einer kompakten Tabelle',
        'Lebenszyklus-Badge pro Element: Neu · Synchron · Geändert (Moodle-Sync-Status)',
        'Freigabe-Badge (Entwurf / Freigegeben) bei Lernpaketen und Aufgaben',
        'Bei den Dashboards zusätzlich der Prüf-Status: „In Bearbeitung" oder „Geprüft" (gesperrt)',
        'Per Klick auf eine Aufgabe springst du direkt in den passenden Arbeitsbereich',
      ],
      faqs: [
        { question: 'Kann ich hier etwas bearbeiten oder exportieren?', answer: 'Nein. Das Cockpit ist nur eine Statusübersicht. Bearbeitet wird in den Tabs 1–7, der eigentliche Export läuft im zentralen Export-Center (Hauptmenü).' },
        { question: 'Was bedeutet das Badge „Neu" bzw. „Geändert"?', answer: '„Neu" heißt: noch nie nach Moodle exportiert. „Synchron" heißt: aktuell live in Moodle. „Geändert" heißt: seit dem letzten Export wurde etwas verändert – ein erneuter Export ist nötig.' },
        { question: 'Was bedeutet „Geprüft" bei einem Dashboard?', answer: '„Geprüft" zeigt, dass der Lernpfad geprüft und gegen Bearbeitung gesperrt wurde. „In Bearbeitung" heißt, dass am Pfad noch Änderungen möglich sind.' },
        { question: 'Warum sehe ich dieses Cockpit als Fachlehrkraft nicht?', answer: 'Es ist auf Admin und Moodle-Designer / Export-Team beschränkt. Fachlehrkräfte sind mit der Freigabe ihrer Inhalte in den Tabs 3–7 fertig.' },
      ],
      docsSlug: 'export-workflow',
    },
  },
  ];

  return allTabs.filter(tab => {
    // Tab 8 (Freigabe-Cockpit) nur für Admin und Moodle-Designer
    if (tab.value === 'cockpit') {
      return showExportTabs;
    }
    // Tab 7 (Dashboards): für alle Lehrkräfte/Admins sichtbar
    if (tab.value === 'dashboards') return true;
    // Tabs 1 & 2 (Einheit verwalten, Struktur) sind für ALLE sichtbar (auch Fachlehrkräfte)
    // Tabs 3-6 sind für alle Lehrkräfte sichtbar
    return true;
  });
};

// Tabs, die im Basismodul-Modus sichtbar sind (in dieser Reihenfolge).
// Basismodule sind reduzierte Einheiten: keine allgemeinen/Projekt-Aufgaben,
// keine Dashboards, kein Export-Cockpit. Die Steps werden für die Anzeige
// frisch von 1 durchnummeriert.
const BASISMODUL_TAB_VALUES = ['einheit', 'struktur', 'lernziele', 'aktivitaeten', 'aufgaben'];

export default function WorkspaceTabs({ activeTab, onTabChange, isBasismodul = false }) {
  const { rolle } = useRBAC();
  let visibleTabs = getVisibleTabs(rolle);

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