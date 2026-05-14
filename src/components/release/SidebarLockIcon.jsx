/**
 * components/release/SidebarLockIcon.jsx
 *
 * Phase 5 des Freigabe-Konzepts (2026-05-14):
 * Mini-🔒-Icon neben Sidebar-Einträgen für freigegebene Items.
 * Ergänzt das bestehende Vollständigkeits-Farbschema (kein neues Schema,
 * sondern reines Add-on).
 */

import React from 'react';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SidebarLockIcon({ released, className = '', size = 12 }) {
  if (!released) return null;
  return (
    <span
      title="Freigegeben — gesperrt"
      className={cn('inline-flex items-center justify-center text-green-700', className)}
    >
      <Lock width={size} height={size} />
    </span>
  );
}