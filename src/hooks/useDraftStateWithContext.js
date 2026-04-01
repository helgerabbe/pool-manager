/**
 * useDraftStateWithContext.js
 *
 * Phase 6.4: Erweiterter Draft-State mit Tab-Kontext-Isolierung
 *
 * Problem: Zwei Browser-Tabs öffnen die gleiche Einheit zur Bearbeitung.
 * Tab A speichert Draft-Daten unter "draft:einheit-123".
 * Tab B überschreibt diese Daten auch unter "draft:einheit-123".
 * → Netzwerk-Race Condition: Wer speichert zuletzt, gewinnt.
 *
 * Lösung: Draft-Key mit Tab-Context erweitern
 * Tab A speichert unter: "draft:einheit-123:tab-abc123"
 * Tab B speichert unter: "draft:einheit-123:tab-xyz789"
 * → Jeder Tab hat seinen eigenen Draft, kein Überschreiben!
 *
 * Usage:
 * const { draft, updateDraft, clearDraft, hasDraft } = useDraftStateWithContext(
 *   'einheit',
 *   '123',
 *   { title: '', description: '' }
 * );
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCrossTabSync, CrossTabMessageTypes } from '@/hooks/useCrossTabSync';
import { v4 as uuidv4 } from 'npm:uuid';

/**
 * Generiere eine eindeutige Tab-ID (persisistiert für die Session)
 * Diese ID wird verwendet, um Draft-Daten pro Tab zu isolieren
 */
function getTabId() {
  if (typeof window === 'undefined') return 'server';

  const tabIdKey = '__base44_tab_id__';
  let tabId = sessionStorage.getItem(tabIdKey);

  if (!tabId) {
    tabId = uuidv4();
    sessionStorage.setItem(tabIdKey, tabId);
  }

  return tabId;
}

/**
 * Hook für Draft-State mit Tab-Kontext-Isolierung
 *
 * @param {string} entityType - Entity-Typ (z.B. 'einheit', 'lernpaket')
 * @param {string} entityId - Entity-ID
 * @param {Object} initialValue - Initial-Wert für Draft
 * @param {Object} options - Optionale Konfiguration
 * @param {string} options.namespace - Storage-Namespace (default: 'draft')
 * @param {boolean} options.broadcastChanges - Via BroadcastChannel benachrichtigen? (default: true)
 * @returns {Object} { draft, updateDraft, clearDraft, hasDraft, tabId, isDraft }
 *
 * @example
 * const { draft, updateDraft, clearDraft, isDraft } = useDraftStateWithContext(
 *   'einheit',
 *   '123',
 *   { title: '', description: '' }
 * );
 *
 * // draft ist ein Proxy-Objekt, das localStorage automatisch synchronisiert:
 * updateDraft({ title: 'Neuer Titel' }); // speichert sofort
 *
 * // isDraft: true, solange Draft existiert und nicht gespeichert wurde
 * // clearDraft(): Löscht Draft aus localStorage
 */
export function useDraftStateWithContext(
  entityType,
  entityId,
  initialValue = {},
  options = {}
) {
  const { namespace = 'draft', broadcastChanges = true } = options;

  // Generiere eindeutige Tab-ID (persisistiert für die Session)
  const tabIdRef = useRef(null);
  if (tabIdRef.current === null) {
    tabIdRef.current = getTabId();
  }
  const tabId = tabIdRef.current;

  // Der vollständige Storage-Key mit Tab-Kontext
  // Format: "draft:einheit:123:tab-abc-def"
  const draftKey = `${namespace}:${entityType}:${entityId}:${tabId}`;

  const [draft, setDraft] = useState(() => {
    try {
      if (typeof window === 'undefined') return initialValue;

      const stored = window.localStorage.getItem(draftKey);
      return stored ? JSON.parse(stored) : initialValue;
    } catch (error) {
      console.warn(`Failed to load draft from localStorage[${draftKey}]:`, error);
      return initialValue;
    }
  });

  const [isDraft, setIsDraft] = useState(false);

  // BroadcastChannel für Cross-Tab Notifikationen
  const { sendMessage } = useCrossTabSync(
    `draft-sync-${entityType}-${entityId}`,
    (message) => {
      if (message.type === CrossTabMessageTypes.DRAFT_SAVED) {
        // Ein anderer Tab hat den Draft gespeichert
        // → Aktualisiere auch hier (falls relevant)
        console.log(
          `Draft in anderem Tab gespeichert:`,
          message.tabId,
          message.data
        );
      }
    }
  );

  // updateDraft: Mergen mit bestehendem Draft + sofort speichern
  const updateDraft = useCallback(
    (changes) => {
      setDraft((prevDraft) => {
        const updatedDraft = {
          ...prevDraft,
          ...(typeof changes === 'function' ? changes(prevDraft) : changes),
        };

        // Speichere sofort in localStorage
        try {
          window.localStorage.setItem(draftKey, JSON.stringify(updatedDraft));
          setIsDraft(true);

          // Benachrichtige andere Tabs
          if (broadcastChanges) {
            sendMessage({
              type: CrossTabMessageTypes.DRAFT_STARTED,
              tabId,
              entityType,
              entityId,
              data: updatedDraft,
            });
          }
        } catch (error) {
          console.warn(
            `Failed to save draft to localStorage[${draftKey}]:`,
            error
          );
        }

        return updatedDraft;
      });
    },
    [draftKey, broadcastChanges, sendMessage, tabId, entityType, entityId]
  );

  // clearDraft: Lösche Draft aus localStorage
  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(draftKey);
      setDraft(initialValue);
      setIsDraft(false);

      // Benachrichtige andere Tabs
      if (broadcastChanges) {
        sendMessage({
          type: CrossTabMessageTypes.DRAFT_DISCARDED,
          tabId,
          entityType,
          entityId,
        });
      }
    } catch (error) {
      console.warn(
        `Failed to clear draft from localStorage[${draftKey}]:`,
        error
      );
    }
  }, [draftKey, broadcastChanges, sendMessage, tabId, entityType, entityId, initialValue]);

  // hasDraft: Prüfe ob Draft existiert
  const hasDraft = useCallback(() => {
    try {
      if (typeof window === 'undefined') return false;
      return window.localStorage.getItem(draftKey) !== null;
    } catch (error) {
      return false;
    }
  }, [draftKey]);

  return {
    draft,
    updateDraft,
    clearDraft,
    hasDraft,
    isDraft,
    tabId,
    draftKey, // Für Debugging
  };
}