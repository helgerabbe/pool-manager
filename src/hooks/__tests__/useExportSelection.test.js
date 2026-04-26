/* eslint-disable no-undef */
/* global describe, it, expect */
/**
 * useExportSelection.test.js
 *
 * Sprint H – Refactor-Schutz für das DRY-Selection-Pattern. Der Hook
 * ersetzt zwei zuvor inline duplizierte Toggle-Stellen im
 * MoodleExportManager. Diese Tests stellen sicher, dass:
 *   - reset() die Auswahl synchron austauscht,
 *   - toggle() einen Eintrag invertiert,
 *   - toggleAll() zwischen "alle"/"keiner" pendelt.
 *
 * Der Hook wird ohne React-Renderer getestet, indem wir ihn von Hand
 * in einer minimalen Test-Harness ausführen (kein @testing-library
 * nötig). Wir nutzen dafür eine kleine `runHook`-Helferschicht.
 */

import { renderHook, act } from './_renderHook.js';
import { useExportSelection } from '@/hooks/useExportSelection';

describe('useExportSelection', () => {
  it('startet mit den initial übergebenen IDs', () => {
    const { result } = renderHook(() => useExportSelection(['a', 'b']));
    expect([...result.current.selected].sort()).toEqual(['a', 'b']);
  });

  it('toggle() entfernt vorhandene und fügt fehlende IDs hinzu', () => {
    const { result } = renderHook(() => useExportSelection(['a']));
    act(() => result.current.toggle('a'));
    expect(result.current.selected.has('a')).toBe(false);
    act(() => result.current.toggle('b'));
    expect(result.current.selected.has('b')).toBe(true);
  });

  it('toggleAll() leert die Selection, wenn bereits alle ausgewählt sind', () => {
    const { result } = renderHook(() => useExportSelection(['a', 'b']));
    act(() => result.current.toggleAll(['a', 'b']));
    expect(result.current.selected.size).toBe(0);
  });

  it('toggleAll() füllt die Selection, wenn (noch) nicht alle ausgewählt sind', () => {
    const { result } = renderHook(() => useExportSelection(['a']));
    act(() => result.current.toggleAll(['a', 'b', 'c']));
    expect([...result.current.selected].sort()).toEqual(['a', 'b', 'c']);
  });

  it('reset() ersetzt die Selection vollständig durch das übergebene Array', () => {
    const { result } = renderHook(() => useExportSelection(['a']));
    act(() => result.current.reset(['x', 'y']));
    expect([...result.current.selected].sort()).toEqual(['x', 'y']);
    act(() => result.current.reset([]));
    expect(result.current.selected.size).toBe(0);
  });
});