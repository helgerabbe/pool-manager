import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  FileText,
  Link2,
  CheckSquare,
  BookOpen,
  Printer,
  AlertCircle,
  CheckCircle2,
  Edit2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mapping für Activity-Typen zu Icons und Labels
const ACTIVITY_TYPE_MAP = {
  URL: { icon: Link2, label: 'URL anlegen', color: 'text-blue-600' },
  Textfeld: { icon: FileText, label: 'Textfeld erstellen', color: 'text-gray-600' },
  Aufgabe: { icon: CheckSquare, label: 'Aufgabe konfigurieren', color: 'text-green-600' },
  Datei: { icon: FileText, label: 'Datei bereitstellen', color: 'text-purple-600' },
  Activity: { icon: BookOpen, label: 'Aktivität', color: 'text-amber-600' },
};

// Phase-Label und Farben
const PHASE_CONFIG = {
  Input: { label: 'Erarbeitung', color: 'bg-blue-50 border-blue-200', textColor: 'text-blue-900' },
  Übung: { label: 'Übung', color: 'bg-green-50 border-green-200', textColor: 'text-green-900' },
  Abschluss: { label: 'Abschluss', color: 'bg-purple-50 border-purple-200', textColor: 'text-purple-900' },
};

// Status-Badges
function StatusBadge({ syncStatus }) {
  if (syncStatus === 'new') {
    return (
      <Badge className="bg-green-100 text-green-700 border border-green-300 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        NEU
      </Badge>
    );
  }
  if (syncStatus === 'modified') {
    return (
      <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-300 gap-1">
        <Edit2 className="w-3 h-3" />
        GEÄNDERT
      </Badge>
    );
  }
  return null;
}

// Activity-Renderer
function ActivityItem({ activity, index }) {
  const typeConfig = ACTIVITY_TYPE_MAP[activity.type] || ACTIVITY_TYPE_MAP.Activity;
  const Icon = typeConfig.icon;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border-l-4 transition-all print:break-inside-avoid',
        activity.sync_status === 'new' ? 'border-l-green-500 bg-green-50' : 'border-l-muted bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', typeConfig.color)} />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-foreground">{index + 1}. {typeConfig.label}</div>
            {activity.name && (
              <div className="text-xs text-muted-foreground mt-0.5">{activity.name}</div>
            )}
          </div>
        </div>
        {activity.sync_status && <StatusBadge syncStatus={activity.sync_status} />}
      </div>

      {/* Metadaten */}
      {activity.config && Object.keys(activity.config).length > 0 && (
        <div className="mt-2 pl-6 space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2">
          {Object.entries(activity.config).map(([key, value]) => {
            if (!value) return null;
            const displayValue =
              typeof value === 'object' ? JSON.stringify(value) : String(value).substring(0, 60);
            return (
              <div key={key} className="break-words">
                <span className="font-medium text-foreground">{key}:</span> {displayValue}
              </div>
            );
          })}
        </div>
      )}

      {activity.content && (
        <div className="mt-2 pl-6 text-xs text-muted-foreground border-t border-border/50 pt-2 break-words">
          <span className="font-medium text-foreground">Inhalt:</span>
          <div className="mt-1 italic">{activity.content.substring(0, 100)}…</div>
        </div>
      )}
    </div>
  );
}

// Phase-Block
function PhaseBlock({ phase, activities }) {
  if (!activities || activities.length === 0) return null;

  const config = PHASE_CONFIG[phase] || {};

  return (
    <div
      className={cn(
        'rounded-lg border-2 p-4 mb-4 print:break-inside-avoid',
        config.color
      )}
    >
      <h3 className={cn('text-sm font-semibold mb-3', config.textColor)}>
        {config.label}
      </h3>
      <div className="space-y-2">
        {activities.map((activity, idx) => (
          <ActivityItem key={idx} activity={activity} index={idx} />
        ))}
      </div>
    </div>
  );
}

