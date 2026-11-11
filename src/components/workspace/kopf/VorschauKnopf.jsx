import React from 'react';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** „Vorschau" (Schüleransicht) – steht immer rechts in der Aktions-Zeile unter dem Kopf. */
const VorschauKnopf = React.forwardRef(function VorschauKnopf(props, ref) {
  return (
    <Button ref={ref} variant="outline" size="sm" title="In der Schüler-Ansicht anzeigen" {...props}
      className="gap-2 border-violet-300 bg-violet-50 text-violet-800 hover:bg-violet-100 hover:text-violet-900">
      <Eye /> Vorschau
    </Button>
  );
});

export default VorschauKnopf;