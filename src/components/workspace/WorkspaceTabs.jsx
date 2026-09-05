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
import { BookOpen, LayoutGrid, Package, ClipboardList, Target, Compass, ListChecks, Bot, ShieldCheck } from 'lucide-react';
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
      description: 'Die Steckbrief-Seite der Einheit. Hier stehen Titel, Fach und Jahrgang, hier wird festgelegt, wer mitarbeiten darf, und hier wird die Einheit für die Kolleginnen und Kollegen zum Bearbeiten geöffnet oder wieder geschlossen. Das macht die Fachschaftsleitung — alle anderen können hier mitlesen.',
      features: [
        'Titel, Fach, Jahrgang und Halbjahr der Einheit festlegen',
        'Die großen Ziele der Einheit notieren — das „Wo wollen wir am Ende hin?"',
        'Kolleginnen und Kollegen zur Einheit dazuholen und festlegen, wer ändern und wer nur lesen darf',
        'Die Einheit zum Bearbeiten öffnen oder wieder schließen',
      ],
      faqs: [
        { question: 'Warum kann ich hier nichts ändern?', answer: 'Diese Seite gehört der Fachschaftsleitung. Sie steckt den Rahmen ab — deine Arbeit passiert in den Lernpaketen und den Aufgaben-Reitern weiter rechts.' },
        { question: 'Was heißt „Einheit geschlossen"?', answer: 'Dann kann niemand mehr Inhalte ändern, außer der Fachschaftsleitung. Das ist sinnvoll, wenn alles fertig ist und die Einheit gerade in den Kurs übertragen wird — so ändert sich nichts mehr unter der Hand.' },
        { question: 'Wen muss ich hier eintragen?', answer: 'Alle Kolleginnen und Kollegen, die in dieser Einheit mitarbeiten sollen. Wer nicht eingetragen ist, kann nichts ändern. „Nur lesen" ist praktisch für alle, die nur einmal hineinschauen möchten.' },
      ],
      docsSlug: 'einheiten-struktur',
    },
  },
  {
    value: 'struktur', label: 'Struktur der Einheit', icon: LayoutGrid, step: 2,
    help: {
      title: 'Struktur der Einheit',
      description: 'Hier entsteht das Inhaltsverzeichnis der Einheit: Welche Themen gibt es, und welche Lernpakete gehören zu welchem Thema? Das ist das Gerüst, in das später die Aufgaben einziehen. Auch das macht die Fachschaftsleitung — du kannst hier nachschauen, wo was einsortiert ist.',
      features: [
        'Themen anlegen und in eine sinnvolle Reihenfolge bringen',
        'Lernpakete zu einem Thema anlegen und ihre Reihenfolge festlegen',
        'Pro Thema entscheiden: dürfen die Schüler frei wählen oder müssen sie der Reihe nach vorgehen?',
        'Auf einen Blick sehen, welches Lernpaket zu welchem Thema gehört',
      ],
      faqs: [
        { question: 'Was ist ein Themenfeld?', answer: 'Ein Kapitel deiner Einheit — zum Beispiel „Grundrechenarten". In ein Themenfeld kommen mehrere Lernpakete, so wie in ein Buchkapitel mehrere Abschnitte.' },
        { question: 'Frei wählen oder der Reihe nach?', answer: '„Frei" heißt: Die Schüler dürfen sich aussuchen, mit welchem Lernpaket sie anfangen. „Der Reihe nach" heißt: Sie müssen von oben nach unten durch. Das Zweite ist sinnvoll, wenn ein Paket auf dem vorherigen aufbaut.' },
        { question: 'Warum kann ich hier nichts ändern?', answer: 'Das Gerüst legt die Fachschaftsleitung fest. So kann niemand versehentlich das Inhaltsverzeichnis einer Einheit umbauen, an der gerade mehrere Leute arbeiten. Ansehen darfst du natürlich alles.' },
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
    value: 'lernpakete', label: 'Lernpakete (Ebene 1)', icon: Package, step: 4, art: 'lernpaket',
    help: {
      title: 'Lernpakete (Ebene 1) — Aktivitäten & Aufgaben an einem Ort',
      description: 'Hier füllst du als Fachlehrkraft die Lernpakete mit Leben — alles in einem Tab. Links wählst du im Baum ein Lernpaket: Rechts legst du fest, WELCHE Aktivitäten es pro Phase (Erarbeitung · Übung · Abschluss) enthält, startest den Aufgabeneditor (KI) und gibst das Paket frei. Klickst du im Baum tiefer auf eine Aktivität, öffnet sich direkt die Aufgaben-Werkstatt: Dort arbeitest du die konkreten Inhalte aus (z. B. die Lückentext-Sätze), legst Mastervorlagen an und lässt dir KI-Klone generieren. Die Ansicht rechts folgt immer deiner Auswahl im Baum.',
      features: [
        'Lernpaket auswählen → Phasen konfigurieren, Aktivitäten aus dem Katalog zuordnen, Aufgabeneditor (KI) starten',
        'Aktivität auswählen → konkrete Aufgabeninhalte befüllen und über die Vorschau in der Schüler-Ansicht prüfen',
        'Mastervorlagen anlegen und daraus per KI Varianten (Klone) generieren — jeder Klon einzeln kontrollierbar',
        'Freigabe an einem Ort: erst Aktivitäten/Master freigeben, dann das ganze Lernpaket',
        'Schüler-Vorschau des gesamten Lernpakets direkt in der Paket-Ansicht',
      ],
      faqs: [
        { question: 'Wo ist der Unterschied zwischen Paket- und Aktivitäts-Ansicht?', answer: 'Im Lernpaket entscheidest du, WELCHE Aktivitäten es gibt (z. B. „Lückentext" als Übungsform). Klickst du im Baum auf eine Aktivität, füllst du deren konkrete Inhalte (z. B. die einzelnen Lückentext-Sätze mit Lösungen).' },
        { question: 'Was ist eine Mastervorlage?', answer: 'Eine Muster-Aufgabe, die du einmal sauber baust (z. B. „Berechne den Flächeninhalt"). Aus dieser Vorlage erzeugt die KI dir auf Knopfdruck weitere strukturell identische Aufgaben mit anderen Zahlen oder Begriffen.' },
        { question: 'Wann kann ich ein Lernpaket freigeben?', answer: 'Sobald alle aktiven Aktivitäten des Pakets vollständig sind. Freigegebene Pakete sind gegen versehentliche Änderungen gesperrt.' },
        { question: 'Was bedeutet das grüne Schloss?', answer: 'Das Element wurde bewusst freigegeben und ist gegen versehentliche Änderungen gesperrt. Wenn du doch noch etwas ändern willst, musst du die Freigabe erst aktiv zurückziehen.' },
        { question: 'Was ist der Unterschied zu den allgemeinen Aufgaben (Ebene 2)?', answer: 'Die Aufgaben hier sind kurze, automatisch auswertbare Übungen direkt im Lernpaket. Die allgemeinen Aufgaben (Ebene 2) sind die größeren, offenen Transfer-Aufgaben, die vom KI-Tutor begleitet werden.' },
      ],
      docsSlug: 'lernpakete-aktivitaeten',
    },
  },
  {
    value: 'ebene2', label: 'Allgemeine Aufgaben (Ebene 2)', icon: ClipboardList, step: 5, art: 'aufgabe',
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
    value: 'ebene3', label: 'Projektaufgaben (Ebene 3)', icon: Target, step: 6, art: 'projekt',
    help: {
      title: 'Projektaufgaben (Ebene 3)',
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
    value: 'dashboards', label: 'Arbeitspläne (Lernpfade)', icon: Compass, step: 7,
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
        { question: 'Was bedeutet „Prüfen & freigeben"?', answer: 'Der Pfad wird auf vollständige (grüne) Aufgaben geprüft und als „geprüft" markiert. Danach ist der Pfad gegen Änderungen gesperrt – Änderungen sind erst nach „Entsperren" wieder möglich.' },
        { question: 'Verändere ich hier die Aufgaben selbst?', answer: 'Nein. Die Aufgaben aus den Aufgaben-Tabs bleiben unverändert. Du legst hier nur fest, IN WELCHEM Sektor und in welcher Reihenfolge sie für die jeweilige Intensitätsstufe angeboten werden.' },
        { question: 'Warum kann ich nicht bearbeiten?', answer: 'Dieser Tab hat eine eigene strukturelle Sperre. Wenn jemand anderes gerade an diesem Lernpfad arbeitet oder der Pfad bereits geprüft/freigegeben ist, siehst du nur den Lese-Modus.' },
      ],
      docsSlug: 'dashboards-v2',
    },
  },
  ];

  return allTabs.filter(tab => {
    // Tab 7 (Dashboards): für alle Lehrkräfte/Admins sichtbar
    if (tab.value === 'dashboards') return true;
    // Tabs 1 & 2 (Einheit verwalten, Struktur) sind für ALLE sichtbar (auch Fachlehrkräfte)
    // Tabs 3-6 sind für alle Lehrkräfte sichtbar
    return true;
  });
};