// Lernziele-Übersicht
function LearningGoalsSection({ goals }) {
  if (!goals || goals.length === 0) return null;

  return (
    <div className="mb-6 p-4 rounded-lg bg-slate-50 border border-slate-200 print:break-inside-avoid">
      <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
        <BookOpen className="w-4 h-4" />
        Lernziele
      </h3>
      <ul className="space-y-1 text-xs text-slate-700">
        {goals.map((goal, idx) => (
          <li key={idx} className="flex items-start gap-2">
            <span className="mt-1 text-slate-400">•</span>
            <div>
              <div className="font-medium">{goal.formulierung_fachsprache}</div>
              <div className="text-slate-500 text-[11px] mt-0.5">
                {goal.kategorie} – {goal.schueler_uebersetzung}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Hauptkomponente
export default function MoodleBauplanView({ exportData }) {
  if (!exportData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Kein Export-Datum verfügbar</p>
        </div>
      </div>
    );
  }

  return (
    <div id="moodle-bauplan" className="space-y-6">
      {/* Druck-Button */}
      <div className="flex justify-end gap-2 print:hidden sticky top-0 z-10 bg-background/95 backdrop-blur-sm p-4 -m-4 mb-6">
        <Button
          onClick={() => window.print()}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Printer className="w-4 h-4" />
          Drucken / PDF speichern
        </Button>
      </div>

      {/* Header */}
      <div className="print:page-break-after-avoid mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {exportData.unit_name}
        </h1>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium">Fach:</span> {exportData.unit_subject}
          </p>
          <p>
            <span className="font-medium">Jahrgangsstufe:</span> {exportData.unit_grade}
          </p>
          <p>
            <span className="font-medium">Export-Typ:</span>{' '}
            {exportData.export_type === 'full' ? 'Voll-Export' : 'Delta-Export (nur Änderungen)'}
          </p>
          <p>
            <span className="font-medium">Erstellt:</span>{' '}
            {new Date(exportData.export_timestamp).toLocaleString('de-DE')}
          </p>
        </div>
      </div>

      {/* Summary Box */}
      <Card className="bg-primary/5 border-primary/20 print:break-inside-avoid">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">
                {exportData.summary?.total_sections}
              </div>
              <div className="text-xs text-muted-foreground">Kursabschnitte</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {exportData.summary?.total_activities}
              </div>
              <div className="text-xs text-muted-foreground">Aktivitäten</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">
                {exportData.summary?.total_learning_goals}
              </div>
              <div className="text-xs text-muted-foreground">Lernziele</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Abschnitte */}
      <div className="space-y-8">
        {exportData.sections?.map((section, sectionIdx) => (
          <div key={sectionIdx} className="print:page-break-after-avoid print:break-inside-avoid">
            {/* Sektion-Header */}
            <div className="mb-4 pb-3 border-b-2 border-primary">
              <h2 className="text-xl font-bold text-foreground">
                {section.section_name}
              </h2>
              {section.duration_minutes && (
                <p className="text-xs text-muted-foreground mt-1">
                  Geschätzte Dauer: {section.duration_minutes} Min.
                </p>
              )}
            </div>

            {/* Lernziele */}
            <LearningGoalsSection goals={section.learning_goals} />

            {/* Aktivitäten nach Phasen */}
            <div className="mb-6">
              {['Input', 'Übung', 'Abschluss'].map((phase) => {
                const phaseActivities = section.activities?.filter((a) => a.phase === phase) || [];
                return (
                  <PhaseBlock
                    key={phase}
                    phase={phase}
                    activities={phaseActivities}
                  />
                );
              })}

              {/* Aktivitäten ohne Phase-Zuordnung */}
              {section.activities?.filter((a) => !a.phase)?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">
                    Weitere Aktivitäten
                  </h3>
                  <div className="space-y-2">
                    {section.activities
                      ?.filter((a) => !a.phase)
                      .map((activity, idx) => (
                        <ActivityItem key={idx} activity={activity} index={idx} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer für Druck */}
      <div className="print:block hidden mt-8 pt-4 border-t text-xs text-muted-foreground text-center">
        <p>Generiert mit PoolPlaner – {new Date().toLocaleDateString('de-DE')}</p>
      </div>
    </div>
  );
}