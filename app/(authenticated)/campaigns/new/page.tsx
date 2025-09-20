'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CampaignWizard } from '@/components/campaigns/campaign-wizard';

const STEPS = [
  { id: 'template', title: 'Choose Template', description: 'Select a message template' },
  { id: 'audience', title: 'Select Audience', description: 'Filter your connections' },
  { id: 'ai', title: 'AI Personalization', description: 'Configure GPT-5 Nano settings' },
  { id: 'settings', title: 'Campaign Settings', description: 'Configure pacing and limits' },
  { id: 'review', title: 'Review & Launch', description: 'Preview and confirm' },
];

export default function NewCampaignPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [campaignData, setCampaignData] = useState({
    name: '',
    template_id: '',
    target_filter: {},
    require_manual_approval: true,
    daily_cap: 25,
    hourly_cap: 5,
    jitter_ms: 5000,
    dwell_ms: 3000,
    // AI Settings
    ai_enabled: true,
    ai_tone: 'professional',
    ai_temperature: 0.3,
    ai_auto_approve: false,
    ai_min_confidence: 0.7,
  });
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    try {
      // Create campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .insert(campaignData as any)
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Generate campaign targets based on filters
      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('id');

      if (connectionsError) throw connectionsError;

      // Create campaign targets
      const targets = connections?.map(conn => ({
        campaign_id: campaign.id,
        connection_id: conn.id,
        approval_status: campaignData.require_manual_approval ? 'pending' : 'approved',
      })) || [];

      if (targets.length > 0) {
        const { error: targetsError } = await supabase
          .from('campaign_targets')
          .insert(targets as any);

        if (targetsError) throw targetsError;
      }

      toast({
        title: 'Campaign created!',
        description: `${targets.length} targets added to the campaign`,
      });

      router.push(`/campaigns/${campaign.id}`);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create campaign',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Create Campaign</h1>
          <p className="text-muted-foreground mt-2">
            Set up a new LinkedIn messaging campaign
          </p>
        </div>
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-muted-foreground">
          {STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center gap-2 ${
                index <= currentStep ? 'text-foreground' : ''
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 ${
                  index < currentStep
                    ? 'bg-primary border-primary text-primary-foreground'
                    : index === currentStep
                    ? 'border-primary'
                    : 'border-muted'
                }`}
              >
                {index < currentStep ? (
                  <Check className="h-3 w-3" />
                ) : (
                  index + 1
                )}
              </div>
              <span className="hidden sm:inline">{step.title}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <CampaignWizard
            step={STEPS[currentStep].id}
            data={campaignData}
            onUpdate={setCampaignData}
          />
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentStep === STEPS.length - 1 ? (
          <Button onClick={handleComplete}>
            Launch Campaign
            <Check className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleNext}>
            Next
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}