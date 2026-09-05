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
      description: 'Hier stehen alle Lernziele der Einheit an einem Ort, sortiert nach Themenfeld und Lernpaket. Du schreibst pro Lernpaket auf, was die Schüler am Ende können sollen — einmal in deiner Fachsprache und einmal so, dass ein Schüler es versteht. Wenn du willst, formuliert die KI beide Fassungen aus deiner Idee vor.',
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
    value: 'lernpakete', label: 'Lernpakete (Grundlagen)', icon: Package, step: 4, art: 'lernpaket',
    help: {
      title: 'Lernpakete — hier entstehen die Grundlagen-Übungen',
      description: 'Ein Lernpaket ist ein kleines Übungsheft zu einem Lernziel: erst ein Erklärtext oder Video, dann Übungen, zum Schluss ein kurzer Check. Links im Baum klickst du ein Lernpaket an. Rechts entscheidest du, welche Übungsformen hineinkommen — zum Beispiel ein Lückentext, ein Zuordnungsspiel oder ein kleines Quiz. Klickst du im Baum auf eine einzelne Übung, füllst du sie mit Inhalt: die Sätze für den Lückentext, die Begriffspaare, die Quizfragen. Alles, was du hier baust, korrigiert sich später von selbst — die Schüler sehen sofort, ob es richtig war.',
      features: [
        'Lernpaket anklicken → Übungsformen aussuchen und in die drei Phasen Erarbeiten · Üben · Abschluss legen',
        'Übung anklicken → den Inhalt eintragen und in der Schüler-Vorschau anschauen',
        'Den Lernpaket-Wizard nutzen: Er schlägt dir passende Übungen samt Inhalt vor, du prüfst und übernimmst',
        'Aufgabenvorlage anlegen und daraus Varianten erzeugen lassen — für Übung mit wechselnden Zahlen oder Begriffen',
        'Lernpaket freigeben, wenn alles fertig ist — dann kann nichts mehr versehentlich verändert werden',
      ],
      faqs: [
        { question: 'Was ist der Unterschied zwischen Lernpaket und Übung?', answer: 'Im Lernpaket legst du fest, WELCHE Übungsformen es gibt — etwa „ein Lückentext und ein Quiz". Klickst du dann auf den Lückentext, schreibst du die eigentlichen Sätze mit den Lücken hinein.' },
        { question: 'Was ist eine Aufgabenvorlage mit Varianten?', answer: 'Du baust eine Übung einmal sauber — zum Beispiel „Berechne den Flächeninhalt". Aus dieser Vorlage macht dir der Pool-Manager auf Knopfdruck weitere Übungen mit anderen Zahlen. So können die Schüler denselben Typ mehrfach trainieren.' },
        { question: 'Wann kann ich ein Lernpaket freigeben?', answer: 'Sobald jede Übung im Paket vollständig ist. Danach ist das Paket geschützt: Wer noch etwas ändern will, muss die Freigabe erst zurücknehmen.' },
        { question: 'Was bedeutet das grüne Schloss?', answer: 'Das Lernpaket ist freigegeben und geschützt. Wenn du doch noch etwas ändern willst, klicke auf das Schloss und nimm die Freigabe zurück.' },
        { question: 'Was ist der Unterschied zum Reiter „Aufgaben"?', answer: 'Hier im Lernpaket sind die kleinen Grundlagen-Übungen, die sich selbst korrigieren. Im Reiter „Aufgaben" stehen die größeren, offenen Aufgaben, bei denen die Schüler etwas anwenden und der KI-Tutor Rückmeldung gibt.' },
      ],
      docsSlug: 'lernpakete-aktivitaeten',
    },
  },
  {
    value: 'ebene2', label: 'Aufgaben', icon: ClipboardList, step: 5, art: 'aufgabe',
    help: {
      title: 'Aufgaben — das Gelernte anwenden',
      description: 'Hier schreibst du die richtigen Aufgaben: die, bei denen die Schüler das Gelernte auf etwas Neues anwenden — eine Quelle auswerten, ein Diagramm beschreiben, eine kurze Stellungnahme schreiben. Es gibt keine automatische Korrektur, dafür begleitet der KI-Tutor Brian die Schüler beim Arbeiten und gibt ihnen Rückmeldung. Damit er das gut kann, gibst du ihm neben der Aufgabenstellung auch eine Musterlösung mit — den Erwartungshorizont. Wenn dir eine Idee fehlt, schlägt dir die KI-Ideenbox passende Aufgaben zu deinem Themenfeld vor.',
      features: [
        'Neue Aufgabe anlegen und dabei aussuchen, worum es geht: erste Begegnung, erarbeiten, sichern oder anwenden',
        'Die KI-Ideenbox fragen, wenn du Anregungen für ein Themenfeld brauchst',
        'Aufgabenstellung schreiben, Bild oder Arbeitsblatt dazulegen und die Schwierigkeit mit 1–3 Sternen angeben',
        'Festlegen, welche Lernziele die Aufgabe braucht — so weiß der KI-Tutor, wohin er bei Lücken zurückschicken kann',
        'Aus einer groben Idee (auch gesprochen) einen fertigen Aufgabenentwurf schreiben lassen',
        'Den Erwartungshorizont schreiben oder von der KI vorschlagen lassen — das ist die Messlatte für den KI-Tutor',
        'Mehrere Aufgaben zu einer Auswahl zusammenstellen, aus der die Schüler sich eine aussuchen dürfen',
      ],
      faqs: [
        { question: 'Was ist der Unterschied zu den Übungen im Lernpaket?', answer: 'Die Übungen im Lernpaket sind kurz und korrigieren sich selbst. Die Aufgaben hier sind offen — es gibt nicht die eine richtige Antwort. Deshalb gibt hier der KI-Tutor die Rückmeldung, nicht ein Programm. Die Aufgaben gehören zur ganzen Einheit und werden später in die Arbeitspläne einsortiert.' },
        { question: 'Wozu die Frage „Worum geht es?" beim Anlegen?', answer: 'Du sagst, was die Schüler mit der Aufgabe tun sollen — etwas zum ersten Mal kennenlernen, erarbeiten, sichern oder anwenden. Das hilft dir beim Zuschnitt und den Schülern später bei der Orientierung im Arbeitsplan.' },
        { question: 'Was ist die KI-Ideenbox?', answer: 'Wenn du nicht weißt, wie du anfangen sollst, schlägt sie dir zu einem Themenfeld mehrere konkrete Aufgabenideen vor. Du nimmst eine als Startpunkt und baust sie aus.' },
        { question: 'Wie funktioniert „Mit KI entwerfen" (der Zauberstab)?', answer: 'Du beschreibst deine Idee in ein, zwei Sätzen — tippen oder sprechen. Daraus macht die KI Titel, Aufgabenstellung und Vorschläge für die Lernziele. Du änderst danach, was dir nicht passt.' },
        { question: 'Was ist der Erwartungshorizont?', answer: 'Deine Musterlösung: Was muss in einer guten Schülerantwort drinstehen? Der KI-Tutor richtet seine Rückmeldung daran aus. Je genauer du ihn schreibst, desto besser hilft er den Schülern.' },
      ],
      docsSlug: 'ebene-2-allgemeine-aufgaben',
    },
  },
  {
    value: 'ebene3', label: 'Projekte', icon: Target, step: 6, art: 'projekt',
    help: {
      title: 'Projekte — die großen, freien Aufgaben',
      description: 'Hier legst du die Projekte an: Aufgaben, bei denen die Schüler selbst etwas planen und herstellen — ein Plakat, einen Podcast, eine Präsentation, ein Portfolio. Dafür gibt es keine Musterlösung. Stattdessen sagst du, was am Ende abgegeben werden soll und woran man eine gute Arbeit erkennt. Der KI-Tutor Brian begleitet die Schüler dann über mehrere Stunden durch das Projekt, ohne ihnen die Arbeit abzunehmen.',
      features: [
        'Aussuchen: kleinere Anwendungsaufgabe oder größeres Projekt?',
        'Aus einer groben Idee (auch gesprochen) einen Aufgabenentwurf schreiben lassen',
        'Anklicken, was abgegeben werden soll: Text · Präsentation · Zeitleiste · Bild · Grafik · Audio — oder etwas Eigenes',
        'Beschreiben, worauf es dir besonders ankommt, und daraus Bewertungskriterien vorschlagen lassen',
        'Die Bewertungskriterien nach deinem Geschmack anpassen (Name · Punkte · Beschreibung)',
        'Festlegen, welche Lernziele die Schüler für das Projekt schon beherrschen müssen',
        'Die Anweisung für den KI-Tutor auf Knopfdruck aus Aufgabe, Kriterien und Lernzielen zusammenstellen lassen',
      ],
      faqs: [
        { question: 'Anwendungsaufgabe oder Projekt — was ist der Unterschied?', answer: 'Eine Anwendungsaufgabe ist kürzer und klar umrissen, zum Beispiel einen Text analysieren. Ein Projekt ist größer: Die Schüler planen, recherchieren und setzen selbst um — meist über mehrere Stunden.' },
        { question: 'Wozu muss ich angeben, was abgegeben wird?', answer: 'Damit der KI-Tutor weiß, wohin er die Schüler begleiten soll. Er bewertet das fertige Plakat nicht — aber er hilft beim Erstellen, und dafür muss er wissen, dass es ein Plakat wird. Du kannst mehrere Formen ankreuzen oder eine eigene eintragen.' },
        { question: 'Was sind die Bewertungskriterien?', answer: 'Statt einer Schulnote gibt es Bereiche wie „Inhaltliche Tiefe" oder „Gestaltung", jeweils mit Punkten und einer kurzen Beschreibung. Die KI schlägt dir passende Bereiche vor. Sie sind kein starres Raster, sondern zeigen dem KI-Tutor, worauf er die Schüler hinweisen soll.' },
        { question: 'Was macht der KI-Tutor beim Projekt?', answer: 'Er führt die Schüler mit Fragen durch das Projekt, ohne ihnen die Lösung vorzusagen. Seine Anweisung erzeugst du im Reiter „KI-Tutor" mit einem Klick.' },
        { question: 'Warum soll ich Lernziele zum Projekt angeben?', answer: 'Damit der KI-Tutor weiß, welche Grundlagen die Schüler dafür brauchen. Merkt er, dass jemand etwas nicht kann, schickt er ihn gezielt zurück in das passende Lernpaket.' },
      ],
      docsSlug: 'ebene-3-projektaufgaben',
    },
  },
  {
    value: 'dashboards', label: 'Arbeitspläne', icon: Compass, step: 7,
    help: {
      title: 'Arbeitspläne — was die Schüler am Ende sehen',
      description: 'Der Arbeitsplan ist die Seite, die die Schüler bekommen: eine Liste von Abschnitten — zum Beispiel „Orientierung", „Einstieg", „Training", „Test" — und in jedem Abschnitt die passenden Lernpakete, Aufgaben und Projekte. Du baust vier Arbeitspläne, einen für jede Intensitätsstufe: vom Minimalisten, der nur das Nötigste macht, bis zum Passionierten, der sich ins Projekt vertieft. Deine Aufgaben ziehst du einfach mit der Maus aus dem Vorrat links in den richtigen Abschnitt.',
      features: [
        'Oben die Intensitätsstufe wählen — jede Stufe hat ihren eigenen Arbeitsplan',
        'Links im Vorrat liegen alle deine Lernpakete, Aufgaben und Projekte sowie fertige Bausteine wie Lernlandkarte oder Einstiegstest',
        'Mit „Vorlage laden" bekommst du das fertige Abschnitts-Gerüst für die gewählte Stufe (Orientierung → Einstieg → Training → Test → Projekt)',
        'Pro Abschnitt festlegen: frei oder der Reihe nach — und ob er sofort offen ist oder erst nach einem anderen Abschnitt',
        'Aufgaben mit der Maus in die Abschnitte ziehen; eine Ampel zeigt dir, ob jede Aufgabe fertig ist',
        'Mit „Prüfen & freigeben" den Plan abschließen — danach ist er vor versehentlichen Änderungen geschützt',
      ],
      faqs: [
        { question: 'Was sind die vier Intensitätsstufen?', answer: 'Die Schüler wählen am Anfang, wie intensiv sie arbeiten wollen: Minimalist (das Nötigste sichern), Pragmatiker (zügig zum Ziel), Ehrgeizig (gründlich, auch für die Klassenarbeit), Passioniert (viel Freiheit, Schwerpunkt Projekt). Für jede Stufe gibt es einen eigenen Arbeitsplan.' },
        { question: 'Was heißt „erst nach einem anderen Abschnitt"?', answer: 'Du kannst einen Abschnitt erst dann öffnen lassen, wenn die Schüler einen anderen komplett erledigt haben — zum Beispiel den Test erst nach dem Training. So entsteht eine sinnvolle Reihenfolge, ohne dass alles starr hintereinander liegen muss.' },
        { question: 'Was macht „Vorlage laden"?', answer: 'Es setzt dir die bewährten Abschnitte für die gewählte Stufe hinein. Aufgaben, die schon drin sind, bleiben unangetastet — du bekommst nur das Gerüst dazu.' },
        { question: 'Was bedeutet „Prüfen & freigeben"?', answer: 'Der Pool-Manager schaut nach, ob alle Aufgaben im Plan fertig (grün) sind, und schließt den Plan dann ab. Danach kann niemand versehentlich etwas verschieben. Zum Ändern klickst du auf „Entsperren".' },
        { question: 'Verändere ich hier die Aufgaben selbst?', answer: 'Nein. Die Aufgaben bleiben, wie du sie in den anderen Reitern gebaut hast. Hier legst du nur fest, in welchem Abschnitt und in welcher Reihenfolge die Schüler sie bekommen.' },
        { question: 'Warum kann ich gerade nichts bearbeiten?', answer: 'Entweder arbeitet gerade jemand anderes an diesem Arbeitsplan, oder der Plan ist schon freigegeben. Dann siehst du ihn nur zum Lesen.' },
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
      'Zwei Stufen: „Schneller Check" findet Lücken, „Gründlich prüfen" liest zusätzlich mit, ob die Aufgaben verständlich und sinnvoll sind',
      'Jeder Punkt hat einen Knopf, der dich direkt zur betroffenen Stelle bringt',
      'Erledigtes abhaken — der nächste Durchlauf bestätigt dir, dass es jetzt passt',
      'Punkte, die absichtlich so bleiben sollen, mit einer kurzen Begründung stehen lassen',
    ],
    faqs: [
      { question: 'Muss ich alles abarbeiten, was hier steht?', answer: 'Nein. Du bist die Fachkraft, nicht das Programm. Wenn ein Hinweis für deine Klasse nicht passt, klickst du auf „Soll so bleiben" und schreibst einen Satz dazu. Damit ist der Punkt erledigt und taucht nicht wieder auf.' },
      { question: 'Was macht „Gründlich prüfen" anders?', answer: 'Der schnelle Check sucht nur nach Lücken — leere Felder, fehlende Dateien. „Gründlich prüfen" liest deine Aufgaben zusätzlich mit und meldet, wenn eine Aufgabenstellung unklar ist, die Musterlösung fehlt oder ein Text für die Jahrgangsstufe zu schwer ist. Sie braucht dafür ein paar Minuten.' },
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
  value: 'brian', label: 'Ab zu Moodle!', icon: Bot, step: 8,
  help: {
    title: 'Ab zu Moodle! — Einheit in den Kurs bringen',
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