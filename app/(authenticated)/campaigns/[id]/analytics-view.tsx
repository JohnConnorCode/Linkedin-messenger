'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function AnalyticsView({ campaignId }: { campaignId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Analytics</CardTitle>
        <CardDescription>Performance metrics and insights</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Analytics dashboard coming soon</p>
      </CardContent>
    </Card>
  );
}