import { BookOpen, PenLine, MessageSquare, Ear, User, Users, UsersRound, Lightbulb, Clock, VolumeX, Search, Presentation, CheckCircle2, HelpCircle, Star } from 'lucide-react';

// Piktogramme für Arbeitsanweisungen (2026-10-21): einheitlich, damit Schüler sie wiedererkennen.
export const FOLIEN_SYMBOLE = [
  ['lesen', 'Lesen', BookOpen], ['schreiben', 'Schreiben', PenLine], ['sprechen', 'Sprechen', MessageSquare], ['zuhoeren', 'Zuhören', Ear],
  ['einzel', 'Einzelarbeit', User], ['partner', 'Partnerarbeit', Users], ['gruppe', 'Gruppenarbeit', UsersRound], ['plenum', 'Plenum', Presentation],
  ['denken', 'Nachdenken', Lightbulb], ['recherche', 'Recherchieren', Search], ['zeit', 'Zeit', Clock], ['leise', 'Leise arbeiten', VolumeX],
  ['kontrolle', 'Kontrollieren', CheckCircle2], ['frage', 'Frage', HelpCircle], ['zusatz', 'Zusatzaufgabe', Star],
];
export const SYMBOL = Object.fromEntries(FOLIEN_SYMBOLE.map(([k, label, icon]) => [k, { label, icon }]));

// Freigabebedingung einer Phase: Wann geht es nach dieser Folie weiter? Überschreibt die Freigabe der Organisationsebene.
export const FREIGABE_BEDINGUNGEN = [
  ['lehrkraft', 'Lehrkraft gibt frei'], ['zeit', 'Nach Ablauf der Zeit'], ['alle_fertig', 'Wenn alle fertig sind'],
  ['anteil', 'Wenn ein Teil fertig ist'], ['geloest', 'Wenn richtig gelöst'], ['code', 'Mit Freischaltcode'],
];
export const FREIGABE_TEXT = Object.fromEntries(FREIGABE_BEDINGUNGEN);