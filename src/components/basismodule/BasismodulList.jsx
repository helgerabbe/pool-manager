import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function BasismodulList({ selectedId, onSelect, onCreateNew }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFach, setSelectedFach] = useState('');

  const { data: basismodule = [], isLoading, error } = useQuery({
    queryKey: ['basismodule'],
    queryFn: async () => {
      const result = await base44.entities.Basismodule.list();
      return result || [];
    },
    staleTime: 0,
    refetchOnMount: true,
  });

  // Gruppiere nach Fach und filtere
  const groupedByFach = useMemo(() => {
    const groups = {};
    basismodule.forEach((mod) => {
      if (!groups[mod.fach]) groups[mod.fach] = [];
      groups[mod.fach].push(mod);
    });
    return groups;
  }, [basismodule]);

  const filteredGroups = useMemo(() => {
    const result = {};
    Object.entries(groupedByFach).forEach(([fach, modules]) => {
      if (selectedFach && fach !== selectedFach) return;
      const filtered = modules.filter((m) =>
        m.titel.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (filtered.length > 0) {
        result[fach] = filtered;
      }
    });
    return result;
  }, [groupedByFach, searchTerm, selectedFach]);

  const allFaecher = Object.keys(groupedByFach).sort();

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border space-y-3">
        <Button onClick={onCreateNew} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Neues Modul
        </Button>

        {/* Suchfeld */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Suchen..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>

        {/* Fach-Filter */}
        {allFaecher.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setSelectedFach('')}
              className={cn(
                'px-2 py-1 rounded text-xs font-medium transition-colors',
                !selectedFach
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              )}
            >
              Alle
            </button>
            {allFaecher.map((fach) => (
              <button
                key={fach}
                onClick={() => setSelectedFach(fach)}
                className={cn(
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  selectedFach === fach
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {fach}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Liste */}
       <div className="flex-1 overflow-y-auto">
         {isLoading ? (
           <div className="p-4 text-center text-sm text-muted-foreground">
             Wird geladen...
           </div>
         ) : error ? (
           <div className="p-4 text-center text-sm text-destructive">
             Fehler beim Laden der Module
           </div>
         ) : Object.keys(filteredGroups).length === 0 && basismodule.length === 0 ? (
           <div className="p-4 text-center text-sm text-muted-foreground">
             Keine Module vorhanden
           </div>
         ) : Object.keys(filteredGroups).length === 0 ? (
           <div className="p-4 text-center text-sm text-muted-foreground">
             Keine Module gefunden
           </div>
         ) : (
          Object.entries(filteredGroups).map(([fach, modules]) => (
            <div key={fach} className="space-y-1 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2">
                {fach}
              </p>
              {modules.map((mod) => (
                <button
                  key={mod.id}
                  onClick={() => onSelect(mod)}
                  className={cn(
                    'w-full text-left p-2.5 rounded border transition-all text-xs',
                    selectedId === mod.id
                      ? 'bg-primary/10 border-primary/40'
                      : 'border-transparent hover:bg-muted/50'
                  )}
                >
                  <p className="font-medium truncate">{mod.titel}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{fach}</p>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}