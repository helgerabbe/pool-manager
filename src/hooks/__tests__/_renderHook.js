/**
 * _renderHook.js
 *
 * Minimalistischer Hook-Test-Harness ohne externe Abhängigkeiten
 * (kein @testing-library/react im Projekt installiert). Nutzt
 * react-dom/test-utils für einen synchronen Render-Lauf in JSDOM.
 *
 * Ausreichend für reine Custom-Hooks, die State und Callbacks
 * exponieren – wie `useExportSelection`. Nicht geeignet für Hooks,
 * die externe Renderzyklen oder Suspense erwarten.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act as reactAct } from 'react-dom/test-utils';

export function renderHook(callback) {
  const result = { current: null };

  function HookProbe() {
    result.current = callback();
    return null;
  }

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  reactAct(() => {
    root.render(React.createElement(HookProbe));
  });

  return { result };
}

export const act = reactAct;