import { useState } from 'react';
import { Loader2, LogIn, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabase } from '@/services/schueler/adapters/supabaseClient';

/**
 * Schlichte E-Mail/Passwort-Login-Maske für den Supabase-Modus.
 * Schüler-Konten werden von der Schule in Supabase angelegt
 * (Authentication → Users) – keine Selbstregistrierung.
 */
export default function SupabaseLoginForm({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) {
      // Konkrete Ursache anzeigen, damit Fehlkonfiguration (Key/URL)
      // von falschen Zugangsdaten unterscheidbar ist.
      const msg = authError.message || '';
      if (msg.includes('Invalid login credentials')) {
        setError('E-Mail oder Passwort ist falsch.');
      } else if (msg.includes('Email not confirmed')) {
        setError('E-Mail-Adresse wurde noch nicht bestätigt.');
      } else if (msg.includes('Invalid API key') || msg.includes('JWT')) {
        setError('Konfigurationsfehler: API-Key der App ist ungültig. (' + msg + ')');
      } else {
        setError('Anmeldung fehlgeschlagen: ' + (msg || 'Unbekannter Fehler. Prüfe deine Internetverbindung.'));
      }
      return;
    }
    onSuccess?.();
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-background p-5">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-7 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <span className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 text-primary mb-3">
            <GraduationCap className="w-7 h-7" />
          </span>
          <h1 className="text-xl font-bold text-foreground">Anmelden</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Melde dich mit deinem Schul-Zugang an.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="login-email">E-Mail</Label>
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vorname.nachname@schule.de"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="login-password">Passwort</Label>
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Anmelden
          </Button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-5">
          Kein Zugang? Wende dich an deine Lehrkraft.
        </p>
      </div>
    </div>
  );
}