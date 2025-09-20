'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CampaignControlCenter from '@/components/campaigns/campaign-control-center';
import CampaignScheduler from '@/components/campaigns/campaign-scheduler';
import MessagePreviewTester from '@/components/campaigns/message-preview-tester';
import ConnectionFilterSearch from '@/components/campaigns/connection-filter-search';
import BulkApprovalQueue from '@/components/campaigns/bulk-approval-queue';
import PerformanceAnalytics from '@/components/analytics/performance-analytics';
import ABTestingUI from '@/components/campaigns/ab-testing-ui';
import TemplateSuggestions from '@/components/campaigns/template-suggestions';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
  Activity, 
  Calendar, 
  Filter, 
  MessageSquare, 
  Settings, 
  TrendingUp, 
  Users,
  Zap,
  TestTube,
  Eye
} from 'lucide-react';

interface EnhancedCampaignViewProps {
  campaignId: string;
  campaign: any;
}

export default function EnhancedCampaignView({ campaignId, campaign }: EnhancedCampaignViewProps) {
  const [activeTab, setActiveTab] = useState('control');
  const [targets, setTargets] = useState([]);
  const [template, setTemplate] = useState(campaign?.message_template || '');
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const [filteredCount, setFilteredCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    loadTargets();
  }, [campaignId]);

  const loadTargets = async () => {
    const { data } = await supabase
      .from('campaign_targets')
      .select('*')
      .eq('campaign_id', campaignId)
      .limit(100);
    
    if (data) setTargets(data);
  };

  const handleScheduleUpdate = (settings: any) => {
    toast.success('Schedule settings updated');
    // Could trigger campaign status update here
  };

  const handleFiltersChange = (filters: any, count: number) => {
    setFilteredCount(count);
  };

  const handleSelectConnections = (ids: string[]) => {
    setSelectedConnections(ids);
  };

  const handleTemplateUpdate = (newTemplate: string) => {
    setTemplate(newTemplate);
  };

  return (
    <div className="space-y-6">
      {/* Campaign Header with Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <p className="text-gray-600 mt-1">{campaign.description}</p>
            <div className="flex items-center gap-4 mt-4">
              <span className="text-sm text-gray-500">
                Created {new Date(campaign.created_at).toLocaleDateString()}
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                {campaign.status}
              </span>
              {campaign.schedule_settings?.enabled && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Scheduled
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Quick Start
            </button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configure
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-8 w-full">
          <TabsTrigger value="control" className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            Control
          </TabsTrigger>
          <TabsTrigger value="schedule" className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            Schedule
          </TabsTrigger>
          <TabsTrigger value="connections" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            Connections
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="approval" className="flex items-center gap-1">
            <MessageSquare className="h-4 w-4" />
            Approval
          </TabsTrigger>
          <TabsTrigger value="testing" className="flex items-center gap-1">
            <TestTube className="h-4 w-4" />
            A/B Test
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Analytics
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-1">
            <Filter className="h-4 w-4" />
            Templates
          </TabsTrigger>
        </TabsList>

        {/* Control Center Tab */}
        <TabsContent value="control">
          <CampaignControlCenter 
            campaignId={campaignId}
            onStatusChange={(status) => console.log('Status:', status)}
          />
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <CampaignScheduler 
            campaignId={campaignId}
            onScheduleUpdate={handleScheduleUpdate}
          />
        </TabsContent>

        {/* Connections Tab */}
        <TabsContent value="connections">
          <ConnectionFilterSearch
            campaignId={campaignId}
            onFiltersChange={handleFiltersChange}
            onSelectConnections={handleSelectConnections}
          />
          {selectedConnections.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {selectedConnections.length} connections selected. 
                You can add them to the campaign or apply bulk actions.
              </p>
              <div className="flex gap-2 mt-2">
                <button className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
                  Add to Queue
                </button>
                <button className="px-3 py-1 bg-white text-blue-600 border border-blue-600 text-sm rounded hover:bg-blue-50">
                  Export Selection
                </button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Preview Tab */}
        <TabsContent value="preview">
          <MessagePreviewTester
            campaignId={campaignId}
            template={template}
            targets={targets}
          />
        </TabsContent>

        {/* Approval Queue Tab */}
        <TabsContent value="approval">
          <BulkApprovalQueue
            campaignId={campaignId}
            onApprovalComplete={() => {
              toast.success('Messages approved and queued for sending');
              loadTargets();
            }}
          />
        </TabsContent>

        {/* A/B Testing Tab */}
        <TabsContent value="testing">
          <ABTestingUI
            campaignId={campaignId}
            onTestCreated={(testId) => {
              toast.success('A/B test created successfully');
            }}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics">
          <PerformanceAnalytics
            campaignId={campaignId}
            dateRange="30d"
          />
        </TabsContent>

        {/* Template Suggestions Tab */}
        <TabsContent value="templates">
          <TemplateSuggestions
            campaignId={campaignId}
            currentTemplate={template}
            onSelectTemplate={handleTemplateUpdate}
          />
        </TabsContent>
      </Tabs>

      {/* Quick Stats Bar */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-6 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-blue-600">{targets.length}</p>
            <p className="text-sm text-gray-600">Total Targets</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {targets.filter((t: any) => t.messaged_at).length}
            </p>
            <p className="text-sm text-gray-600">Sent</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">
              {targets.filter((t: any) => t.status === 'pending').length}
            </p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {Math.round((targets.filter((t: any) => t.messaged_at).length / targets.length) * 100) || 0}%
            </p>
            <p className="text-sm text-gray-600">Progress</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-600">
              {filteredCount}
            </p>
            <p className="text-sm text-gray-600">Filtered</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-pink-600">
              {selectedConnections.length}
            </p>
            <p className="text-sm text-gray-600">Selected</p>
          </div>
        </div>
      </div>
    </div>
  );
}