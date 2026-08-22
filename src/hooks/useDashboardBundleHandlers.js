/**
 * useDashboardBundleHandlers.js
 *
 * Alle Mutationen des Lernpfad-Cockpits, die an Bündeln und einzelnen
 * Pfad-Elementen hängen:
 *   - Bündel löschen (mit Cascade-Dialog, wenn Kinder enthalten sind),
 *   - Pflichtmenge („X von Y") und Bearbeitungsmodus eines Bündels,
 *   - Auto-Befüllen leerer Bündel,
 *   - Element aktiv/inaktiv schalten, Lernpaket-Zugang umschalten,
 *   - System-Element positions-genau entfernen.
 *
 * Alle Handler laufen über `updateKonfiguration` und damit über dieselbe
 * Save-/Junction-Sync-Pipeline wie reguläre Edits. Der Hook hält nur den
 * Zustand des Cascade-Dialogs; jede Datenoperation liegt in `lernpfadeUtils`.
 */

import { useCallback, useState } from 'react';
import {
  getUsedAufgabenIds,
  setBundleConfig,
  setBundleModus,
  setItemAktiv,
  setItemLernpaketZugang,
  removeBundleAndCascade,
  getBundleChildren,
  getAutoFillCandidates,
  bulkAddItemsToBundle,
} from '@/lib/lernpfadeUtils';
import { getBundleKindByAcceptedTypes } from '@/lib/sektorTypen';

