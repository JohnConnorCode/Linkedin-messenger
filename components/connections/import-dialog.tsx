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
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText } from 'lucide-react';
import Papa from 'papaparse';

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const [importing, setImporting] = useState(false);
  const [csvText, setCsvText] = useState('');
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

      for (let i = 0; i < validConnections.length; i += batchSize) {
        const batch = validConnections.slice(i, i + batchSize);
        const { error } = await supabase.from('connections').insert(batch as any);

        if (error) {
          throw error;
        }

        imported += batch.length;
      }

      toast({
        title: 'Success',
        description: `Imported ${imported} connections successfully`,
      });

      // Reset form and close dialog
      setCsvText('');
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing || !csvText.trim()}>
            {importing ? (
              <>Importing...</>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Import Connections
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}