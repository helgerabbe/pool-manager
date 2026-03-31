import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { BookOpen, Layers, Home, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRBAC } from '@/hooks/useRBAC';
import { Badge } from '@/components/ui/badge';

const rollenBadgeColors = {
  Administrator:      'bg-red-100 text-red-700',
  Fachschaftsleitung: 'bg-purple-100 text-purple-700',
  Fachlehrkraft:      'bg-blue-100 text-blue-700',
  Betrachter:         'bg-gray-100 text-gray-600',
  'Moodle-Designer':  'bg-green-100 text-green-700',
};

export default function AppLayout() {
  const location = useLocation();
  const { rolle, permissions } = useRBAC();

  return (
    <div className="min-h-screen bg-background">
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
                { path: '/einheiten', label: 'Einheiten', icon: BookOpen },
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
              {permissions.kannBenutzerVerwalten && (
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
              )}
              {rolle && (
                <Badge className={`ml-2 text-[10px] hidden sm:inline-flex ${rollenBadgeColors[rolle] || 'bg-muted text-muted-foreground'}`}>
                  {rolle}
                </Badge>
              )}
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