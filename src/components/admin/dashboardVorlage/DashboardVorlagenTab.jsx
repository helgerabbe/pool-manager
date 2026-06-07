/**
 * DashboardVorlagenTab.jsx
 *
 * Inhalt des Verwaltungs-Tabs „Dashboards". Erklärt kurz Zweck & Wirkung der
 * Standard-Vorlagen und rendert darunter den Drag&Drop-Editor.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Info } from 'lucide-react';
import DashboardVorlageEditor from '@/components/admin/dashboardVorlage/DashboardVorlageEditor';

export default function DashboardVorlagenTab() {
  return (
    <Card className="border shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Standard-Aufbau der Dashboards</CardTitle>
        <CardDescription>
          Lege hier pro Lerntyp den Standard-Aufbau fest, mit dem ein Dashboard startet.
          Verwende nur Standard-Elemente (Bausteine, Platzhalter, Bündel) – die echten
          Aufgaben einer Einheit werden später von der Fachschaftsleitung ergänzt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-blue-50/60 p-3 text-sm text-blue-900">
          <Info className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
          <div className="space-y-1">
            <p className="font-medium">So wirkt diese Vorlage</p>
            <p className="text-blue-800/90 leading-relaxed">
              Die Vorlage hat <strong>keine</strong> rückwirkende Wirkung auf bestehende Einheiten.
              Sie greift nur, wenn ein Dashboard zum ersten Mal geöffnet wird oder eine
              Fachschaftsleitung bewusst „Auf Standard zurücksetzen" wählt. Danach kann der
              Aufbau pro Einheit frei verändert werden. Eine Arbeitsphase erscheint hier als
              <strong> Muster</strong> – in der echten Einheit wird sie automatisch pro
              Themenfeld vervielfältigt.
            </p>
          </div>
        </div>
        <DashboardVorlageEditor />
      </CardContent>
    </Card>
  );
}