// Prüfbereich — NUR für gemeinschaftliche Poolzeit-Einheiten. Hier läuft die
// Vorprüfung auf die fünf MBK-Fehlerkategorien, deren Befunde als Taskliste
// abgearbeitet werden.
const PRUEFUNG_TAB = {
  value: 'pruefung', label: 'Vollständigkeitsprüfung', icon: ShieldCheck, step: 8,
  help: {
    title: 'Vollständigkeitsprüfung',
    description: 'Der Endcheck, bevor deine Einheit zu den Schülern geht. Du drückst auf „Prüfung starten" und der Pool-Manager schaut jedes Lernpaket und jede Aufgabe durch: Ist irgendwo noch ein Platzhalter stehen geblieben? Fehlt ein Arbeitsblatt? Ist eine Aufgabenstellung so knapp, dass ein Schüler sie nicht versteht? Alles, was auffällt, landet hier als Aufgabenliste — jeder Punkt mit einem Knopf, der dich direkt an die richtige Stelle bringt.',
    features: [
      'Prüfung starten und dabei zusehen — du siehst, welches Lernpaket gerade dran ist',
      'Zwei Stufen: der schnelle Check findet Lücken, die Intensivprüfung liest zusätzlich mit, ob die Aufgaben verständlich und sinnvoll sind',
      'Jeder Punkt hat einen Knopf, der dich direkt zur betroffenen Stelle bringt',
      'Erledigtes abhaken — der nächste Durchlauf bestätigt dir, dass es jetzt passt',
      'Punkte, die absichtlich so bleiben sollen, mit einer kurzen Begründung stehen lassen',
    ],
    faqs: [
      { question: 'Muss ich alles abarbeiten, was hier steht?', answer: 'Nein. Du bist die Fachkraft, nicht das Programm. Wenn ein Hinweis für deine Klasse nicht passt, klickst du auf „bewusst so gelassen" und schreibst einen Satz dazu. Damit ist der Punkt erledigt und taucht nicht wieder auf.' },
      { question: 'Was macht die Intensivprüfung anders?', answer: 'Der schnelle Check sucht nur nach Lücken — leere Felder, fehlende Dateien. Die Intensivprüfung liest deine Aufgaben zusätzlich mit und meldet, wenn eine Aufgabenstellung unklar ist, die Musterlösung fehlt oder ein Text für die Jahrgangsstufe zu schwer ist. Sie braucht dafür ein paar Minuten.' },
      { question: 'Blockiert die Prüfung irgendwas?', answer: 'Nein. Du kannst die Einheit jederzeit an die Schüler geben, auch mit offenen Punkten. Die Prüfung ist eine Hilfe, keine Schranke.' },
      { question: 'Was heißt „wieder gefunden"?', answer: 'Du hattest den Punkt als erledigt abgehakt, beim nächsten Durchlauf war er aber noch da. Meist ist dann eine Änderung nicht gespeichert worden — bitte noch einmal hinschauen.' },
    ],
    docsSlug: 'export-workflow',
  },
};

