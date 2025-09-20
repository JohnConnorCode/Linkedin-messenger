import { createServerComponentClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { ABTestingDashboard } from './ab-testing-dashboard';

export default async function CampaignABTestingPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createServerComponentClient();

  // Get campaign details
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select(`
      *,
      message_templates(*)
    `)
    .eq('id', params.id)
    .single();

  if (error || !campaign) {
    notFound();
  }

  // Get variants if this is an A/B test
  const { data: variants } = await supabase
    .from('campaign_variants')
    .select(`
      *,
      message_templates(*)
    `)
    .eq('campaign_id', params.id)
    .order('variant_type');

  // Get test results
  const { data: testResults } = await supabase
    .from('campaign_ab_test_results')
    .select('*')
    .eq('campaign_id', params.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">A/B Testing</h1>
        <p className="text-muted-foreground mt-2">
          Test different message variations to optimize performance
        </p>
      </div>

      <ABTestingDashboard
        campaign={campaign}
        variants={variants || []}
        testResults={testResults || []}
      />
    </div>
  );
}