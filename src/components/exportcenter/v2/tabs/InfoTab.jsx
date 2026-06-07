/**
 * InfoTab.jsx
 *
 * Erster Reiter des Air-Gap-Übergabe-Centers. Bündelt die früher oberhalb
 * der Tab-Leiste liegenden Status-Infos (Einheit-Metadaten, Lifecycle,
 * Abschluss-Button, Delta-Analyse) in einem eigenen Tab. Damit verschiebt
 * sich der eigentliche Übergabe-Workflow weiter nach oben im Sichtfeld.
 *
 * Reine Präsentation — alle Mutationen leben weiterhin in den
 * eingebetteten Sub-Komponenten.
 */
import React from 'react';
import ExportCenterStatusHeader from '@/components/exportcenter/ExportCenterStatusHeader';
import ExportContentTimestamp from '@/components/exportcenter/ExportContentTimestamp';

export default function InfoTab({ einheit }) {
  if (!einheit) return null;
  return (
    <div className="space-y-4">
      <ExportCenterStatusHeader einheit={einheit} />
      <ExportContentTimestamp einheit={einheit} />
    </div>
  );
}