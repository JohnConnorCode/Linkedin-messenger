'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Brain, Sparkles } from 'lucide-react';
import Papa from 'papaparse';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  aiEnabled?: boolean;
}

export function ImportDialog({ open, onOpenChange, campaignId, aiEnabled }: ImportDialogProps) {
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setCsvText(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (!csvText.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide CSV data to import',
        variant: 'destructive',
      });
      return;
    }

    setImporting(true);

    try {
      // Parse CSV
      const { data: csvData, errors } = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (errors.length > 0) {
        throw new Error('CSV parsing errors: ' + errors.map(e => e.message).join(', '));
      }

      // Transform and validate data
      const connections = csvData.map((row: any) => {
        // Try to extract first and last names
        let firstName = row['First Name'] || row.first_name || '';
        let lastName = row['Last Name'] || row.last_name || '';
        let fullName = row['Full Name'] || row.full_name || row.Name || row.name || '';

        // If we only have full name, try to split it
        if (!firstName && !lastName && fullName) {
          const nameParts = fullName.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }

        // If we have first and last but no full, combine them
        if (!fullName && (firstName || lastName)) {
          fullName = `${firstName} ${lastName}`.trim();
        }

        return {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          linkedin_url: row['Profile URL'] || row.linkedin_url || row.url || '',
          headline: row.Headline || row.headline || row.Title || row.title || '',
          company: row.Company || row.company || row.Organization || '',
          location: row.Location || row.location || '',
          tags: row.Tags ? row.Tags.split(',').map((t: string) => t.trim()) : [],
        };
      });

      // Filter out empty records
      const validConnections = connections.filter(
        (c: any) => c.full_name || c.linkedin_url
      );

      if (validConnections.length === 0) {
        throw new Error('No valid connections found in CSV');
      }

      // Insert in batches
      const batchSize = 50;
      let imported = 0;
      const connectionIds: string[] = [];

      for (let i = 0; i < validConnections.length; i += batchSize) {
        const batch = validConnections.slice(i, i + batchSize);
        const { data: insertedData, error } = await supabase
          .from('connections')
          .insert(batch as any)
          .select('id');

        if (error) {
          throw error;
        }

        if (insertedData) {
          connectionIds.push(...insertedData.map(c => c.id));
        }

        imported += batch.length;
      }

      // If campaign context and AI enabled, trigger AI processing
      if (campaignId && aiEnabled && connectionIds.length > 0) {
        setAiProcessing(true);

        // Create campaign targets with AI processing queue
        const targets = connectionIds.map(connId => ({
          campaign_id: campaignId,
          connection_id: connId,
          approval_status: 'pending',
        }));

        const { error: targetError } = await supabase
          .from('campaign_targets')
          .insert(targets as any);

        if (targetError) throw targetError;

        // Queue AI personalization for each connection
        const aiQueue = connectionIds.map(connId => ({
          connection_id: connId,
          campaign_id: campaignId,
          status: 'pending',
          attempts: 0,
        }));

        const { error: aiError } = await supabase
          .from('ai_personalization_queue')
          .insert(aiQueue as any);

        if (aiError) throw aiError;

        // Simulate AI processing progress
        for (let i = 0; i <= 100; i += 10) {
          setAiProgress(i);
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        toast({
          title: 'Success',
          description: (
            <div className="space-y-1">
              <p>{imported} connections imported</p>
              <p className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                AI personalization queued
              </p>
            </div>
          ) as any,
        });
      } else {
        toast({
          title: 'Success',
          description: `Imported ${imported} connections successfully`,
        });
      }

      // Reset form and close dialog
      setCsvText('');
      setAiProcessing(false);
      setAiProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      onOpenChange(false);

      // Refresh the page to show new connections
      window.location.reload();
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import connections',
        variant: 'destructive',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import Connections</DialogTitle>
          <DialogDescription>
            Upload a CSV file from LinkedIn or paste CSV data directly
            {campaignId && aiEnabled && (
              <span className="flex items-center gap-1 mt-2 text-blue-600">
                <Brain className="h-3 w-3" />
                AI personalization will be enabled for imported connections
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <div className="mt-2 flex items-center gap-4">
              <Input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={importing}
              />
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Export your connections from LinkedIn and upload the CSV file here
            </p>
          </div>

          <div>
            <Label htmlFor="csv-text">Or Paste CSV Data</Label>
            <Textarea
              id="csv-text"
              placeholder="First Name,Last Name,Company,Headline,Profile URL
John,Doe,Acme Inc,Software Engineer,https://linkedin.com/in/johndoe
Jane,Smith,Tech Corp,Product Manager,https://linkedin.com/in/janesmith"
              className="mt-2 font-mono text-xs h-48"
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              disabled={importing}
            />
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-2">Expected CSV columns:</p>
            <ul className="text-xs space-y-1 text-muted-foreground">
              <li>• First Name, Last Name (or Full Name)</li>
              <li>• Company</li>
              <li>• Headline (or Title)</li>
              <li>• Profile URL</li>
              <li>• Location</li>
              <li>• Tags (comma-separated)</li>
            </ul>
          </div>

          {aiProcessing && (
            <Alert className="border-blue-200 bg-blue-50">
              <Sparkles className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="font-medium">Processing with GPT-5 Nano...</p>
                  <Progress value={aiProgress} className="h-2" />
                  <p className="text-xs">Analyzing profiles and generating personalizations</p>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing || !csvText.trim() || aiProcessing}>
            {importing || aiProcessing ? (
              <>{aiProcessing ? 'Processing with AI...' : 'Importing...'}</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import {campaignId && aiEnabled ? 'and Process with AI' : 'Connections'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}