'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SettingsView({ campaign }: { campaign: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Campaign Settings</CardTitle>
        <CardDescription>Configure campaign parameters</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Campaign configuration options</p>
      </CardContent>
    </Card>
  );
}