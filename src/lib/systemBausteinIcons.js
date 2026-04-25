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
};

export function getSystemBausteinIcon(iconKey) {
  return ICONS[iconKey] || HelpCircle;
}