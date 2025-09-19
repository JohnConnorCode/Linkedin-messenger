'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function TargetsView({ campaignId }: { campaignId: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Targets</CardTitle>
        <CardDescription>All connections targeted in this campaign</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">View and manage campaign targets</p>
      </CardContent>
    </Card>
  );
}