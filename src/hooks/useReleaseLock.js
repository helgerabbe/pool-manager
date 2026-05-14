/**
 * hooks/useReleaseLock.js
 *
 * Phase 4 des Freigabe-Konzepts (2026-05-14):
 * Liefert den effektiven Sperrstatus für ein Element entlang der Hierarchie:
 *   Einheit (final/export_running/published)
 *     └── Lernpaket (released)
 *           └── Aktivität / Allgemeine Aufgabe (released)
 *
 * Reine Wrapper-Hooks um lib/releaseLockCheck.js, damit Komponenten leicht
 * deklarativ „darf ich editieren / toggeln?" beantworten können.
 */

import { useMemo } from 'react';
import {
  getActivityLockReason,
  getLernpaketLockReason,
  getAllgemeineAufgabeLockReason,
  canToggleActivityRelease,
  canToggleLernpaketRelease,
  isEinheitLocked,
} from '@/lib/releaseLockCheck';

/**
 * Effektiver Sperrstatus einer Aktivität (inkl. Master/Klon).
 *
 * @returns {{ locked, reason, message }}
 *   - locked: boolean
 *   - reason: 'einheit_final' | 'lernpaket_released' | 'activity_released' | null
 *   - message: deutscher Anzeigetext
 */
export function useActivityLockState(activity, lernpaket, einheit) {
  return useMemo(
    () => getActivityLockReason(activity, lernpaket, einheit),
    [activity, lernpaket, einheit]
  );
}

/**
 * Effektiver Sperrstatus eines Lernpakets.
 */
export function useLernpaketLockState(lernpaket, einheit) {
  return useMemo(
    () => getLernpaketLockReason(lernpaket, einheit),
    [lernpaket, einheit]
  );
}

/**
 * Effektiver Sperrstatus einer AllgemeinenAufgabe / Projekts.
 */
export function useAllgemeineAufgabeLockState(aufgabe, einheit) {
  return useMemo(
    () => getAllgemeineAufgabeLockReason(aufgabe, einheit),
    [aufgabe, einheit]
  );
}

/**
 * Darf der Lehrer den Freigabe-Toggle einer Aktivität bedienen?
 * (Nicht das gleiche wie isLocked — bezieht zusätzlich die Hierarchie ein.)
 */
export function useCanToggleActivityRelease(activity, lernpaket, einheit) {
  return useMemo(
    () => canToggleActivityRelease(activity, lernpaket, einheit),
    [activity, lernpaket, einheit]
  );
}

/**
 * Darf der Lehrer den Freigabe-Toggle eines Lernpakets bedienen?
 */
export function useCanToggleLernpaketRelease(lernpaket, einheit) {
  return useMemo(
    () => canToggleLernpaketRelease(lernpaket, einheit),
    [lernpaket, einheit]
  );
}

/**
 * Ist die ganze Einheit „final" und damit alles unter ihr gesperrt?
 */
export function useEinheitFinalLocked(einheit) {
  return useMemo(() => isEinheitLocked(einheit), [einheit]);
}

export default useActivityLockState;