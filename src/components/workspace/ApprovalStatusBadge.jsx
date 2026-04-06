import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, PenLine } from 'lucide-react';

/**
 * ApprovalStatusBadge
 * Zeigt den pädagogischen Freigabe-Status (content_status) an.
 * Props:
 *   contentStatus – 'draft' | 'approved'
 */
export default function ApprovalStatusBadge({ contentStatus }) {
  if (contentStatus !== 'approved') return null;

  return (
    <Badge className="bg-green-50 text-green-700 border border-green-300 flex items-center gap-1.5">
      <CheckCircle2 className="w-3 h-3" />
      Freigegeben
    </Badge>
  );
}