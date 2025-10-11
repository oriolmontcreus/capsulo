import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { publishChanges, getCurrentDraftBranch } from '@/lib/cms-storage';

interface PublishButtonProps {
  onPublished: () => void;
}

export const PublishButton: React.FC<PublishButtonProps> = ({ onPublished }) => {
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftBranch, setDraftBranch] = useState<string | null>(null);

  useEffect(() => {
    const fetchBranch = async () => {
      try {
        const branch = await getCurrentDraftBranch();
        setDraftBranch(branch);
      } catch (err) {
        console.error('Failed to get draft branch:', err);
      }
    };
    
    fetchBranch();
  }, []);

  const handlePublish = async () => {
    if (!confirm('Publish all changes to the main branch? Your GitHub Actions will handle the rebuild.')) return;

    setPublishing(true);
    setError(null);

    try {
      await publishChanges();
      alert('Changes published successfully! Your site will rebuild via GitHub Actions.');
      onPublished();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <Button 
          onClick={handlePublish} 
          disabled={publishing}
          variant="default"
          className="bg-green-600 hover:bg-green-700"
        >
          {publishing ? 'Publishing...' : '🚀 Publish Changes'}
        </Button>
        {draftBranch && (
          <p className="text-xs text-muted-foreground mt-1">
            Draft branch: <code className="bg-muted px-1 py-0.5 rounded">{draftBranch}</code>
          </p>
        )}
      </div>
      {error && (
        <Alert variant="destructive">
          <p className="text-sm">{error}</p>
        </Alert>
      )}
    </div>
  );
};
