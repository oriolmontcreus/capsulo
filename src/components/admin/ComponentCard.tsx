import React from 'react';
import type { ComponentData } from '@/lib/form-builder';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ComponentCardProps {
  component: ComponentData;
  onEdit: () => void;
  onDelete: () => void;
}

export const ComponentCard: React.FC<ComponentCardProps> = ({ component, onEdit, onDelete }) => (
  <Card id={`component-${component.id}`} className="p-4">
    <div className="flex justify-between items-start">
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{component.schemaName}</h3>
        <div className="mt-2 space-y-1">
          {Object.entries(component.data).map(([key, value]) => (
            <div key={key} className="text-sm">
              <span className="font-medium text-muted-foreground">{key}:</span>{' '}
              <span className="text-foreground">
                {value.value ? String(value.value).substring(0, 50) : '(empty)'}
                {value.value && String(value.value).length > 50 ? '...' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-2 ml-4">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <Button variant="destructive" size="sm" onClick={onDelete}>
          Delete
        </Button>
      </div>
    </div>
  </Card>
);

