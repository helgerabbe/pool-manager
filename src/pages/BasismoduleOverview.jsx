import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, BookOpen, Plus, Edit, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import BasismodulDetailView from '@/components/basismodule/BasismodulDetailView';
import { getExportPendingCount } from '@/lib/deltaExportLogic';
import SyncStatusBadge from '@/components/sync/SyncStatusBadge';

const FAECHER = [
  'Deutsch', 'Mathematik', 'Englisch', 'Französisch', 'Latein',
  'Biologie', 'Chemie', 'Physik', 'Geschichte', 'Geographie',
  'Politik', 'Wirtschaft', 'Kunst', 'Musik', 'Sport', 'Religion', 'Ethik', 'Informatik'
];

const FACH_COLORS = {
  'Deutsch': 'bg-blue-100 text-blue-700',
  'Mathematik': 'bg-red-100 text-red-700',
  'Englisch': 'bg-green-100 text-green-700',
  'Französisch': 'bg-purple-100 text-purple-700',
  'Biologie': 'bg-emerald-100 text-emerald-700',
  'Chemie': 'bg-orange-100 text-orange-700',
};

const STATUS_COLORS = {
  'Entwurf': 'bg-amber-100 text-amber-700',
  'Bereit für Moodle': 'bg-green-100 text-green-700',
};

export default function BasismoduleOverview() {
  const queryClient = useQueryClient();
  const [selectedModule, setSelectedModule] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFach, setSelectedFach] = useState('');
  const [showOnlyChanged, setShowOnlyChanged] = useState(false);

  // Fetch Basismodule
  const { data: basismodule = [], isLoading } = useQuery({
    queryKey: ['basismodule'],
    queryFn: () => base44.entities.Basismodule.list('-created_date'),
  });

  // Delete mutation
  const deleteModule = useMutation({
    mutationFn: (id) => base44.entities.Basismodule.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['basismodule'] });
      toast.success('Basismodul gelöscht');
    },
    onError: () => toast.error('Fehler beim Löschen'),
  });

  // Filter & Group
  const pendingCount = useMemo(() => getExportPendingCount(basismodule), [basismodule]);

  const filtered = useMemo(() => {
    return basismodule.filter(m => {
      const matchesFach = !selectedFach || m.fach === selectedFach;
      const matchesSearch = !searchTerm || 
        m.titel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.beschreibung_thema?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchChanged = !showOnlyChanged || !m.last_synced_at;
      return matchesFach && matchesSearch && matchChanged;
    });
  }, [basismodule, selectedFach, searchTerm, showOnlyChanged]);

  const grouped = useMemo(() => {
    const groups = {};
    filtered.forEach(m => {
      if (!groups[m.fach]) groups[m.fach] = [];
      groups[m.fach].push(m);
    });
    return groups;
  }, [filtered]);

  const handleNewModule = () => {
    setSelectedModule(null);
    setDetailOpen(true);
  };

  const handleEdit = (module) => {
    setSelectedModule(module);
    setDetailOpen(true);
  };

  const handleDetailClose = () => {
    setDetailOpen(false);
    setSelectedModule(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Basismodule</h1>
                <p className="text-sm text-muted-foreground">Fachspezifische Grundkompetenzen</p>
              </div>
            </div>
            <Button onClick={handleNewModule} className="gap-2">
              <Plus className="w-4 h-4" />
              Neues Modul
            </Button>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-64 relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nach Titel oder Beschreibung suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedFach} onValueChange={setSelectedFach}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Alle Fächer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Alle Fächer</SelectItem>
                  {FAECHER.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {pendingCount > 0 && (
              <button
                onClick={() => setShowOnlyChanged(!showOnlyChanged)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  showOnlyChanged
                    ? 'bg-amber-100 text-amber-700 border border-amber-300'
                    : 'bg-amber-50 text-amber-700 border border-amber-200 hover:border-amber-300'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                {pendingCount} ausstehend
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">Keine Basismodule gefunden</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([fach, modules]) => (
              <div key={fach} className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {fach}
                  <Badge variant="secondary">{modules.length}</Badge>
                </h2>
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {modules.map(module => (
                    <div
                      key={module.id}
                      className="p-4 rounded-lg border bg-card hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                         <div className="flex-1">
                           <div className="flex items-center gap-2 flex-wrap">
                             <h3 className="font-semibold text-sm">{module.titel}</h3>
                             <SyncStatusBadge entity={module} entityType="basismodul" />
                           </div>
                           <p className="text-xs text-muted-foreground mt-0.5">
                             {module.jahrgang_empfehlung && `Jg. ${module.jahrgang_empfehlung}`}
                           </p>
                         </div>
                         <Badge className={`text-[10px] shrink-0 ml-2 ${STATUS_COLORS[module.status] || ''}`}>
                           {module.status}
                         </Badge>
                       </div>

                      {module.beschreibung_thema && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {module.beschreibung_thema}
                        </p>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(module)}
                          className="flex-1 gap-1.5"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          Bearbeiten
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteModule.mutate(module.id)}
                          className="gap-1.5 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail View */}
      <BasismodulDetailView
        open={detailOpen}
        onOpenChange={handleDetailClose}
        initialData={selectedModule}
        onSuccess={() => {
          handleDetailClose();
          queryClient.invalidateQueries({ queryKey: ['basismodule'] });
        }}
      />
    </div>
  );
}