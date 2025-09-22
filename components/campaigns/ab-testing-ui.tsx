'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ABTestingUIProps {
  campaignId: string;
}

export default function ABTestingUI({ campaignId }: ABTestingUIProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>A/B Testing</CardTitle>
        <CardDescription>
          A/B testing interface for campaign {campaignId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          A/B testing component is being developed.
        </div>
      </CardContent>
    </Card>
  );
}