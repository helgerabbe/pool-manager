import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { getDeltaStatus } from '@/lib/syncLogic';

export default function SyncStatusBadge({ entity, entityType = 'unit' }) {
  if (!entity) return null;

  const deltaStatus = getDeltaStatus(entity);

  if (deltaStatus === 'synced') {
    return (
      <Badge className="gap-1.5 bg-green-100 text-green-700 border border-green-300 flex items-center w-fit">
        <CheckCircle2 className="w-3 h-3" />
        Synchronisiert
      </Badge>
    );
  }

  if (deltaStatus === 'pending' || deltaStatus === 'modified') {
    return (
      <Badge className="gap-1.5 bg-amber-100 text-amber-700 border border-amber-300 flex items-center w-fit">
        <AlertCircle className="w-3 h-3" />
        Änderungen ausstehend
      </Badge>
    );
  }

  if (deltaStatus === 'new') {
    return (
      <Badge className="gap-1.5 bg-blue-100 text-blue-700 border border-blue-300 flex items-center w-fit">
        <Clock className="w-3 h-3" />
        Neu
      </Badge>
    );
  }

  return null;
}