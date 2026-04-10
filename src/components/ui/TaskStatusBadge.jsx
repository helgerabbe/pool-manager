import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertCircle, Upload, Pencil, RefreshCw } from 'lucide-react';

/**
 * TaskStatusBadge
 * Props: content_status ('draft' | 'approved'), sync_status ('new' | 'pending' | 'synced' | 'modified' | 'to_delete' | 'error')
 */
export default function TaskStatusBadge({ content_status, sync_status }) {
  if (sync_status === 'pending') {
    return (
      <Badge className="bg-orange-100 text-orange-800 border border-orange-300 text-xs gap-1 flex items-center w-fit">
        <Clock className="w-3 h-3" />
        Wird exportiert 🔒
      </Badge>
    );
  }

  if (sync_status === 'error') {
    return (
      <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs gap-1 flex items-center w-fit">
        <AlertCircle className="w-3 h-3" />
        Export-Fehler
      </Badge>
    );
  }

  if (sync_status === 'synced' && content_status === 'approved') {
    return (
      <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs gap-1 flex items-center w-fit">
        <CheckCircle2 className="w-3 h-3" />
        In Moodle
      </Badge>
    );
  }

  if (sync_status === 'synced' && content_status !== 'approved') {
    return (
      <Badge className="bg-purple-100 text-purple-800 border border-purple-300 text-xs gap-1 flex items-center w-fit">
        <RefreshCw className="w-3 h-3" />
        Geändert (Nicht live)
      </Badge>
    );
  }

  if ((sync_status === 'new' || sync_status === 'modified') && content_status === 'approved') {
    return (
      <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-xs gap-1 flex items-center w-fit">
        <Upload className="w-3 h-3" />
        Freigegeben
      </Badge>
    );
  }

  // Fallback: Entwurf
  return (
    <Badge variant="outline" className="text-muted-foreground text-xs gap-1 flex items-center w-fit">
      <Pencil className="w-3 h-3" />
      Entwurf
    </Badge>
  );
}