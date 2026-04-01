/**
 * useCrossTabSync.js
 *
 * Phase 6.4: Multi-Tab Synchronisierung via BroadcastChannel API
 *
 * Nutzt die native BroadcastChannel API, um Nachrichten zwischen Browser-Tabs
 * zu synchronisieren, ohne dass die Seite neu geladen werden muss.
 *
 * Beispiel:
 * - Tab A setzt einen "Structural Lock" auf Einheit 123
 * - BroadcastChannel sendet: { type: "STRUCTURAL_LOCK", einheit_id: "123", locked_by: "user@email.com" }
 * - Tab B empfängt die Nachricht und deaktiviert sofort die Edit-Buttons für diese Einheit
 *
 * Usage:
 * const { sendMessage } = useCrossTabSync('einheit-sync', (message) => {
 *   if (message.type === 'STRUCTURAL_LOCK') {
 *     setIsLocked(true);
 *   }
 * });
 *
 * // Später in der Komponente:
 * sendMessage({ type: 'STRUCTURAL_LOCK', einheit_id: '123', locked_by: user.email });
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook für Multi-Tab Synchronisierung via BroadcastChannel
 *
 * @param {string} channelName - Name des BroadcastChannel (z.B. 'einheit-sync', 'workspace-state')
 * @param {Function} onMessage - Callback-Funktion, die aufgerufen wird, wenn eine Nachricht empfangen wird
 * @returns {Object} { sendMessage: Function, isSupported: boolean }
 *
 * @example
 * const { sendMessage, isSupported } = useCrossTabSync('einheit-sync', (message) => {
 *   console.log('Nachricht von anderem Tab:', message);
 * });
 *
 * if (isSupported) {
 *   sendMessage({ type: 'LOCK_ACQUIRED', resource_id: '123' });
 * }
 */
export function useCrossTabSync(channelName, onMessage) {
  const channelRef = useRef(null);
  const isSupported = typeof BroadcastChannel !== 'undefined';

  // Initialisiere BroadcastChannel beim Mount
  useEffect(() => {
    if (!isSupported) {
      console.warn('BroadcastChannel API is not supported in this browser');
      return;
    }

    try {
      // Erstelle einen neuen BroadcastChannel mit dem gegebenen Namen
      const channel = new BroadcastChannel(channelName);

      // Setze den Event-Listener für eingehende Nachrichten
      const handleMessage = (event) => {
        if (onMessage && typeof onMessage === 'function') {
          onMessage(event.data);
        }
      };

      channel.addEventListener('message', handleMessage);
      channelRef.current = channel;

      // Cleanup: Schließe den Channel beim Unmount
      return () => {
        channel.removeEventListener('message', handleMessage);
        channel.close();
        channelRef.current = null;
      };
    } catch (error) {
      console.error(`Failed to create BroadcastChannel "${channelName}":`, error);
    }
  }, [channelName, onMessage, isSupported]);

  // sendMessage: Sende eine Nachricht an alle Tabs mit dem gleichen Channel
  const sendMessage = useCallback(
    (message) => {
      if (!isSupported) {
        console.warn('BroadcastChannel API is not supported');
        return false;
      }

      if (!channelRef.current) {
        console.warn('BroadcastChannel is not initialized');
        return false;
      }

      try {
        channelRef.current.postMessage(message);
        return true;
      } catch (error) {
        console.error('Failed to send message via BroadcastChannel:', error);
        return false;
      }
    },
    [isSupported]
  );

  return {
    sendMessage,
    isSupported,
  };
}

/**
 * Vordefinierte Message-Typen für Standard-Use-Cases
 */
export const CrossTabMessageTypes = {
  // Structural Lock Management
  STRUCTURAL_LOCK_ACQUIRED: 'STRUCTURAL_LOCK_ACQUIRED',
  STRUCTURAL_LOCK_RELEASED: 'STRUCTURAL_LOCK_RELEASED',
  STRUCTURAL_LOCK_EXPIRED: 'STRUCTURAL_LOCK_EXPIRED',

  // View State Sync (z.B. "Detail-Ansicht" vs "Struktur-Ansicht")
  VIEW_MODE_CHANGED: 'VIEW_MODE_CHANGED',
  SELECTED_ITEM_CHANGED: 'SELECTED_ITEM_CHANGED',

  // Draft State Sync
  DRAFT_STARTED: 'DRAFT_STARTED',
  DRAFT_SAVED: 'DRAFT_SAVED',
  DRAFT_DISCARDED: 'DRAFT_DISCARDED',

  // Data Refresh Signals
  DATA_CHANGED_EXTERNAL: 'DATA_CHANGED_EXTERNAL', // Ein anderer Tab hat Daten geändert
  CACHE_INVALIDATE: 'CACHE_INVALIDATE',
};