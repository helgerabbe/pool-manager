import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { isAlreadySynced } from '@/lib/deltaExportLogic';

export default function SyncAlertBanner({ entity, entityType = 'Element' }) {
  if (!isAlreadySynced(entity)) return null;

  return (
    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50 text-sm text-blue-700 flex items-start gap-2">
      <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="font-medium">Bereits in Moodle live</p>
        <p className="text-xs text-blue-600 mt-0.5">
          Dieses {entityType.toLowerCase()} ist bereits in Moodle verfügbar. 
          Deine Änderungen werden automatisch für den nächsten Delta-Export vorgemerkt.
        </p>
      </div>
    </div>
  );
}