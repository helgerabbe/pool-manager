import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Layers, Home, ShieldCheck, DatabaseZap, LogOut, ChevronRight, BookOpen, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRBAC } from '@/hooks/useRBAC';
import RoleSwitcher from '@/components/layout/RoleSwitcher';
import WartungsBanner from '@/components/layout/WartungsBanner';
import NavigationTooltip from '@/components/layout/NavigationTooltip';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

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
    queryFn: () => base44.entities.Einheiten.list('-created_date'),
    enabled: !!einheitId,
  });

  const isWorkspace = location.pathname === '/workspace' || location.pathname.startsWith('/einheit/');
  const einheit = einheiten.find(e => e.id === einheitId);

  if (!isWorkspace) return null;
  return einheit ? `${einheit.fach} – ${einheit.titel_der_einheit}` : 'Arbeitsbereich';
}

// ─────────────────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const location = useLocation();
  const { realRolle, permissions } = useRBAC();

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(path);

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden bg-background">
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
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                  <Layers className="w-4 h-4 text-primary-foreground" />
                </div>
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

              {/* Admin-Bereich (nur für Admins) */}
              {permissions.kannBenutzerVerwalten && (
                <>
                  <div className="w-px h-6 bg-border mx-1" />
                  <NavIconLink to="/benutzerverwaltung" icon={ShieldCheck} label="Benutzerverwaltung" isActive={isActive('/benutzerverwaltung')} />
                  <NavIconLink to="/seed" icon={DatabaseZap} label="Seed-Daten" isActive={isActive('/seed')} />
                  <NavIconLink to="/admin-settings" icon={Settings} label="Einstellungen" isActive={isActive('/admin-settings')} />
                </>
              )}

              <div className="w-px h-6 bg-border mx-1" />

              {/* Logout & Role Switcher */}
              <NavigationTooltip label="Abmelden">
                <button
                  aria-label="Abmelden"
                  onClick={() => base44.auth.logout()}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </NavigationTooltip>

              <RoleSwitcher realRolle={realRolle} anzeigeRolle={realRolle} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto min-h-0">
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}