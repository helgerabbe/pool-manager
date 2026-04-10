/**
 * AuthService.js
 *
 * Service-Layer für Authentifizierung und Session-Management.
 * Einzige Datei, die base44.auth importieren darf.
 *
 * MIGRATIONSHINWEIS:
 * - `getCurrentUser()` ersetzt base44.auth.me(). Bei Supabase: supabase.auth.getUser()
 * - `logout()` ersetzt base44.auth.logout(). Bei Supabase: supabase.auth.signOut()
 * - `navigateToLogin()` ist base44-spezifisch (SDK-Redirect). Bei Supabase:
 *   einfach zu react-router navigate('/login') wechseln.
 * - `getAppPublicSettings()` ist ein base44-Plattformkonzept (isLoadingPublicSettings).
 *   Bei Supabase entfällt dieser Schritt vollständig – AuthContext kann dann sofort
 *   mit checkUserAuth() starten ohne vorherigen Public-Settings-Check.
 */

import { base44 } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';
import { createAxiosClient } from '@base44/sdk/dist/utils/axios-client';

/**
 * Lädt die öffentlichen App-Einstellungen (base44-spezifisch).
 * Enthält u.a. Auth-Status-Informationen (auth_required, user_not_registered).
 * Bei Supabase-Migration: Diese Funktion komplett entfernen und
 * den AuthContext-Flow direkt mit getCurrentUser() starten.
 */
export async function getAppPublicSettings() {
  const appClient = createAxiosClient({
    baseURL: `/api/apps/public`,
    headers: { 'X-App-Id': appParams.appId },
    token: appParams.token,
    interceptResponses: true,
  });
  return appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
}

/**
 * Gibt an, ob ein Auth-Token im Client vorhanden ist (synchron).
 */
export function hasToken() {
  return !!appParams.token;
}

/**
 * Lädt den aktuell eingeloggten User.
 * Bei Supabase: const { data: { user } } = await supabase.auth.getUser()
 */
export async function getCurrentUser() {
  return base44.auth.me();
}

/**
 * Meldet den User ab und leitet optional zur aktuellen URL zurück.
 * Bei Supabase: await supabase.auth.signOut()
 */
export function logout(redirectBack = true) {
  if (redirectBack) {
    base44.auth.logout(window.location.href);
  } else {
    base44.auth.logout();
  }
}

/**
 * Leitet den Browser zur Login-Seite weiter.
 * Bei Supabase: navigate('/login') oder supabase OAuth-Flow.
 */
export function navigateToLogin() {
  base44.auth.redirectToLogin(window.location.href);
}