// Brian-Export-Tab — NUR für PRIVATE Einheiten. Bei Poolzeit-Einheiten läuft
// der Brian-Workflow zentral im Export-Center; bei privaten Einheiten macht
// die Lehrkraft die Übertragung nach Brian.study selbst (händisch, mit
// Anleitung und Kopier-Cockpit direkt im Workspace).
const BRIAN_TAB = {
  value: 'brian', label: 'Ab in den Unterricht (Moodle & KI-Tutor)', icon: Bot, step: 8,
  help: {
    title: 'Ab in den Unterricht — Moodle und KI-Tutor',
    description: 'Hier kommt deine Einheit zu den Schülern. Oben steht Schritt für Schritt, wie du sie über einen kurzen Code in deinen Moodle-Kurs einbaust. Darunter richtest du die Aufgaben ein, bei denen der KI-Tutor Brian die Schüler begleitet: Der Pool-Manager schreibt dir alle nötigen Texte fertig auf, du kopierst sie mit einem Klick nach Brian und trägst danach die Nummer ein, die Brian dir gibt.',
    features: [
      'Schritt-für-Schritt-Anleitung zum Aufklappen: von der Aufgabe in Brian bis zur fertigen Verknüpfung',
      'Alle Texte einzeln zum Kopieren vorbereitet — bei Projektaufgaben auch die Bewertungskriterien',
      'Bei mehrschrittigen Aufgaben ist der Ablauf schon eingebaut',
      'Nach dem Kopieren bestätigst du kurz, dass es geklappt hat',
      'Übersicht: Welche Aufgaben sind fertig, welche fehlen noch?',
    ],
    faqs: [
      { question: 'Warum muss ich das von Hand kopieren?', answer: 'Brian bietet uns dafür noch keinen automatischen Weg an. Alle Texte liegen aber fertig bereit — pro Aufgabe sind es nur wenige Klicks. Sobald es automatisch geht, verschwindet dieser Schritt.' },
      { question: 'Welche Aufgaben stehen hier?', answer: 'Alle fertigen Aufgaben deiner Einheit, bei denen der KI-Tutor mitarbeitet. Aufgaben, die die Schüler ohne Tutor bearbeiten, brauchen diesen Schritt nicht und erscheinen deshalb gar nicht.' },
      { question: 'Wozu die Nummer aus Brian?', answer: 'Sie verbindet deine Aufgabe hier mit der Aufgabe in Brian. Nur so kann die Seite in Moodle die Schüler direkt zur richtigen Aufgabe schicken.' },
      { question: 'Ich habe eine Aufgabe nachträglich geändert — was nun?', answer: 'Sie wird als „geändert" markiert. Kopiere die neuen Texte einfach noch einmal in die bestehende Brian-Aufgabe und bestätige erneut.' },
    ],
    docsSlug: 'export-workflow',
  },
};

