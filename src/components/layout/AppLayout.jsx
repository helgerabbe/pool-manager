import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import TutorialSlideshow from '@/components/onboarding/TutorialSlideshow';
import { Layers, Home, ShieldCheck, LogOut, ChevronRight, BookOpen, Settings, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRBAC } from '@/hooks/useRBAC';
import WartungsBanner from '@/components/layout/WartungsBanner';
import NavigationTooltip from '@/components/layout/NavigationTooltip';
import { logout } from '@/services/AuthService';
import { useQuery } from '@tanstack/react-query';
import { getAllEinheiten } from '@/services/EinheitenService';
import { usePresence } from '@/hooks/usePresence';
import { useRealtimeUpdates } from '@/hooks/useRealtimeUpdates';
import { useQueryClient } from '@tanstack/react-query';
import { handleRealtimeUpdate } from '@/utils/realtimeCacheManager';

// Wiederverwendbarer Icon-Nav-Link mit sofortigem Tooltip
function NavIconLink({ to, icon: Icon, label, isActive }) {
  return (
    <NavigationTooltip label={label}>
      <Link
        to={to}
        aria-label={label}
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-xl transition-all',
          isActive
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
      >
        <Icon className="w-5 h-5" />
      </Link>
    </NavigationTooltip>
  );
}

// ── Breadcrumb-Logik ─────────────────────────────────────────────────────────

function useBreadcrumb(location) {
  const urlParams = new URLSearchParams(location.search);
  const einheitId = urlParams.get('einheit');

  const { data: einheiten = [] } = useQuery({
    queryKey: ['einheiten'],
    queryFn: () => getAllEinheiten(),
    enabled: !!einheitId,
  });

  const isWorkspace = location.pathname === '/workspace' || location.pathname.startsWith('/einheit/');
  const einheit = einheiten.find(e => e.id === einheitId);

  if (!isWorkspace) return null;
  return einheit ? `${einheit.fach} – ${einheit.titel_der_einheit}` : 'Arbeitsbereich';
}

// ─────────────────────────────────────────────────────────────────────────────

function WorkspaceAwareContent({ location }) {
  const isFullScreen =
    location.pathname === '/workspace' ||
    location.pathname.startsWith('/einheiten/') ||
    (location.pathname.startsWith('/einheit/') && location.pathname !== '/einheit/create');

  if (isFullScreen) {
    return (
      <div className="h-full w-full overflow-hidden overflow-x-hidden">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="px-4 sm:px-6 lg:px-8 py-8 max-w-full">
        <Outlet />
      </div>
    </div>
  );
}

// Globaler Presence-Hook: läuft unabhängig von der aktuellen Seite
function GlobalPresenceHeartbeat() {
  usePresence('app');
  return null;
}

// Globaler SSE-Hook: baut beim Mount eine authentifizierte Echtzeit-Verbindung auf.
// Phase 2: Eingehende Payloads patchen direkt den React Query Cache → Zero-Latency-UI-Updates.
function GlobalRealtimeUpdates() {
  const queryClient = useQueryClient();
  useRealtimeUpdates((payload) => {
    handleRealtimeUpdate(queryClient, payload);
  });
  return null;
}

export default function AppLayout() {
  const location = useLocation();
  const { realRolle, permissions } = useRBAC();

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(path);

  return (
    <div className="h-[100dvh] w-full flex flex-col overflow-hidden overflow-x-hidden bg-background">
      <GlobalPresenceHeartbeat />
      <GlobalRealtimeUpdates />
      <TutorialSlideshow />
      <WartungsBanner />
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      {/* ──────────────────── GLOBALE TOP BAR (immer sichtbar) ──────────────────── */}
      {/* ═══════════════════════════════════════════════════════════════════════════ */}
      <header className="shrink-0 bg-card/80 backdrop-blur-xl border-b border-border z-50">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Links: Logo */}
            <div className="flex items-center gap-2.5 shrink-0">
              <Link to="/" className="flex items-center gap-2.5 shrink-0">
                <img
                   src="https://media.base44.com/images/public/69cb7e99726da2a1d81bee50/84d10855a_image.png"
                   alt="Pool-Manager Icon"
                   className="w-10 h-10 rounded-xl object-cover"
                 />
                <span className="text-base font-bold text-foreground tracking-tight hidden sm:inline">Pool-Manager</span>
              </Link>
            </div>

            {/* Rechts: NUR globale Icons (Home, Einheiten, Admin, Profil) */}
            <nav className="flex items-center gap-1" aria-label="Globale Navigation">

              <div className="w-px h-6 bg-border mx-1" />

              {/* Home / Startseite */}
              <NavIconLink to="/" icon={Home} label="Startseite" isActive={isActive('/')} />

              {/* Einheiten / Arbeitsbereich */}
              <NavIconLink to="/einheiten" icon={Layers} label="Einheiten / Arbeitsbereich" isActive={isActive('/einheiten') || isActive('/workspace')} />

              {/* Basismodule */}
              <NavIconLink to="/basismodule" icon={BookOpen} label="Basismodule" isActive={isActive('/basismodule')} />

              {/* Dokumentation */}
              <NavIconLink to="/docs" icon={FileText} label="Dokumentation" isActive={isActive('/docs')} />

              {/* Admin-Bereich (nur für Admins) */}
              {permissions.kannBenutzerVerwalten && (
                <>
                  <div className="w-px h-6 bg-border mx-1" />
                  <NavIconLink to="/benutzerverwaltung" icon={ShieldCheck} label="Benutzerverwaltung" isActive={isActive('/benutzerverwaltung')} />
                  <NavIconLink to="/admin-settings" icon={Settings} label="Einstellungen" isActive={isActive('/admin-settings')} />
                </>
              )}

              {/* Benutzer-Profil mit Rolle */}
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/50 border border-border">
                <div className="flex flex-col items-end">
                  <span className="text-xs font-semibold text-foreground leading-tight">
                    {realRolle === 'Administrator' ? 'Admin' : realRolle}
                  </span>
                </div>
              </div>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Logout & Role Switcher */}
              <NavigationTooltip label="Abmelden">
                <button
                  aria-label="Abmelden"
                  onClick={() => logout(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </NavigationTooltip>


            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden overflow-x-hidden min-h-0">
        <WorkspaceAwareContent location={location} />
      </main>
    </div>
  );
}