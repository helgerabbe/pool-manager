/**
 * AufgabeWithReplicasCard.jsx
 *
 * Phase 6.7: Hierarchische Darstellung von Masteraufgaben & Replikaten
 * 
 * Zeigt:
 * - Masteraufgaben mit Badge & farbiger Umrandung
 * - Replikate eingerückt mit Verbindungs-Icon
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CornerDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Einzelne Aufgaben-Card (Master oder Replikat)
 */
function AufgabeCardInner({ aufgabe, isMaster, isReplica, children }) {
  return (
    <Card
      className={cn(
        'p-4 transition-all',
        isMaster && 'border-2 border-accent/40 bg-accent/5',
        isReplica && 'bg-muted/30 border border-border'
      )}
    >
      <div className="space-y-2">
        {/* Header mit Badge */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm line-clamp-2">
              {aufgabe.aufgabentext_inhalt || aufgabe.aufgabentext}
            </h4>
          </div>
          {isMaster && (
            <Badge variant="default" className="shrink-0">
              Masteraufgabe
            </Badge>
          )}
        </div>

        {/* Inhalt Slot */}
        {children && <div className="text-xs text-muted-foreground">{children}</div>}
      </div>
    </Card>
  );
}

/**
 * Master mit optional angehängten Replikaten
 */
export function AufgabeWithReplicasCard({
  masterAufgabe,
  replicas = [],
  onMasterClick,
  onReplicaClick,
  children,
}) {
  if (!masterAufgabe) {
    return null;
  }

  return (
    <div className="space-y-2">
      {/* MASTER */}
      <div onClick={onMasterClick} className="cursor-pointer">
        <AufgabeCardInner aufgabe={masterAufgabe} isMaster={true}>
          {children}
        </AufgabeCardInner>
      </div>

      {/* REPLICAS */}
      {replicas.length > 0 && (
        <div className="space-y-1">
          {replicas.map((replikat, idx) => (
            <div key={replikat.id || idx} className="flex gap-2">
              {/* Verbindungs-Icon */}
              <div className="flex flex-col items-center pt-1">
                <CornerDownRight className="w-4 h-4 text-muted-foreground" />
              </div>

              {/* Replikat-Card */}
              <div
                onClick={() => onReplicaClick?.(replikat)}
                className="flex-1 cursor-pointer"
              >
                <AufgabeCardInner aufgabe={replikat} isReplica={true} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Liste mit automatischer Master/Replikat-Gruppierung
 * 
 * Input: Flache Array von Aufgaben (Masters + Replikate durchmischt)
 * Output: Hierarchische Darstellung
 */
export function AufgabenListWithHierarchy({
  aufgaben = [],
  onAufgabeClick,
}) {
  // Gruppiere nach Master
  const grouped = {};
  const masterIds = new Set();

  aufgaben.forEach((aufgabe) => {
    if (aufgabe.is_master) {
      masterIds.add(aufgabe.id);
      grouped[aufgabe.id] = {
        master: aufgabe,
        replicas: [],
      };
    }
  });

  aufgaben.forEach((aufgabe) => {
    if (aufgabe.master_id && grouped[aufgabe.master_id]) {
      grouped[aufgabe.master_id].replicas.push(aufgabe);
    }
  });

  // Masters ohne Replicas anzeigen
  const result = Object.values(grouped).map((group) => (
    <div key={group.master.id} className="space-y-2">
      <AufgabeWithReplicasCard
        masterAufgabe={group.master}
        replicas={group.replicas}
        onMasterClick={() => onAufgabeClick?.(group.master)}
        onReplicaClick={(rep) => onAufgabeClick?.(rep)}
      />
    </div>
  ));

  // Standalone-Aufgaben (weder Master noch Replikat)
  const standalone = aufgaben.filter(
    (a) => !a.is_master && !a.master_id
  );

  standalone.forEach((aufgabe) => {
    result.push(
      <div key={aufgabe.id} onClick={() => onAufgabeClick?.(aufgabe)}>
        <AufgabeCardInner aufgabe={aufgabe}>
          Einzelaufgabe
        </AufgabeCardInner>
      </div>
    );
  });

  return <div className="space-y-4">{result}</div>;
}