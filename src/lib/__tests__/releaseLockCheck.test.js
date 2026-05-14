/**
 * Tests für lib/releaseLockCheck.js
 */

import { describe, it, expect } from 'vitest';
import {
  isEinheitLocked,
  isLernpaketReleased,
  isActivityReleased,
  getActivityLockReason,
  getLernpaketLockReason,
  getAllgemeineAufgabeLockReason,
  canToggleActivityRelease,
  canToggleLernpaketRelease,
} from '../releaseLockCheck';

describe('isEinheitLocked', () => {
  it('draft → nicht gesperrt', () => {
    expect(isEinheitLocked({ export_lifecycle_status: 'draft' })).toBe(false);
  });
  it('final_freigegeben → gesperrt', () => {
    expect(isEinheitLocked({ export_lifecycle_status: 'final_freigegeben' })).toBe(true);
  });
  it('export_running → gesperrt', () => {
    expect(isEinheitLocked({ export_lifecycle_status: 'export_running' })).toBe(true);
  });
  it('published → gesperrt', () => {
    expect(isEinheitLocked({ export_lifecycle_status: 'published' })).toBe(true);
  });
  it('null/undefined → nicht gesperrt', () => {
    expect(isEinheitLocked(null)).toBe(false);
    expect(isEinheitLocked({})).toBe(false);
  });
});

describe('isLernpaketReleased', () => {
  it('approved ohne released_at → NICHT freigegeben (Legacy-Schutz)', () => {
    expect(isLernpaketReleased({ content_status: 'approved' })).toBe(false);
  });
  it('approved + released_at → freigegeben', () => {
    expect(isLernpaketReleased({ content_status: 'approved', released_at: '2026-05-14T10:00:00Z' })).toBe(true);
  });
  it('draft + released_at → nicht freigegeben', () => {
    expect(isLernpaketReleased({ content_status: 'draft', released_at: '2026-05-14T10:00:00Z' })).toBe(false);
  });
});

describe('isActivityReleased', () => {
  it('approved → freigegeben', () => {
    expect(isActivityReleased({ content_status: 'approved' })).toBe(true);
  });
  it('draft → nicht freigegeben', () => {
    expect(isActivityReleased({ content_status: 'draft' })).toBe(false);
  });
});

describe('getActivityLockReason — Hierarchie', () => {
  it('Einheit final → Sperre wegen Einheit', () => {
    const res = getActivityLockReason(
      { content_status: 'draft' },
      { content_status: 'draft' },
      { export_lifecycle_status: 'final_freigegeben' }
    );
    expect(res.locked).toBe(true);
    expect(res.reason).toBe('einheit_final');
  });

  it('Einheit draft + Lernpaket released → Sperre wegen Lernpaket', () => {
    const res = getActivityLockReason(
      { content_status: 'draft' },
      { content_status: 'approved', released_at: '2026-01-01' },
      { export_lifecycle_status: 'draft' }
    );
    expect(res.locked).toBe(true);
    expect(res.reason).toBe('lernpaket_released');
  });

  it('Aktivität freigegeben → Sperre wegen Aktivität', () => {
    const res = getActivityLockReason(
      { content_status: 'approved' },
      { content_status: 'draft' },
      { export_lifecycle_status: 'draft' }
    );
    expect(res.locked).toBe(true);
    expect(res.reason).toBe('activity_released');
  });

  it('alles draft → frei', () => {
    const res = getActivityLockReason(
      { content_status: 'draft' },
      { content_status: 'draft' },
      { export_lifecycle_status: 'draft' }
    );
    expect(res.locked).toBe(false);
    expect(res.reason).toBeNull();
  });
});

describe('getLernpaketLockReason', () => {
  it('Einheit final → gesperrt', () => {
    const r = getLernpaketLockReason({}, { export_lifecycle_status: 'final_freigegeben' });
    expect(r.locked).toBe(true);
    expect(r.reason).toBe('einheit_final');
  });

  it('Lernpaket released → gesperrt', () => {
    const r = getLernpaketLockReason(
      { content_status: 'approved', released_at: '2026-01-01' },
      { export_lifecycle_status: 'draft' }
    );
    expect(r.locked).toBe(true);
    expect(r.reason).toBe('lernpaket_released');
  });

  it('draft → frei', () => {
    const r = getLernpaketLockReason(
      { content_status: 'draft' },
      { export_lifecycle_status: 'draft' }
    );
    expect(r.locked).toBe(false);
  });
});

describe('getAllgemeineAufgabeLockReason', () => {
  it('Einheit final → gesperrt', () => {
    const r = getAllgemeineAufgabeLockReason({}, { export_lifecycle_status: 'final_freigegeben' });
    expect(r.locked).toBe(true);
  });
  it('Aufgabe approved → gesperrt', () => {
    const r = getAllgemeineAufgabeLockReason(
      { content_status: 'approved' },
      { export_lifecycle_status: 'draft' }
    );
    expect(r.locked).toBe(true);
    expect(r.reason).toBe('aufgabe_released');
  });
  it('draft → frei', () => {
    const r = getAllgemeineAufgabeLockReason(
      { content_status: 'draft' },
      { export_lifecycle_status: 'draft' }
    );
    expect(r.locked).toBe(false);
  });
});

describe('canToggleActivityRelease', () => {
  it('Einheit final → Toggle gesperrt', () => {
    const r = canToggleActivityRelease(
      {}, {}, { export_lifecycle_status: 'final_freigegeben' }
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toBe('einheit_final');
  });
  it('Lernpaket released → Toggle gesperrt', () => {
    const r = canToggleActivityRelease(
      {},
      { content_status: 'approved', released_at: '2026-01-01' },
      { export_lifecycle_status: 'draft' }
    );
    expect(r.allowed).toBe(false);
  });
  it('alles offen → Toggle erlaubt', () => {
    const r = canToggleActivityRelease({}, {}, { export_lifecycle_status: 'draft' });
    expect(r.allowed).toBe(true);
  });
});

describe('canToggleLernpaketRelease', () => {
  it('Einheit final → gesperrt', () => {
    expect(canToggleLernpaketRelease({}, { export_lifecycle_status: 'published' }).allowed).toBe(false);
  });
  it('Einheit draft → erlaubt', () => {
    expect(canToggleLernpaketRelease({}, { export_lifecycle_status: 'draft' }).allowed).toBe(true);
  });
});