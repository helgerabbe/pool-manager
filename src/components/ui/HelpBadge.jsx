/**
 * HelpBadge.jsx
 *
 * Kompakte Inline-Hilfe: kleines ?-Icon, bei Hover/Klick erscheint ein
 * Popover mit Kurzinfo und optionalem Doku-Link.
 *
 * Das Popover wird via Portal in document.body gerendert, damit es nicht
 * durch overflow:hidden von Parent-Containern abgeschnitten wird.
 *
 * Props:
 *   text      – Kurzinfo-Text
 *   docsSlug  – optionaler Slug für /docs/:slug
 */

import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { HelpCircle, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HelpBadge({ text, docsSlug }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);

  // Schließen bei Klick außerhalb
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const popoverWidth = 256; // w-64 = 16rem = 256px
      const spaceRight = window.innerWidth - rect.left;
      const left = spaceRight >= popoverWidth + 8
        ? rect.left + window.scrollX
        : rect.right + window.scrollX - popoverWidth;
      setPos({
        top: rect.bottom + window.scrollY + 6,
        left: Math.max(8, left), // mindestens 8px vom linken Rand
      });
    }
    setOpen(p => !p);
  };

  const popover = open && ReactDOM.createPortal(
    <div
      style={{ position: 'absolute', top: pos.top, left: pos.left, zIndex: 9999, maxWidth: 'calc(100vw - 16px)' }}
      className="w-64 bg-popover text-popover-foreground rounded-lg border border-border shadow-lg p-3 text-xs leading-relaxed"
    >
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
    </div>,
    document.body
  );

  // WICHTIG: HelpBadge wird teils innerhalb von <button>-Komponenten gerendert
  // (z. B. TabsTrigger). Deshalb darf der Trigger hier KEIN <button> sein —
  // sonst meckert React mit „<button> cannot appear as a descendant of <button>".
  // Ein <span> mit role="button" + Tastatur-Handler verhält sich identisch.
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      e.stopPropagation();
      handleClick();
    }
  };
  const handleSpanClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleClick();
  };

  return (
    <span className="inline-flex items-center">
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        onClick={handleSpanClick}
        onKeyDown={handleKeyDown}
        className="inline-flex items-center justify-center w-4 h-4 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors focus:outline-none cursor-pointer"
        aria-label="Hilfe"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </span>
      {popover}
    </span>
  );
}