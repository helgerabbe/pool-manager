import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getCurrentUser } from '@/services/AuthService';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { LERNTYPEN } from '@/lib/lerntypen';
import DashboardKachel from '@/components/schueler/DashboardKachel';
import OnboardingKachel from '@/components/schueler/OnboardingKachel';
import LerntypWechselDialog from '@/components/schueler/LerntypWechselDialog';

/**
 * Einheits-Onboarding: Vorstellung der Einheit + Auswahl des Dashboards
 * (Lerntyp). Der Schüler wählt eines von vier Dashboards oder startet das
 * Onboarding, das ihm eine Empfehlung ausspricht. Ein Wechsel des bereits
 * gewählten Dashboards verwirft bewusst den bisherigen Fortschritt.
 */
export default function EinheitOnboarding() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const urlParams = new URLSearchParams(window.location.search);
  const einheitId = urlParams.get('id');

  const [wechselZiel, setWechselZiel] = useState(null);
  const [speichert, setSpeichert] = useState(false);

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
  const aktiverTyp = fortschritt?.gewaehlter_lerntyp || null;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['schuelerFortschritt', user?.email] });

  // Dashboard wählen / wechseln. Bei Wechsel wird der Fortschritt zurückgesetzt.
  const dashboardWaehlen = async (typKey, reset = false) => {
    if (!user?.email || !einheitId) return;
    setSpeichert(true);
    try {
      if (fortschritt) {
        await base44.entities.SchuelerEinheitFortschritt.update(fortschritt.id, {
          gewaehlter_lerntyp: typKey,
        });
      } else {
        await base44.entities.SchuelerEinheitFortschritt.create({
          user_email: user.email,
          einheit_id: einheitId,
          gewaehlter_lerntyp: typKey,
        });
      }
      await refresh();
      navigate(`/lernen/dashboard?id=${einheitId}&lerntyp=${typKey}`);
    } finally {
      setSpeichert(false);
    }
  };

  const handleKachelKlick = (typKey) => {
    if (aktiverTyp && aktiverTyp !== typKey) {
      setWechselZiel(typKey);
    } else {
      dashboardWaehlen(typKey);
    }
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Einheit wird geladen …</div>;
  }
  if (!einheit) {
    return <div className="h-full flex items-center justify-center text-muted-foreground">Einheit nicht gefunden.</div>;
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">
        <Link
          to="/lernen"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </Link>

        {/* Vorstellung der Einheit */}
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
              <BookOpen className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {einheit.fach}
                {einheit.jahrgangsstufe ? ` · Klasse ${einheit.jahrgangsstufe}` : ''}
              </p>
              <h1 className="text-lg font-bold text-foreground tracking-tight truncate">{einheit.titel_der_einheit}</h1>
            </div>
          </div>
          {Array.isArray(einheit.gesamtziele) && einheit.gesamtziele.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs font-semibold text-foreground mb-1.5">Das lernst du in dieser Einheit:</p>
              <ul className="space-y-1">
                {einheit.gesamtziele.map((ziel, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex gap-2">
                    <span className="text-primary">•</span>
                    {ziel}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Onboarding */}
        <div className="mb-4">
          <OnboardingKachel
            done={!!fortschritt?.onboarding_done}
            empfehlung={fortschritt?.onboarding_empfehlung}
            onClick={() => navigate(`/lernen/onboarding?id=${einheitId}`)}
          />
        </div>

        {/* Dashboard-Auswahl */}
        <h2 className="text-sm font-bold text-foreground mb-0.5">Wähle dein Dashboard</h2>
        <p className="text-xs text-muted-foreground mb-3">
          {aktiverTyp
            ? 'Du kannst dein Dashboard wechseln – dein Fortschritt startet dann neu.'
            : 'Mit welchem Lerntyp möchtest du an dieser Einheit arbeiten?'}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {LERNTYPEN.map((lt) => (
            <DashboardKachel
              key={lt.key}
              lerntyp={lt}
              aktiv={aktiverTyp === lt.key}
              empfohlen={fortschritt?.onboarding_empfehlung === lt.key}
              gedimmt={!!aktiverTyp && aktiverTyp !== lt.key}
              onClick={() => !speichert && handleKachelKlick(lt.key)}
            />
          ))}
        </div>
      </div>

      <LerntypWechselDialog
        open={!!wechselZiel}
        onOpenChange={(o) => !o && setWechselZiel(null)}
        vonTyp={aktiverTyp}
        zuTyp={wechselZiel}
        onBestaetigen={() => {
          const ziel = wechselZiel;
          setWechselZiel(null);
          dashboardWaehlen(ziel, true);
        }}
      />
    </div>
  );
}