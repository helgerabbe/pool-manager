import React from 'react';
import { Link } from 'react-router-dom';
import { DOC_GROUPS } from '@/lib/docsContent';
import { BookOpen, ChevronRight } from 'lucide-react';

export default function DocsIndex() {
  return (
    <div>
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-foreground mb-2">Dokumentation</h1>
        <p className="text-muted-foreground">Ausführliche Anleitungen und Erklärungen zu allen Bereichen des Pool-Managers.</p>
      </div>

      <div className="space-y-8">
        {DOC_GROUPS.map((group) => (
          <div key={group.label}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70 mb-3 px-1">
              {group.label}
            </h2>
            <div className="grid gap-2">
              {group.items.map((item) => (
                <Link
                  key={item.slug}
                  to={`/docs/${item.slug}`}
                  className="flex items-center gap-3 p-4 rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all group"
                >
                  <BookOpen className="w-4 h-4 text-primary shrink-0" />
                  <span className="font-medium text-sm text-foreground flex-1">{item.label}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}