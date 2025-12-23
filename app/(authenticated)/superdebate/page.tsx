'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Mic2,
  MessageSquare,
  Clock,
  Settings,
  Users,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

import { ResponseInbox } from '@/components/superdebate/response-inbox';
import { FollowUpQueue } from '@/components/superdebate/follow-up-queue';
import { SuperDebateTargets } from '@/components/superdebate/superdebate-targets';
import { SuperDebateSettings } from '@/components/superdebate/superdebate-settings';

export default function SuperDebatePage() {
  const [activeTab, setActiveTab] = useState('targets');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
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
      </div>

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
                View and manage targets across your SuperDebate campaigns.
                Classify contacts, generate messages, and track conversation stages.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SuperDebateTargets />
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
              <ResponseInbox />
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
              <FollowUpQueue />
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
              <SuperDebateSettings />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
