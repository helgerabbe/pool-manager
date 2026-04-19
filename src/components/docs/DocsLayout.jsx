import React, { useState } from 'react';
import { Link, useParams, Outlet } from 'react-router-dom';
import { DOC_NAV } from '@/lib/docsContent';
import { cn } from '@/lib/utils';
import { BookOpen, Menu, X, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

function DocsSidebar({ currentSlug, onClose }) {
  return (
    <nav className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-border flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary shrink-0" />
        <span className="font-semibold text-sm">Dokumentation</span>
        {onClose && (
          <button onClick={onClose} className="ml-auto p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-3 px-2">
        {DOC_NAV.map((item) => (
          <Link
            key={item.slug}
            to={`/docs/${item.slug}`}
            onClick={onClose}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors mb-0.5',
              currentSlug === item.slug
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <ChevronRight className={cn('w-3 h-3 shrink-0 transition-transform', currentSlug === item.slug && 'rotate-90 text-primary')} />
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export default function DocsLayout() {
  const { slug } = useParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card">
        <DocsSidebar currentSlug={slug} />
      </aside>

      {/* Mobile Overlay Sidebar */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-card border-r border-border flex flex-col shadow-xl">
            <DocsSidebar currentSlug={slug} onClose={() => setSidebarOpen(false)} />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="h-8 w-8">
            <Menu className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">Dokumentation</span>
        </div>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}