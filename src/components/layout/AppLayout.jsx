import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { BookOpen, Layers, Home, ShieldCheck, DatabaseZap, Download, LayoutTemplate, Settings2, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRBAC } from '@/hooks/useRBAC';
import RoleSwitcher from '@/components/layout/RoleSwitcher';
import WartungsBanner from '@/components/layout/WartungsBanner';

export default function AppLayout() {
  const location = useLocation();
  const { rolle, realRolle, permissions } = useRBAC();

  return (
    <div className="min-h-screen bg-background">
      <WartungsBanner />
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Layers className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <span className="text-lg font-bold text-foreground tracking-tight">PoolPlaner</span>
                <span className="hidden sm:inline text-xs text-muted-foreground ml-2">Kollaborative Unterrichtsplanung</span>
              </div>
            </Link>
            <nav className="flex items-center gap-1">
              {[
                { path: '/', label: 'Übersicht', icon: Home },
                { path: '/einheit/create', label: 'Neue Einheit', icon: PlusCircle },
                { path: '/einheit/workspace', label: 'Workspace', icon: LayoutTemplate },
              ].map(item => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path ||
                  (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
              {permissions.kannExportieren && (
                <Link
                  to="/einheit/export"
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                    location.pathname === '/einheit/export'
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Export</span>
                </Link>
              )}
              {permissions.kannBenutzerVerwalten && (
                <>
                  <Link
                    to="/benutzerverwaltung"
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      location.pathname === '/benutzerverwaltung'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Benutzer</span>
                  </Link>
                  <Link
                   to="/admin-settings"
                   className={cn(
                     "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                     location.pathname === '/admin-settings'
                       ? "bg-primary text-primary-foreground"
                       : "text-muted-foreground hover:text-foreground hover:bg-muted"
                   )}
                  >
                   <Settings2 className="w-4 h-4" />
                   <span className="hidden sm:inline">Einstellungen</span>
                  </Link>
                  <Link
                   to="/seed"
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      location.pathname === '/seed'
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    <DatabaseZap className="w-4 h-4" />
                    <span className="hidden sm:inline">Seed</span>
                  </Link>
                </>
              )}
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