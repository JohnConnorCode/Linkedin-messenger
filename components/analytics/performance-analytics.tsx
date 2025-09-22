'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PerformanceAnalyticsProps {
  campaignId: string;
}

export default function PerformanceAnalytics({ campaignId }: PerformanceAnalyticsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Analytics</CardTitle>
        <CardDescription>
          Detailed performance metrics for campaign {campaignId}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          Performance analytics component is being developed.
        </div>
      </CardContent>
    </Card>
  );
}