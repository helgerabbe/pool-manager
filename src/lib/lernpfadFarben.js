/**
 * lernpfadFarben.js
 *
 * Single Source of Truth für die FARBSPRACHE der Lernpfad-Dashboards
 * (2026-08-22). Ziel: Die Farbe allein sagt der Lehrkraft, WORUM es sich
 * handelt — ohne dass sie lesen muss.
 *
 *   🔵 Blau    → alles, was mit LERNPAKETEN zu tun hat
 *                (Lernpaket-Zeile, Lernpaket-Badge, Lernpaketebündel,
 *                 Zugang/Fast-Track/Wissensspeicher am Lernpaket)
 *   🟠 Orange  → alles, was mit AUFGABEN zu tun hat
 *                (Aufgaben-Zeile, Aufgaben-Badge, Aufgabenbündel)
 *   🟣 Lila    → alles, was mit PROJEKTEN zu tun hat
 *                (Projekt-Zeile, Projekt-Badge, Projektbündel)
 *   ⚪ Grau    → SYSTEM-Welt: Systembausteine, Themenfeld-Elemente, Sektoren
 *   🟢 Grün    → freigegeben / vollständig   (reserviert, nicht für Inhalte)
 *   🔴 Rot     → unvollständig / Fehler      (reserviert, nicht für Inhalte)
 *
 * Die INTENSITÄTSSTUFEN (frühere „Lerntypen") liegen bewusst in einer eigenen,
 * nicht kollidierenden Farbfamilie: ein Teal-Verlauf, der von hell nach dunkel
 * steigt — die Stufe ist damit selbst als Intensität lesbar.
 */

import { getAcceptedTypeForAufgabe } from '@/lib/lernpfadeUtils';
import { getBundleKindByAcceptedTypes } from '@/lib/sektorTypen';

/** Farbwelt pro Element-Art. Alle Klassen sind literale Tailwind-Strings. */
export const ART_FARBEN = Object.freeze({
  lernpaket: {
    label: 'Lernpaket',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    border: 'border-blue-400',
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-700',
    text: 'text-blue-700',
    hoverBorder: 'hover:border-blue-400',
  },
  aufgabe: {
    label: 'Aufgabe',
    badge: 'bg-orange-100 text-orange-800 border-orange-300',
    border: 'border-orange-400',
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-700',
    text: 'text-orange-700',
    hoverBorder: 'hover:border-orange-400',
  },
  projekt: {
    label: 'Projekt',
    badge: 'bg-violet-100 text-violet-800 border-violet-300',
    border: 'border-violet-400',
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    iconText: 'text-violet-700',
    text: 'text-violet-700',
    hoverBorder: 'hover:border-violet-400',
  },
  system: {
    label: 'Systembaustein',
    badge: 'bg-slate-100 text-slate-700 border-slate-300',
    border: 'border-slate-400',
    bg: 'bg-slate-50',
    iconBg: 'bg-slate-200',
    iconText: 'text-slate-700',
    text: 'text-slate-800',
    hoverBorder: 'hover:border-slate-400',
  },
});

/** Element-Art eines Pfad-Items ('lernpaket' | 'aufgabe' | 'projekt'). */
export function getElementArt(aufgabe) {
  const accepted = getAcceptedTypeForAufgabe(aufgabe);
  if (accepted === 'lernpaket') return 'lernpaket';
  if (accepted === 'projekt') return 'projekt';
  return 'aufgabe';
}

/** Farbwelt eines Pfad-Items (Aufgabe / Lernpaket / Projekt). */
export function getArtFarbe(aufgabe) {
  return ART_FARBEN[getElementArt(aufgabe)];
}

/**
 * Farbwelt eines Bündel-Containers: Sie folgt dem INHALT des Bündels —
 * ein Lernpaketebündel ist blau, ein Aufgabenbündel orange, ein Projektbündel
 * lila. Bündel ohne erkennbaren Inhaltstyp bleiben grau (Systemwelt).
 */
export function getBundleFarbe(acceptedTypes) {
  const kind = getBundleKindByAcceptedTypes(acceptedTypes);
  if (kind === 'lernpakete') return ART_FARBEN.lernpaket;
  if (kind === 'aufgaben') return ART_FARBEN.aufgabe;
  if (kind === 'projekte') return ART_FARBEN.projekt;
  return ART_FARBEN.system;
}

/**
 * Intensitätsstufen: eigener Teal-Verlauf (hell → dunkel = wenig → viel).
 * Kollidiert bewusst mit keiner Inhalts- oder Statusfarbe.
 */
export const INTENSITAETS_FARBEN = Object.freeze({
  minimalist: {
    bg: 'bg-teal-50',
    bgSolid: 'bg-teal-400',
    border: 'border-teal-200',
    text: 'text-teal-700',
    textOn: 'text-white',
    hex: '#2dd4bf',
  },
  pragmatiker: {
    bg: 'bg-teal-50',
    bgSolid: 'bg-teal-500',
    border: 'border-teal-300',
    text: 'text-teal-700',
    textOn: 'text-white',
    hex: '#14b8a6',
  },
  ehrgeizig: {
    bg: 'bg-teal-50',
    bgSolid: 'bg-teal-700',
    border: 'border-teal-400',
    text: 'text-teal-800',
    textOn: 'text-white',
    hex: '#0f766e',
  },
  passioniert: {
    bg: 'bg-teal-50',
    bgSolid: 'bg-teal-900',
    border: 'border-teal-500',
    text: 'text-teal-900',
    textOn: 'text-white',
    hex: '#134e4a',
  },
});

export function getIntensitaetsFarbe(key) {
  return INTENSITAETS_FARBEN[key] || INTENSITAETS_FARBEN.minimalist;
}