// Tabs, die im Basismodul-Modus sichtbar sind (in dieser Reihenfolge).
// Basismodule sind reduzierte, ÖFFENTLICHE Einheiten: keine allgemeinen/
// Projekt-Aufgaben, keine Dashboards — aber MIT Freigabe-Cockpit, weil sie
// kollaborativ gepflegt und über das Export-Center exportiert werden.
// Die Steps werden für die Anzeige frisch von 1 durchnummeriert.
const BASISMODUL_TAB_VALUES = ['einheit', 'struktur', 'lernziele', 'lernpakete'];

/**
 * Reiter eines ÜBUNGSBLOCKS — das kleine Format für die Poolzeit.
 *
 * Weggelassen gegenüber der Einheit:
 *   'struktur'  — es gibt genau EIN Themenfeld, das beim Anlegen entsteht.
 *                 Ein Reiter zum Verwalten mehrerer wäre leer.
 *   'lernziele' — im Übungsblock reicht das Freitextfeld "Ziele" aus Reiter 1.
 *                 Die verknüpfte Lernziel-Verwaltung gehört zur großen Einheit.
 *   'ebene3'    — Projektaufgaben gehören zu großen Einheiten.
 *
 * Der Export-Reiter kommt wie bei jeder privaten Einheit dazu (BRIAN_TAB) —
 * darüber läuft auch der Einheiten-Code für die Moodle-Einbindung.
 */
