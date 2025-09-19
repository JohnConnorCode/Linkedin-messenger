'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { renderTemplate, extractVariables } from '@/lib/templating';
import { Badge } from '@/components/ui/badge';

interface TemplatePreviewProps {
  template: string;
}

export function TemplatePreview({ template }: TemplatePreviewProps) {
  const [previewData, setPreviewData] = useState<Record<string, string>>({
    first_name: 'John',
    last_name: 'Doe',
    full_name: 'John Doe',
    company: 'Acme Inc',
    headline: 'Software Engineer',
    location: 'San Francisco, CA',
    sender_first_name: 'Your Name',
  });

  const variables = extractVariables(template);
  const renderedMessage = renderTemplate(template, previewData);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preview Variables</CardTitle>
          <CardDescription>
            Test your template with sample data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {variables.map((variable) => (
              <div key={variable}>
                <Label htmlFor={variable} className="text-xs">
                  {variable}
                </Label>
                <Input
                  id={variable}
                  value={previewData[variable] || ''}
                  onChange={(e) =>
                    setPreviewData({
                      ...previewData,
                      [variable]: e.target.value,
                    })
                  }
                  placeholder={`Enter ${variable}`}
                  className="text-sm"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rendered Preview</CardTitle>
          <CardDescription>
            This is how your message will look
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-muted rounded-lg">
            <pre className="whitespace-pre-wrap text-sm font-sans">
              {renderedMessage || 'Enter a template to see preview'}
            </pre>
          </div>

          <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Character count: {renderedMessage.length}</span>
            {renderedMessage.length > 2500 && (
              <Badge variant="destructive">Too long</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}