'use client';

import { AnalyticsDashboard } from '@/components/campaigns/analytics-dashboard';

export function AnalyticsView({ campaignId }: { campaignId: string }) {
  return <AnalyticsDashboard campaignId={campaignId} />;
}