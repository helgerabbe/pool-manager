/**
 * hooks/useCompleteness.js
 *
 * Phase 4 des Freigabe-Konzepts (2026-05-14):
 * Live-Berechnung der Vollständigkeit für Activities, Master, Allgemeine
 * Aufgaben und Projekte — clientseitig, ohne Netzwerk-Call. Greift auf die
 * reine Bibliothek lib/completenessValidation.js zurück, die exakt dieselbe
 * Logik wie das Backend hat (Single Source of Truth).
 */

import { useMemo } from 'react';
import {
  validateActivity,
  validateMasterAufgabe,
  validateAllgemeineAufgabe,
  validateProjektaufgabe,
  validateLernpaketReleaseReadiness,
} from '@/lib/completenessValidation';

/**
 * Live-Vollständigkeit einer Aktivität (Modal-Editor).
 *
 * @param {object} catalogEntry  AktivitaetenKatalog-Record
 * @param {object} fieldValues   Aktueller (noch nicht gespeicherter) State
 */
export function useActivityCompleteness(catalogEntry, fieldValues) {
  return useMemo(
    () => validateActivity(catalogEntry, fieldValues || {}),
    [catalogEntry, fieldValues]
  );
}

/**
 * Vollständigkeit einer MasterAufgabe.
 */
export function useMasterAufgabeCompleteness(catalogEntry, fieldValues) {
  return useMemo(
    () => validateMasterAufgabe(catalogEntry, fieldValues || {}),
    [catalogEntry, fieldValues]
  );
}

/**
 * Vollständigkeit einer AllgemeinenAufgabe.
 */
export function useAllgemeineAufgabeCompleteness(aufgabe) {
  return useMemo(
    () => validateAllgemeineAufgabe(aufgabe),
    [aufgabe]
  );
}

/**
 * Vollständigkeit einer Projektaufgabe (anforderungsebene='3 - Projekt').
 */
export function useProjektaufgabeCompleteness(aufgabe) {
  return useMemo(
    () => validateProjektaufgabe(aufgabe),
    [aufgabe]
  );
}

/**
 * Lernpaket-Freigabe-Bereitschaft (alle Children approved+complete?).
 */
export function useLernpaketReleaseReadiness(lernpaket, activities) {
  return useMemo(
    () => validateLernpaketReleaseReadiness(lernpaket, activities || []),
    [lernpaket, activities]
  );
}

export default useActivityCompleteness;