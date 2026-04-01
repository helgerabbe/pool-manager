import React from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import { Layers, Home, ShieldCheck, DatabaseZap, Download, LayoutTemplate, Settings2, PlusCircle, LogOut, ChevronRight } from 'lucide-react';
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
  const { rolle, realRolle, permissions } = useRBAC();
  const breadcrumbLabel = useBreadcrumb(location);

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname === path || location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-background">
      <WartungsBanner />
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo + Breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/" className="flex items-center gap-2.5 shrink-0">
                <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                  <Layers className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="text-base font-bold text-foreground tracking-tight hidden sm:inline">PoolPlaner</span>
              </Link>

              {breadcrumbLabel && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                  <span className="text-sm text-muted-foreground truncate max-w-[240px]">{breadcrumbLabel}</span>
                </div>
              )}
            </div>

            {/* Icon-Nav */}
            <nav className="flex items-center gap-1" aria-label="Hauptnavigation">

              {/* Trennlinie */}
              <div className="w-px h-6 bg-border mx-1" />

              <NavIconLink to="/"                 icon={Home}        label="Übersicht"    isActive={isActive('/')} />
              <NavIconLink to="/einheit/create"   icon={PlusCircle}  label="Neue Einheit" isActive={isActive('/einheit/create')} />
              <NavIconLink to="/einheit/workspace" icon={LayoutTemplate} label="Workspace" isActive={isActive('/einheit/workspace')} />

              {permissions.kannExportieren && (
                <NavIconLink to="/einheit/export" icon={Download} label="Moodle-Export" isActive={isActive('/einheit/export')} />
              )}

              {permissions.kannBenutzerVerwalten && (
                <>
                  <div className="w-px h-6 bg-border mx-1" />
                  <NavIconLink to="/benutzerverwaltung" icon={ShieldCheck} label="Benutzerverwaltung" isActive={isActive('/benutzerverwaltung')} />
                  <NavIconLink to="/admin-settings"     icon={Settings2}   label="Einstellungen"      isActive={isActive('/admin-settings')} />
                  <NavIconLink to="/seed"               icon={DatabaseZap} label="Seed-Daten"          isActive={isActive('/seed')} />
                </>
              )}

              <div className="w-px h-6 bg-border mx-1" />

              {/* Abmelden */}
              <NavigationTooltip label="Abmelden">
                <button
                  aria-label="Abmelden"
                  onClick={() => base44.auth.logout()}
                  className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </NavigationTooltip>

              <RoleSwitcher realRolle={realRolle} anzeigeRolle={rolle} />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}