import React, { useState } from 'react';
import BasismodulList from './BasismodulList';
import BasismodulDetail from './BasismodulDetail';
import BasismodulCreateDialog from './BasismodulCreateDialog';

export default function BasismoduleView() {
  const [selectedBasismodul, setSelectedBasismodul] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="h-full flex gap-0 bg-background overflow-hidden">
      {/* Master-Spalte */}
      <div className="w-80 shrink-0 overflow-hidden border-r border-border">
        <BasismodulList
          selectedId={selectedBasismodul?.id}
          onSelect={setSelectedBasismodul}
          onCreateNew={() => setShowCreateDialog(true)}
        />
      </div>

      {/* Detail-Spalte */}
      <div className="flex-1 overflow-hidden">
        <BasismodulDetail
          basismodul={selectedBasismodul}
          onDelete={() => setSelectedBasismodul(null)}
        />
      </div>

      {/* Create Dialog */}
      <BasismodulCreateDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}