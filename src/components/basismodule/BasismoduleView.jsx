import React, { useState } from 'react';
import BasismodulList from './BasismodulList';
import BasismodulDetail from './BasismodulDetail';
import BasismodulCreateDialog from './BasismodulCreateDialog';

export default function BasismoduleView() {
  const [selectedBasismodul, setSelectedBasismodul] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-0 bg-background overflow-hidden min-h-0">
      {/* Master-Spalte */}
      <div className="w-full lg:w-80 shrink-0 overflow-hidden border-b lg:border-b-0 lg:border-r border-border max-h-64 lg:max-h-full min-h-0">
        <BasismodulList
          selectedId={selectedBasismodul?.id}
          onSelect={setSelectedBasismodul}
          onCreateNew={() => setShowCreateDialog(true)}
        />
      </div>

      {/* Detail-Spalte */}
      <div className="flex-1 overflow-hidden min-h-0">
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