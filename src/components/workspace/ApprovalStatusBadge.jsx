import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApprovalStatusBadge({ syncStatus }) {
  const isApproved = syncStatus === 'approved';
  const isModified = syncStatus === 'modified';
  
  return (
    <div className="flex items-center gap-2">
      {isApproved ? (
        <Badge className="bg-green-50 text-green-700 border-green-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3" />
          Freigegeben
        </Badge>
      ) : isModified ? (
        <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 flex items-center gap-1.5">
          <Circle className="w-3 h-3" />
          Änderungen
        </Badge>
      ) : (
        <Badge variant="secondary" className="flex items-center gap-1.5">
          <Circle className="w-3 h-3" />
          Entwurf
        </Badge>
      )}
    </div>
  );
}