const UEBUNGSBLOCK_TAB_VALUES = ['einheit', 'lernpakete', 'ebene2', 'dashboards'];

// Inhaltsfarben der Tabs 4–6 — identisch zur Farbsprache der Lernpfade
// (blau = Lernpakete, orange = Aufgaben, lila = Projekte).
const TAB_ART_STYLE = {
  lernpaket: {
    active: 'bg-blue-600 text-white border-blue-700 shadow-sm',
    activeStep: 'bg-white text-blue-700',
    idle: 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400',
    idleStep: 'bg-blue-100 text-blue-700',
  },
  aufgabe: {
    active: 'bg-orange-600 text-white border-orange-700 shadow-sm',
    activeStep: 'bg-white text-orange-700',
    idle: 'bg-orange-50 border-orange-300 text-orange-700 hover:bg-orange-100 hover:border-orange-400',
    idleStep: 'bg-orange-100 text-orange-700',
  },
  projekt: {
    active: 'bg-violet-600 text-white border-violet-700 shadow-sm',
    activeStep: 'bg-white text-violet-700',
    idle: 'bg-violet-50 border-violet-300 text-violet-700 hover:bg-violet-100 hover:border-violet-400',
    idleStep: 'bg-violet-100 text-violet-700',
  },
};

export default function WorkspaceTabs({ activeTab, onTabChange, isBasismodul = false, istPrivat = false, istUebungsblock = false }) {
  const { rolle } = useRBAC();
  let visibleTabs = getVisibleTabs(rolle, isBasismodul);

  // Private Einheiten bekommen den Brian-Export-Tab, weil die Lehrkraft die
  // Übertragung nach Brian.study selbst vornimmt.
  if (istPrivat) {
    visibleTabs = [...visibleTabs, BRIAN_TAB];
  } else if (!isBasismodul) {
    // Gemeinschaftliche Poolzeit-Einheiten: Prüfbereich als Reiter 8.
    visibleTabs = [...visibleTabs, PRUEFUNG_TAB];
  }

  if (istUebungsblock) {
    visibleTabs = [...UEBUNGSBLOCK_TAB_VALUES, 'brian']
      .map((val) => visibleTabs.find((t) => t.value === val))
      .filter(Boolean)
      .map((tab, idx) => ({ ...tab, step: idx + 1 }));
  } else if (isBasismodul) {
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
          const artStyle = tab.art ? TAB_ART_STYLE[tab.art] : null;
          return (
            <div key={tab.value} className="relative">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onTabChange(tab.value)}
                    className={cn(
                      'flex items-center gap-1.5 py-1 rounded-md border transition-all font-medium',
                      isActive
                        ? cn('px-3 justify-start', artStyle ? artStyle.active : 'bg-primary text-primary-foreground border-primary shadow-sm')
                        : cn('px-2 justify-center', artStyle ? artStyle.idle : 'bg-card border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/50')
                    )}
                  >
                    <span className={cn(
                      'flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-all',
                      isActive
                        ? (artStyle ? artStyle.activeStep : 'bg-primary-foreground text-primary')
                        : (artStyle ? artStyle.idleStep : 'bg-muted text-muted-foreground')
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