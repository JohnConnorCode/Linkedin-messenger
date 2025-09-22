'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface TemplateSuggestionsProps {
  campaignId: string;
}

export default function TemplateSuggestions({ campaignId }: TemplateSuggestionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Template Suggestions</CardTitle>
        <CardDescription>
          AI-powered template suggestions for campaign {campaignId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Template suggestions component is being developed.
        </div>
      </CardContent>
    </Card>
  );
}