'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Mic2,
  MessageSquare,
  Clock,
  Settings,
  Users,
  AlertTriangle,
  Sparkles,
  FolderOpen
} from 'lucide-react';

import { ResponseInbox } from '@/components/superdebate/response-inbox';
import { FollowUpQueue } from '@/components/superdebate/follow-up-queue';
import { SuperDebateTargets } from '@/components/superdebate/superdebate-targets';
import { SuperDebateSettings } from '@/components/superdebate/superdebate-settings';

interface Campaign {
  id: string;
  name: string;
  status: string | null;
}

export default function SuperDebatePage() {
  const [activeTab, setActiveTab] = useState('targets');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCampaigns() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCampaigns(data);
        // Auto-select first campaign if available
        if (data.length > 0) {
          setSelectedCampaignId(data[0].id);
          setSelectedCampaign(data[0]);
        }
      }
      setLoading(false);
    }
    fetchCampaigns();
  }, []);

  const handleCampaignChange = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    const campaign = campaigns.find(c => c.id === campaignId);
    setSelectedCampaign(campaign || null);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <Skeleton className="h-12 w-64 mb-6" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-orange-100 p-2 rounded-lg">
            <Mic2 className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">SuperDebate Outreach</h1>
            <p className="text-gray-600">AI-powered outreach for debate community building</p>
          </div>
          <Badge variant="outline" className="ml-auto bg-orange-50 text-orange-700 border-orange-200">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Enhanced
          </Badge>
        </div>

        {/* Campaign Selector */}
        <div className="flex items-center gap-3">
          <FolderOpen className="h-5 w-5 text-gray-500" />
          <Select value={selectedCampaignId || ''} onValueChange={handleCampaignChange}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select a campaign" />
            </SelectTrigger>
            <SelectContent>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name} ({campaign.status})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* No campaigns message */}
      {campaigns.length === 0 && (
        <Alert className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No campaigns found. Create a campaign first to use SuperDebate outreach.
          </AlertDescription>
        </Alert>
      )}

      {/* No campaign selected */}
      {campaigns.length > 0 && !selectedCampaignId && (
        <Alert className="mb-6 border-blue-200 bg-blue-50">
          <AlertTriangle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Select a campaign above to view and manage SuperDebate outreach.
          </AlertDescription>
        </Alert>
      )}

      {/* Main content - only show when campaign selected */}
      {selectedCampaignId && selectedCampaign && (
        <>
          {/* Status Alert */}
          <Alert className="mb-6 border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>How it works:</strong> Add targets to classify them into audience types (Funder, Ambassador, Debater, Friend),
              generate personalized messages, then track responses and follow-ups automatically.
            </AlertDescription>
          </Alert>

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 w-full max-w-2xl">
              <TabsTrigger value="targets" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Targets</span>
              </TabsTrigger>
              <TabsTrigger value="responses" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Responses</span>
              </TabsTrigger>
              <TabsTrigger value="followups" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Follow-ups</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </TabsTrigger>
            </TabsList>

            {/* Targets Tab */}
            <TabsContent value="targets">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Campaign Targets
                  </CardTitle>
                  <CardDescription>
                    View and manage targets for {selectedCampaign.name}.
                    Classify contacts, generate messages, and track conversation stages.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SuperDebateTargets campaignId={selectedCampaignId} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Responses Tab */}
            <TabsContent value="responses">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-600" />
                    Response Inbox
                  </CardTitle>
                  <CardDescription>
                    View incoming responses, see AI classifications, and take action.
                    High-value responses are flagged for your attention.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponseInbox campaignId={selectedCampaignId} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Follow-ups Tab */}
            <TabsContent value="followups">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-600" />
                    Follow-up Queue
                  </CardTitle>
                  <CardDescription>
                    Manage scheduled follow-ups. Review, approve, or modify messages
                    before they're sent automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FollowUpQueue campaignId={selectedCampaignId} />
                </CardContent>
              </Card>
            </TabsContent>

            {/* Settings Tab */}
            <TabsContent value="settings">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-gray-600" />
                    SuperDebate Settings
                  </CardTitle>
                  <CardDescription>
                    Configure AI classification, message templates, follow-up sequences,
                    and notification preferences.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SuperDebateSettings campaignId={selectedCampaignId} campaign={selectedCampaign} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
