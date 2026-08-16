/**
 * Zentrale Zuordnung: Name einer Katalog-Aktivität → Schüler-Seite.
 *
 * Wird von MasterfaehigeAktivitaet (Lernpakete) UND vom Stunden-Player
 * (digitale Phasen einer Unterrichtsstunde) genutzt, damit Schüler in beiden
 * Kontexten exakt dieselbe Darstellung sehen. Die Reihenfolge der Prüfungen
 * ist bedeutsam (spezifische Namen vor allgemeinen).
 */
import TextLesenSeite from '@/components/schueler/lesen/TextLesenSeite';
import LinkOeffnenSeite from '@/components/schueler/lesen/LinkOeffnenSeite';
import ReihenfolgeSortierenSeite from '@/components/schueler/lesen/ReihenfolgeSortierenSeite';
import BegriffeZuordnenSeite from '@/components/schueler/lesen/BegriffeZuordnenSeite';
import ZuordnungstrainingSeite from '@/components/schueler/lesen/ZuordnungstrainingSeite';
import BearbeitungBestaetigenSeite from '@/components/schueler/lesen/BearbeitungBestaetigenSeite';
import VideoAudioSeite from '@/components/schueler/lesen/VideoAudioSeite';
import KITutorSeite from '@/components/schueler/lesen/KITutorSeite';
import LueckentextSeite from '@/components/schueler/lesen/LueckentextSeite';
import TestSeite from '@/components/schueler/lesen/TestSeite';
import LehrwerkQuelleSeite from '@/components/schueler/lesen/LehrwerkQuelleSeite';
import MiniquizSeite from '@/components/schueler/lesen/MiniquizSeite';
import BildBeschriftungSeite from '@/components/schueler/lesen/BildBeschriftungSeite';
import KICheckSeite from '@/components/schueler/lesen/KICheckSeite';
import OffeneAufgabeSeite from '@/components/schueler/lesen/OffeneAufgabeSeite';
import HtmlSeite from '@/components/schueler/lesen/HtmlSeite';
import MaterialaufgabeSeite from '@/components/schueler/lesen/MaterialaufgabeSeite';
import SprechaufgabeSeite from '@/components/schueler/lesen/SprechaufgabeSeite';

/**
 * @returns Die passende Schüler-Seiten-Komponente oder null, wenn es für
 *          diesen Aktivitätsnamen (noch) keine gibt.
 */
export function getAktivitaetSeite(katName = '') {
  const n = (katName || '').toLowerCase();
  if (n.includes('sprechaufgabe')) return SprechaufgabeSeite;
  if (n.includes('materialaufgabe')) return MaterialaufgabeSeite;
  if (n.includes('text lesen')) return TextLesenSeite;
  if (n.includes('link') || n.includes('url')) return LinkOeffnenSeite;
  if (n.includes('reihenfolge') || n.includes('sortier')) return ReihenfolgeSortierenSeite;
  if (n.includes('zuordnungstraining')) return ZuordnungstrainingSeite;
  if (n.includes('begriffe zuordnen') || n.includes('zuordn')) return BegriffeZuordnenSeite;
  if (n.includes('bestätig') || n.includes('bestaetig')) return BearbeitungBestaetigenSeite;
  if (n.includes('video') || n.includes('audio')) return VideoAudioSeite;
  if (n.includes('ki-tutor') || n.includes('ki tutor') || n.includes('tutor')) return KITutorSeite;
  if (n.includes('lückentext') || n.includes('lueckentext')) return LueckentextSeite;
  if (n === 'test' || n.includes('abschlusstest')) return TestSeite;
  if (n.includes('lehrwerk') || n.includes('quelle')) return LehrwerkQuelleSeite;
  if (n.includes('miniquiz') || n.includes('mini-quiz')) return MiniquizSeite;
  if (n.includes('bildbeschriftung') || n.includes('beschriftung')) return BildBeschriftungSeite;
  if (n.includes('ki-check') || n.includes('ki check')) return KICheckSeite;
  if (n.includes('offene')) return OffeneAufgabeSeite;
  if (n.includes('html-seite') || n.includes('html')) return HtmlSeite;
  return null;
}