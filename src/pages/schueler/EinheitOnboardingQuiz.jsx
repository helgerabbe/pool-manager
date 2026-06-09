import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import { ArrowLeft } from 'lucide-react';
import { ladeOnboardingSnapshots } from '@/lib/onboardingSnapshots';
import OnboardingStepNav from '@/components/schueler/onboarding/OnboardingStepNav';
import StepUeberblick from '@/components/schueler/onboarding/StepUeberblick';
import StepSelbsteinschaetzung from '@/components/schueler/onboarding/StepSelbsteinschaetzung';
import StepWissensCheck from '@/components/schueler/onboarding/StepWissensCheck';
import StepBrianChat from '@/components/schueler/onboarding/StepBrianChat';
import StepEmpfehlung from '@/components/schueler/onboarding/StepEmpfehlung';

/**
 * Einheits-Onboarding („Welcher Lerntyp bist du?").
 *
 * Vierstufiger Ablauf + Empfehlung, ansteuerbar über eine Menüleiste:
 *   1. Überblick über die Einheit
 *   2. Selbsteinschätzung (Schieberegler)
 *   3. Wissens-Check (Multiple Choice)
 *   4. Brian fragen (simuliertes KI-Gespräch)
 *   5. Empfehlung (KI wertet alles aus → Lerntyp-Vorschlag)
 *
 * Die Inhalte stammen aus der Single Source of Truth (SchuelerInhaltSnapshot,
 * geltungsbereich='einheit'). Am Ende wird die Empfehlung in SchuelerEinheitFortschritt gespeichert –
 * der Schüler kann das Onboarding beliebig oft wiederholen.
 */
export default function EinheitOnboardingQuiz() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const einheitId = urlParams.get('id');

  const [step, setStep] = useState('einfuehrung');
  const [besucht, setBesucht] = useState(['einfuehrung']);
  const [selbstWerte, setSelbstWerte] = useState({});
  const [quizAnteil, setQuizAnteil] = useState(null);
  const [brianVerlauf, setBrianVerlauf] = useState([]);

  const { data: einheit, isLoading } = useQuery({
    queryKey: ['einheit', einheitId],
    queryFn: () => base44.entities.Einheiten.get(einheitId),
    enabled: !!einheitId,
  });

  const { data: user } = useQuery({
    queryKey: ['authUser'],
    queryFn: () => getCurrentUser(),
    staleTime: 30 * 1000,
  });

  const { data: fortschritte = [] } = useQuery({
    queryKey: ['schuelerFortschritt', user?.email],
    queryFn: () => base44.entities.SchuelerEinheitFortschritt.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const fortschritt = fortschritte.find((f) => f.einheit_id === einheitId) || null;

  // Onboarding-Inhalte aus der Single Source of Truth lesen (SchuelerInhaltSnapshot,
  // geltungsbereich='einheit'), nicht mehr aus einheit.onboarding_konfiguration.
  const { data: onboarding = {} } = useQuery({
    queryKey: ['onboardingSnapshots', einheitId],
    queryFn: () => ladeOnboardingSnapshots(einheitId),
    enabled: !!einheitId,
  });

  const geheZu = (key) => {
    setBesucht((b) => (b.includes(key) ? b : [...b, key]));
    setStep(key);
  };

  // Selbsteinschätzungs-Durchschnitt (0..100).
  const selbstAvg = (() => {
    const fragen = onboarding?.fragenblock?.fragen;
    const anzahl = Array.isArray(fragen) && fragen.length > 0 ? fragen.length : 1;
    let sum = 0;
    for (let i = 0; i < anzahl; i += 1) sum += selbstWerte[i] ?? 50;
    return Math.round(sum / anzahl);
  })();

  // Empfehlung im Fortschritt speichern.
  const empfehlungSpeichern = async (empfehlung) => {
    if (!user?.email || !einheitId || !empfehlung) return;
    if (fortschritt) {
      await base44.entities.SchuelerEinheitFortschritt.update(fortschritt.id, {
        onboarding_done: true,
        onboarding_empfehlung: empfehlung,
      });
    } else {
      await base44.entities.SchuelerEinheitFortschritt.create({
        user_email: user.email,
        einheit_id: einheitId,
        onboarding_done: true,
        onboarding_empfehlung: empfehlung,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['schuelerFortschritt', user?.email] });
  };

  // Dashboard wählen + zurück in die Einheit.
  const dashboardWaehlen = async (typKey) => {
    if (!user?.email || !einheitId) return;
    if (fortschritt) {
      await base44.entities.SchuelerEinheitFortschritt.update(fortschritt.id, { gewaehlter_lerntyp: typKey });
    } else {
      await base44.entities.SchuelerEinheitFortschritt.create({
        user_email: user.email,
        einheit_id: einheitId,
        gewaehlter_lerntyp: typKey,
      });
    }
    queryClient.invalidateQueries({ queryKey: ['schuelerFortschritt', user?.email] });
    navigate(`/lernen/dashboard?id=${einheitId}&lerntyp=${typKey}`);
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Einheit wird geladen …</div>;
  }
  if (!einheit) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Einheit nicht gefunden.</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 py-8">
        <Link
          to={`/lernen/einheit?id=${einheitId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Einheit
        </Link>

        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Welcher Lerntyp bist du?</h1>
        <p className="text-sm text-muted-foreground mb-5">
          Geh die Schritte durch – am Ende bekommst du eine Empfehlung, welches Dashboard zu dir passt.
        </p>

        <div className="mb-6">
          <OnboardingStepNav aktiv={step} besucht={besucht} onSelect={geheZu} />
        </div>

        {step === 'einfuehrung' && (
          <StepUeberblick
            einfuehrung={onboarding.einfuehrung}
            einheit={einheit}
            onWeiter={() => geheZu('selbst')}
          />
        )}

        {step === 'selbst' && (
          <StepSelbsteinschaetzung
            fragenblock={onboarding.fragenblock}
            werte={selbstWerte}
            onChange={(i, v) => setSelbstWerte((p) => ({ ...p, [i]: v }))}
            onWeiter={() => geheZu('quiz')}
            onZurueck={() => geheZu('einfuehrung')}
          />
        )}

        {step === 'quiz' && (
          <StepWissensCheck
            diagnose={onboarding.einstiegsdiagnose}
            onAnteil={setQuizAnteil}
            onWeiter={() => geheZu('brian')}
            onZurueck={() => geheZu('selbst')}
          />
        )}

        {step === 'brian' && (
          <StepBrianChat
            einheitId={einheitId}
            leitfaden={onboarding.lerntyp_diagnose}
            verlauf={brianVerlauf}
            setVerlauf={setBrianVerlauf}
            onWeiter={() => geheZu('empfehlung')}
            onZurueck={() => geheZu('quiz')}
          />
        )}

        {step === 'empfehlung' && (
          <StepEmpfehlung
            einheitId={einheitId}
            selbstAvg={selbstAvg}
            quizAnteil={quizAnteil}
            brianVerlauf={brianVerlauf}
            onSpeichern={empfehlungSpeichern}
            onDashboard={dashboardWaehlen}
            onZurueck={() => geheZu('brian')}
          />
        )}
      </div>
    </div>
  );
}