/**
 * systemBausteinIcons.js
 *
 * Mapping von Icon-Identifier (String, in der Entität gespeichert) auf das
 * passende Lucide-React-Icon. Single Source of Truth für Pool-Karten,
 * Sektor-Pills und Monitor-Panel.
 *
 * Das Mapping ist absichtlich klein gehalten – wenn neue Bausteine
 * hinzukommen, einfach den passenden Eintrag ergänzen.
 */

import {
  MessageCircle,
  Map,
  StopCircle,
  ClipboardCheck,
  Sparkles,
  Flag,
  HelpCircle,
  Compass,
  Hand,
  Layers,
  FileText,
  Star,
  Info,
  BookOpen,
  Pencil,
  ExternalLink,
  Package,
  PackageCheck,
  Calendar,
} from 'lucide-react';

const ICONS = {
  'message-circle': MessageCircle,
  map: Map,
  'stop-circle': StopCircle,
  'clipboard-check': ClipboardCheck,
  sparkles: Sparkles,
  flag: Flag,
  'help-circle': HelpCircle,
  compass: Compass,
  // Magic-Raster Platzhalter-Icons
  hand: Hand,
  layers: Layers,
  'file-text': FileText,
  star: Star,
  info: Info,
  // Dashboards V2 – Sektion 0, Map-Varianten, Prüfung, Bündel-Platzhalter
  'book-open': BookOpen,
  pencil: Pencil,
  'external-link': ExternalLink,
  package: Package,
  'package-check': PackageCheck,
  calendar: Calendar,
  // info-circle existiert nicht in lucide-react – auf vorhandenes Info-Icon mappen
  'info-circle': Info,
};

export function getSystemBausteinIcon(iconKey) {
  return ICONS[iconKey] || HelpCircle;
}