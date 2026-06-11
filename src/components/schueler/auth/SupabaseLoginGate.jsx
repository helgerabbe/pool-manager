import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { isSupabase } from '@/services/schueler/backend';
import SupabaseLoginForm from './SupabaseLoginForm';

/**
 * Login-Gate für den Schülerbereich im Supabase-Modus.
 *
 * - Base44-Modus (Default): komplett unsichtbar, rendert sofort die Kind-Routen
 *   (Login übernimmt die Base44-Plattform).
 * - Supabase-Modus: prüft die Session; ohne Login erscheint die Login-Maske,
 *   bei Session-Wechsel (Login/Logout) wird automatisch umgeschaltet.
 */
export default function SupabaseLoginGate() {
  const supabaseMode = isSupabase();
  const [checking, setChecking] = useState(supabaseMode);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!supabaseMode) return undefined;

    let subscription = null;
    // Dynamischer Import: im Base44-Modus wird der Supabase-Client nie geladen.
    import('@/services/schueler/adapters/supabaseClient').then(({ getSupabase }) => {
      const supabase = getSupabase();
      supabase.auth.getSession().then(({ data }) => {
        setLoggedIn(!!data?.session);
        setChecking(false);
      });
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        setLoggedIn(!!session);
      });
      subscription = data?.subscription;
    });

    return () => subscription?.unsubscribe();
  }, [supabaseMode]);

  if (!supabaseMode) return <Outlet />;

  if (checking) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!loggedIn) {
    return <SupabaseLoginForm onSuccess={() => setLoggedIn(true)} />;
  }

  return <Outlet />;
}