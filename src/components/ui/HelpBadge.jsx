/**
 * HelpBadge.jsx
 *
 * Kompakte Inline-Hilfe: kleines ?-Icon, bei Hover/Klick erscheint ein
 * Popover mit Kurzinfo und optionalem Doku-Link.
 *
 * Props:
 *   text      – Kurzinfo-Text
 *   docsSlug  – optionaler Slug für /docs/:slug
 */

import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpBadge({ text, docsSlug }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(p => !p)}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors focus:outline-none"
        aria-label="Hilfe"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="absolute z-50 left-5 top-0 w-64 bg-popover text-popover-foreground rounded-lg border border-border shadow-lg p-3 text-xs leading-relaxed">
          <p>{text}</p>
          {docsSlug && (
            <Link
              to={`/docs/${docsSlug}`}
              onClick={() => setOpen(false)}
              className="inline-flex items-center gap-1 mt-2 text-primary hover:underline font-medium"
            >
              <BookOpen className="w-3 h-3" />
              Ausführliche Dokumentation
            </Link>
          )}
        </div>
      )}
    </span>
  );
}