export function useDashboardBundleHandlers({
  readOnly,
  activeLernTyp,
  konfigurationRef,
  updateKonfiguration,
  systemBausteineById,
  aufgaben,
  lernpakete,
  toast,
}) {
  // {sektorId, bundleInstanceId, bundleTitle, childCount} – nur bei Bündeln
  // mit Kindern gefüllt; leere Bündel werden ohne Rückfrage entfernt.
  const [cascadeDialog, setCascadeDialog] = useState(null);

  const removeBundle = useCallback(
    (sektorId, bundleInstanceId) => {
      if (readOnly) return;
      const children = getBundleChildren(
        konfigurationRef.current,
        activeLernTyp,
        sektorId,
        bundleInstanceId
      );
      if (children.length === 0) {
        updateKonfiguration((prev) => {
          const { konfig } = removeBundleAndCascade(prev, activeLernTyp, sektorId, bundleInstanceId);
          return konfig;
        });
        return;
      }
      const sektor = (konfigurationRef.current?.[activeLernTyp] || []).find(
        (s) => s.sektor_id === sektorId
      );
      const bundleItem = sektor?.items?.find((it) => it.instance_id === bundleInstanceId);
      const bundleTitle = systemBausteineById?.get(bundleItem?.ref_id)?.titel || 'Bündel';
      setCascadeDialog({ sektorId, bundleInstanceId, bundleTitle, childCount: children.length });
    },
    [readOnly, activeLernTyp, konfigurationRef, updateKonfiguration, systemBausteineById]
  );

  const confirmCascadeDelete = useCallback(() => {
    if (!cascadeDialog) return;
    const { sektorId, bundleInstanceId } = cascadeDialog;
    updateKonfiguration((prev) => {
      const { konfig } = removeBundleAndCascade(prev, activeLernTyp, sektorId, bundleInstanceId);
      return konfig;
    });
    setCascadeDialog(null);
  }, [cascadeDialog, activeLernTyp, updateKonfiguration]);

  const handleSetBundleConfig = useCallback(
    (sektorId, bundleInstanceId, erforderlicheAnzahl) => {
      if (readOnly) return;
      updateKonfiguration((prev) =>
        setBundleConfig(prev, activeLernTyp, sektorId, bundleInstanceId, erforderlicheAnzahl)
      );
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  const handleSetBundleModus = useCallback(
    (sektorId, bundleInstanceId, modus) => {
      if (readOnly) return;
      updateKonfiguration((prev) =>
        setBundleModus(prev, activeLernTyp, sektorId, bundleInstanceId, modus)
      );
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  const handleToggleItemAktiv = useCallback(
    (sektorId, instanceId, aktiv) => {
      if (readOnly) return;
      updateKonfiguration((prev) => setItemAktiv(prev, activeLernTyp, sektorId, instanceId, aktiv));
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  const handleSetLernpaketZugang = useCallback(
    (sektorId, instanceId, zugang) => {
      if (readOnly) return;
      updateKonfiguration((prev) =>
        setItemLernpaketZugang(prev, activeLernTyp, sektorId, instanceId, zugang)
      );
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  const handleAutoFillBundle = useCallback(
    (sektorId, bundleInstanceId, bundleBaustein) => {
      if (readOnly) return;
      const bundleKind = getBundleKindByAcceptedTypes(bundleBaustein?.accepted_types);
      if (!bundleKind) {
        toast({
          variant: 'destructive',
          title: 'Auto-Befüllen nicht möglich',
          description: 'Dieses Bündel hat keinen erkennbaren Typ.',
        });
        return;
      }
      const sektor = (konfigurationRef.current?.[activeLernTyp] || []).find(
        (s) => s.sektor_id === sektorId
      );
      const themenfeldId = sektor?.themenfeld_id || null;
      const candidates = getAutoFillCandidates({
        bundleKind,
        themenfeldId,
        aufgaben,
        lernpakete,
        usedAufgabenIds: getUsedAufgabenIds(konfigurationRef.current, activeLernTyp),
      });

      if (candidates.length === 0) {
        toast({
          title: 'Keine passenden Elemente gefunden',
          description:
            bundleKind === 'projekte'
              ? 'In dieser Einheit gibt es noch keine unzugewiesenen Projekte.'
              : !themenfeldId
                ? 'Dieses Bündel ist keinem Themenfeld zugeordnet.'
                : 'Alle passenden Elemente sind bereits in diesem Lernpfad platziert.',
        });
        return;
      }

      let added = 0;
      let skipped = 0;
      updateKonfiguration((prev) => {
        const result = bulkAddItemsToBundle(
          prev,
          activeLernTyp,
          sektorId,
          bundleInstanceId,
          candidates
        );
        added = result.addedCount;
        skipped = result.skippedCount;
        return result.konfig;
      });

      if (added > 0 && skipped === 0) {
        toast({
          title: `${added} ${added === 1 ? 'Element' : 'Elemente'} hinzugefügt`,
          description: 'Das Bündel wurde automatisch befüllt.',
        });
      } else if (added > 0 && skipped > 0) {
        toast({
          title: `${added} hinzugefügt, ${skipped} übersprungen`,
          description: 'Übersprungene Elemente waren bereits im Pfad.',
        });
      } else {
        toast({
          title: 'Keine Elemente hinzugefügt',
          description: 'Alle Kandidaten waren bereits platziert.',
        });
      }
    },
    [readOnly, activeLernTyp, konfigurationRef, aufgaben, lernpakete, updateKonfiguration, toast]
  );

  // System-Elemente werden POSITIONS-genau entfernt (nicht per ref_id), weil
  // derselbe Baustein mehrfach in einem Sektor vorkommen darf.
  const handleRemoveSystemItem = useCallback(
    (sektorId, itemIndex) => {
      if (readOnly) return;
      updateKonfiguration((prev) => {
        const next = (prev?.[activeLernTyp] || []).map((s) => {
          if (s.sektor_id !== sektorId) return s;
          const items = [...(s.items || [])];
          if (itemIndex < 0 || itemIndex >= items.length) return s;
          if (items[itemIndex]?.type !== 'system') return s; // safety
          items.splice(itemIndex, 1);
          return { ...s, items };
        });
        return { ...prev, [activeLernTyp]: next };
      });
    },
    [readOnly, activeLernTyp, updateKonfiguration]
  );

  return {
    cascadeDialog,
    setCascadeDialog,
    confirmCascadeDelete,
    removeBundle,
    handleSetBundleConfig,
    handleSetBundleModus,
    handleToggleItemAktiv,
    handleSetLernpaketZugang,
    handleAutoFillBundle,
    handleRemoveSystemItem,
  };
}

export default useDashboardBundleHandlers;