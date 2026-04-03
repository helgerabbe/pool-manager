import React from 'react';
import { Button } from '@/components/ui/button';

/**
 * EmptyState Component
 * 
 * Zeigt eine dezente Nachricht an, wenn eine Liste leer ist.
 * Enthält: Icon, Titel, Beschreibung und optionalen Action-Button.
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction, variant = 'default' }) {
  const bgColor = variant === 'minimal' ? 'bg-muted/30' : 'bg-muted/50';
  
  return (
    <div className={`flex flex-col items-center justify-center rounded-lg border border-dashed ${bgColor} py-16 px-6 text-center`}>
      {Icon && <Icon className="w-12 h-12 text-muted-foreground/40 mb-4" />}
      <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {onAction && actionLabel && (
        <Button onClick={onAction} variant="outline" size="sm">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}