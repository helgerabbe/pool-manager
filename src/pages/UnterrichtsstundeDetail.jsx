import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, KeyRound, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import StundenCoachPanel from '@/components/unterrichtsstunden/StundenCoachPanel';
import StundenPhaseCard from '@/components/unterrichtsstunden/StundenPhaseCard';
import StundenPhaseHinzufuegenButton from '@/components/unterrichtsstunden/StundenPhaseHinzufuegenButton';
import StundenSteckbriefCard from '@/components/unterrichtsstunden/StundenSteckbriefCard';
import StundenVerlaufsplanTabelle from '@/components/unterrichtsstunden/StundenVerlaufsplanTabelle';
import StundenHinweiseFeld from '@/components/unterrichtsstunden/StundenHinweiseFeld';
import StundeGenerierenButton from '@/components/unterrichtsstunden/StundeGenerierenButton';
import StundenRegieblattDruckButton from '@/components/unterrichtsstunden/StundenRegieblattDruckButton';
import StundenSchueleransichtTab from '@/components/unterrichtsstunden/StundenSchueleransichtTab';
import StundenMoodleUebergabeTab from '@/components/unterrichtsstunden/StundenMoodleUebergabeTab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/**
 * Moodle-Unterrichts-Generator, Paket 1: Grundgerüst der Stunden-Ansicht.
 * Das eigentliche Regieblatt (Phasen-Liste mit Codes, Material und
 * Aktivitäten) folgt in den Paketen 2-4.
 */
export default function UnterrichtsstundeDetail() {
  const { id } = useParams();
  const [editPhase, setEditPhase] = React.useState(null);

  const { data: stunde, isLoading } = useQuery({
    queryKey: ['unterrichtsstunde', id],
    queryFn: () => base44.entities.Unterrichtsstunde.get(id),
    enabled: !!id,
  });

  const { data: phasen = [], isLoading: phasenLoading } = useQuery({
    queryKey: ['stundenSequenzen', id],
    queryFn: () => base44.entities.StundenSequenz.filter({ stunde_id: id }, 'reihenfolge', 50),
    enabled: !!id,
  });

  if (isLoading || phasenLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!stunde) {
    return <p className="text-sm text-muted-foreground py-10 text-center">Diese Unterrichtsstunde wurde nicht gefunden.</p>;
  }

  const plan = stunde.coach_plan || {};

  return (
    <div className="space-y-6">
      <Link to="/einheiten" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Zurück zur Privaten Bibliothek
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{stunde.arbeitstitel}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {stunde.fach} · Jg. {stunde.jahrgangsstufe} ·{' '}
          {stunde.status === 'bereit' ? 'bereit für den Unterricht' : 'in Planung'}
        </p>
      </div>

      {stunde.notfall_code && (
        <div className="rounded-xl border bg-card p-4 flex items-center gap-3">
          <KeyRound className="w-4 h-4 text-accent shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Notfall-Code dieser Stunde</p>
            <p className="text-xs text-muted-foreground">
              Schaltet jede Phase frei, falls Ihnen die Phasen-Codes gerade nicht vorliegen.
            </p>
          </div>
          <Badge className="ml-auto text-base px-3 py-1 font-mono">{stunde.notfall_code}</Badge>
        </div>
      )}

      <Tabs defaultValue={phasen.length > 0 ? 'regieblatt' : 'coach'}>
        <TabsList>
          <TabsTrigger value="coach">1. KI-Generator</TabsTrigger>
          <TabsTrigger value="regieblatt" className="gap-2">
            2. Stunden-Regieblatt
            {phasen.length > 0 && (
              <Badge variant="secondary" className="gap-1 text-[11px] px-1.5 py-0 bg-emerald-100 text-emerald-900">
                <Check className="w-3 h-3" />
                {phasen.length} Phasen
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="schueler">3. Schüleransicht</TabsTrigger>
          <TabsTrigger value="moodle">4. Moodle-Übergabe</TabsTrigger>
        </TabsList>

        {/* Bauanleitung des Coaches — bleibt dauerhaft erhalten */}
        <TabsContent value="coach" className="space-y-4 mt-4">
          <StundenSteckbriefCard steckbrief={plan.steckbrief} />
          <StundenVerlaufsplanTabelle verlaufsplan={plan.verlaufsplan} stunde={stunde} plan={plan} />
          {(plan.verlaufsplan || []).length > 0 && <StundenHinweiseFeld stunde={stunde} plan={plan} />}
          <StundenCoachPanel stunde={stunde} />
          <StundeGenerierenButton stunde={stunde} plan={plan} hatPhasen={phasen.length > 0} />
        </TabsContent>

        <TabsContent value="regieblatt" className="space-y-3 mt-4">
          {phasen.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Noch keine Phasen vorhanden. Erarbeiten Sie zuerst im Tab „KI-Generator“ eine Bauanleitung und generieren Sie daraus das Regieblatt.
            </p>
          ) : (
            <>
              <div className="flex justify-end">
                <StundenRegieblattDruckButton stunde={stunde} phasen={phasen} />
              </div>
              {phasen.map((p, i) => (
                <StundenPhaseCard
                  key={p.id}
                  phase={p}
                  nummer={i + 1}
                  anzahl={phasen.length}
                  stunde={stunde}
                  stundeId={id}
                  offen={editPhase === p.id}
                  onToggle={() => setEditPhase(editPhase === p.id ? null : p.id)}
                />
              ))}
              <StundenPhaseHinzufuegenButton stundeId={id} phasen={phasen} />
              <p className="text-xs text-muted-foreground">
                Über „Bearbeiten“ klappt die Phase auf: dort passen Sie Texte an, laden Materialien hoch und verknüpfen digitale Aufgabenarten.
              </p>
            </>
          )}
        </TabsContent>

        <TabsContent value="schueler" className="mt-4">
          <StundenSchueleransichtTab stunde={stunde} phasen={phasen} />
        </TabsContent>

        <TabsContent value="moodle" className="mt-4">
          <StundenMoodleUebergabeTab stunde={stunde} phasen={phasen} />
        </TabsContent>
      </Tabs>

    </div>
  );
}