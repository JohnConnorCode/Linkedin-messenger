'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Users,
  MessageSquare,
  BarChart3,
  Shield,
  Zap,
  Clock,
  Target,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Mail,
  Settings,
  Eye,
  GitBranch,
  Database,
  Lock,
  TrendingUp,
  Sparkles,
  ListChecks,
  Bell,
  FileText,
  Globe,
  Thermometer,
  UserCheck,
  HeartHandshake,
  Mic2,
  Award,
  Filter,
  Hash,
  Timer,
  Workflow,
  LayoutDashboard,
  LineChart,
  PieChart,
  Activity,
  Server,
  Terminal,
  Chrome,
  Upload,
  Download,
  Tag,
  Search
} from 'lucide-react';

export default function FeaturesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Complete Feature Documentation</h1>
        <p className="text-xl text-gray-600">
          Everything you need to know about LinkedIn Messenger's capabilities
        </p>
      </div>

      {/* Feature Tabs */}
      <Tabs defaultValue="campaigns" className="space-y-8">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 h-auto p-2 bg-gray-100">
          <TabsTrigger value="campaigns" className="text-xs">Campaigns</TabsTrigger>
          <TabsTrigger value="superdebate" className="text-xs">SuperDebate</TabsTrigger>
          <TabsTrigger value="ai" className="text-xs">AI & Personalization</TabsTrigger>
          <TabsTrigger value="followups" className="text-xs">Follow-ups</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
          <TabsTrigger value="safety" className="text-xs">Safety & Security</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-6">
          <div className="grid gap-6">
            {/* Campaign Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <LayoutDashboard className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Campaign Management</CardTitle>
                    <CardDescription>Create, configure, and manage outreach campaigns</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-blue-500" />
                      Campaign Lifecycle
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs">Draft</Badge>
                        <span>Initial setup and configuration</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs bg-yellow-50">Pending</Badge>
                        <span>Awaiting approval or scheduling</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs bg-blue-50">Active</Badge>
                        <span>Currently sending messages</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs bg-orange-50">Paused</Badge>
                        <span>Temporarily halted</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Badge variant="outline" className="text-xs bg-green-50">Completed</Badge>
                        <span>All messages sent successfully</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <Settings className="h-4 w-4 text-gray-500" />
                      Configuration Options
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Campaign Type:</strong> Standard, SuperDebate, A/B Test</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Message Templates:</strong> Customizable with variables</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Scheduling:</strong> Set start/end dates and times</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Rate Limits:</strong> Per-hour and per-day caps</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Targets */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Target className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Campaign Targets</CardTitle>
                    <CardDescription>Manage recipients and track conversation stages</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Conversation Stages</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                        <span><strong>not_started:</strong> Target added, not yet contacted</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span><strong>initial_outreach:</strong> First message sent</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <span><strong>awaiting_response:</strong> Waiting for reply</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                        <span><strong>in_dialogue:</strong> Active conversation</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span><strong>closed_won:</strong> Successful outcome</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <span><strong>closed_lost:</strong> Declined or unresponsive</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Temperature Tracking</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-blue-400" />
                        <span><strong>Cold:</strong> No engagement yet</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-yellow-500" />
                        <span><strong>Warm:</strong> Some interest shown</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4 text-red-500" />
                        <span><strong>Hot:</strong> High engagement, ready to convert</span>
                      </li>
                    </ul>
                    <h4 className="font-semibold mb-3 mt-6">Outcome Tracking</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>closed_won_value:</strong> Track monetary/value outcomes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Tag className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span><strong>closed_won_type:</strong> funded, ambassador, meeting, etc.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <GitBranch className="h-4 w-4 text-purple-500 mt-0.5" />
                        <span><strong>conversion_source:</strong> Which message converted</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Connection Management</CardTitle>
                    <CardDescription>Import, organize, and manage your LinkedIn connections</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Upload className="h-4 w-4 text-blue-500" />
                      Import
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>CSV file upload</li>
                      <li>LinkedIn data export support</li>
                      <li>Automatic field mapping</li>
                      <li>Duplicate detection</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Tag className="h-4 w-4 text-green-500" />
                      Organization
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Custom tags & labels</li>
                      <li>Industry categorization</li>
                      <li>Location grouping</li>
                      <li>Company filtering</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Search className="h-4 w-4 text-purple-500" />
                      Search & Filter
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Full-text search</li>
                      <li>Advanced filters</li>
                      <li>Saved filter presets</li>
                      <li>Bulk selection</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SuperDebate Tab */}
        <TabsContent value="superdebate" className="space-y-6">
          <div className="grid gap-6">
            {/* SuperDebate Overview */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <Mic2 className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>SuperDebate Outreach Module</CardTitle>
                    <CardDescription>Specialized outreach for debate community building</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  A purpose-built outreach system for promoting SuperDebate - featuring intelligent audience
                  classification, personalized messaging, and response-aware follow-up sequences.
                </p>
              </CardContent>
            </Card>

            {/* Audience Classification */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <UserCheck className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Audience Classification</CardTitle>
                    <CardDescription>AI-powered categorization into four audience types</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Award className="h-4 w-4 text-green-600" />
                      Funder
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Potential investors, donors, or financial supporters
                    </p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>VCs, Angels, Foundation heads</li>
                      <li>Impact investors, Philanthropists</li>
                      <li>CTA: Schedule a 15-minute call</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4 bg-purple-50 border-purple-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Globe className="h-4 w-4 text-purple-600" />
                      Ambassador
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Community leaders who could host events or spread the word
                    </p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>Event organizers, Community builders</li>
                      <li>Teachers, Professors, Club leaders</li>
                      <li>CTA: Share what we're building</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Mic2 className="h-4 w-4 text-blue-600" />
                      Debater
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Former or current competitive debaters
                    </p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>Debate alumni, Tournament competitors</li>
                      <li>Model UN participants, Speech champions</li>
                      <li>CTA: Join the community</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4 bg-yellow-50 border-yellow-200">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <HeartHandshake className="h-4 w-4 text-yellow-600" />
                      Friend
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Personal connections who might support or know someone
                    </p>
                    <ul className="text-xs text-gray-500 space-y-1">
                      <li>Personal network, Warm connections</li>
                      <li>May know funders or ambassadors</li>
                      <li>CTA: Open to exploring together</li>
                    </ul>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-3">Fit Assessment Scoring</h4>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-blue-600">Resonance (0-1)</p>
                      <p className="text-gray-600">How well they match audience persona</p>
                    </div>
                    <div>
                      <p className="font-medium text-green-600">Relevance (0-1)</p>
                      <p className="text-gray-600">Professional alignment with debate/civic tech</p>
                    </div>
                    <div>
                      <p className="font-medium text-purple-600">Reach (0-1)</p>
                      <p className="text-gray-600">Network influence and potential impact</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    <strong>Qualification Gate:</strong> Contacts with overall score &lt; 0.4 are flagged for manual review
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* John's Voice */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <FileText className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle>John's Voice</CardTitle>
                    <CardDescription>Consistent brand voice across all communications</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Voice Characteristics</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Warm but direct</strong> - Personable without being pushy</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Entrepreneurial energy</strong> - Passionate about the mission</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Personal connection</strong> - References shared experiences</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Mission-driven</strong> - Focuses on impact, not sales</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Message Constraints</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span>No salesy language or buzzwords</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span>Avoid generic platitudes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span>Keep messages under 300 characters</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span>One clear CTA per message</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Response Classification */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-teal-100 p-3 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <CardTitle>Response Classification</CardTitle>
                    <CardDescription>AI-powered categorization of incoming replies</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-green-600">Positive Responses</h4>
                    <div className="border rounded p-3 bg-green-50">
                      <p className="font-medium text-sm">positive</p>
                      <p className="text-xs text-gray-600">Interest expressed, ready to engage</p>
                    </div>
                    <div className="border rounded p-3 bg-green-50">
                      <p className="font-medium text-sm">intro_offered</p>
                      <p className="text-xs text-gray-600">Willing to make introductions</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-yellow-600">Needs Follow-up</h4>
                    <div className="border rounded p-3 bg-yellow-50">
                      <p className="font-medium text-sm">send_more_info</p>
                      <p className="text-xs text-gray-600">Wants more details before deciding</p>
                    </div>
                    <div className="border rounded p-3 bg-yellow-50">
                      <p className="font-medium text-sm">busy</p>
                      <p className="text-xs text-gray-600">Timing not right, follow up later</p>
                    </div>
                    <div className="border rounded p-3 bg-gray-50">
                      <p className="font-medium text-sm">unclear</p>
                      <p className="text-xs text-gray-600">Needs clarification or manual review</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-semibold text-red-600">Closed</h4>
                    <div className="border rounded p-3 bg-red-50">
                      <p className="font-medium text-sm">hard_no</p>
                      <p className="text-xs text-gray-600">Clear decline, do not follow up</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Auto-escalation:</strong> High-value responses (intro_offered, positive with high confidence)
                    automatically create notifications for manual review and reply.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI & Personalization Tab */}
        <TabsContent value="ai" className="space-y-6">
          <div className="grid gap-6">
            {/* GPT-5 Nano Integration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>GPT-5 Nano Integration</CardTitle>
                    <CardDescription>Cost-effective AI personalization at scale</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Model Specifications</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Model:</strong> gpt-5-nano (Released Aug 2025)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Pricing:</strong> $0.05/1M input, $0.40/1M output</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Features:</strong> Reasoning, parallel tools, structured output</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Response caching:</strong> 24-hour cache for identical requests</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">What AI Generates</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500 mt-0.5" />
                        <span>Audience classification from profile data</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500 mt-0.5" />
                        <span>Personalized message content</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500 mt-0.5" />
                        <span>Response classification & suggested replies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500 mt-0.5" />
                        <span>Fit assessment scores</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Message Personalization */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-pink-100 p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-pink-600" />
                  </div>
                  <div>
                    <CardTitle>Message Personalization</CardTitle>
                    <CardDescription>Dynamic content generation for each recipient</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Template Variables</h4>
                    <div className="bg-gray-50 p-3 rounded font-mono text-sm space-y-1">
                      <p>{`{{firstName}}`} - First name</p>
                      <p>{`{{lastName}}`} - Last name</p>
                      <p>{`{{company}}`} - Current company</p>
                      <p>{`{{position}}`} - Job title</p>
                      <p>{`{{location}}`} - Geographic location</p>
                      <p>{`{{industry}}`} - Industry category</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">AI-Enhanced Fields</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-pink-500 mt-0.5" />
                        <span><strong>Opening hook:</strong> Personalized first line</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-pink-500 mt-0.5" />
                        <span><strong>Connection point:</strong> Shared interest/experience</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-pink-500 mt-0.5" />
                        <span><strong>Value proposition:</strong> Relevant to their role</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-pink-500 mt-0.5" />
                        <span><strong>CTA customization:</strong> Appropriate next step</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Content Safety */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <Shield className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle>Content Safety & Validation</CardTitle>
                    <CardDescription>Automated quality controls for AI-generated content</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Filter className="h-4 w-4 text-red-500" />
                      Content Filters
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Spam phrase detection</li>
                      <li>Profanity filtering</li>
                      <li>Overpromise detection</li>
                      <li>Compliance checks</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <ListChecks className="h-4 w-4 text-green-500" />
                      Validation Rules
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Length limits (max 300 chars)</li>
                      <li>Required elements check</li>
                      <li>Tone consistency</li>
                      <li>Variable substitution</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Eye className="h-4 w-4 text-blue-500" />
                      Approval Flow
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Optional manual review</li>
                      <li>Batch approval UI</li>
                      <li>Edit before send</li>
                      <li>Rejection tracking</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* A/B Testing */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-cyan-100 p-3 rounded-lg">
                    <GitBranch className="h-6 w-6 text-cyan-600" />
                  </div>
                  <div>
                    <CardTitle>A/B Testing</CardTitle>
                    <CardDescription>Compare message variants to optimize performance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Test Configuration</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Multiple message variants (A, B, C...)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Random assignment to variants</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Configurable split ratios</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Statistical significance tracking</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Metrics Tracked</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <BarChart3 className="h-4 w-4 text-cyan-500 mt-0.5" />
                        <span>Response rate per variant</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <BarChart3 className="h-4 w-4 text-cyan-500 mt-0.5" />
                        <span>Positive response rate</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <BarChart3 className="h-4 w-4 text-cyan-500 mt-0.5" />
                        <span>Conversion to closed_won</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <BarChart3 className="h-4 w-4 text-cyan-500 mt-0.5" />
                        <span>Time to response</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Follow-ups Tab */}
        <TabsContent value="followups" className="space-y-6">
          <div className="grid gap-6">
            {/* Automated Follow-ups */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-3 rounded-lg">
                    <RefreshCw className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>Automated Follow-up Sequences</CardTitle>
                    <CardDescription>Smart multi-touch outreach with timing optimization</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">No-Response Sequence</h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-2 border rounded bg-gray-50">
                        <Badge>Day 3</Badge>
                        <span className="text-sm text-gray-600">Gentle check-in</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 border rounded bg-gray-50">
                        <Badge>Day 7</Badge>
                        <span className="text-sm text-gray-600">Value reminder</span>
                      </div>
                      <div className="flex items-center gap-3 p-2 border rounded bg-gray-50">
                        <Badge>Day 14</Badge>
                        <span className="text-sm text-gray-600">Final attempt with soft ask</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Response-Aware Follow-ups</h4>
                    <div className="space-y-3">
                      <div className="p-2 border rounded bg-yellow-50 border-yellow-200">
                        <p className="font-medium text-sm">busy response</p>
                        <p className="text-xs text-gray-600">Follow up in 7-14 days based on audience type</p>
                      </div>
                      <div className="p-2 border rounded bg-blue-50 border-blue-200">
                        <p className="font-medium text-sm">send_more_info response</p>
                        <p className="text-xs text-gray-600">Send materials, follow up in 3 days</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Follow-up Queue */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Follow-up Queue Management</CardTitle>
                    <CardDescription>Track and manage scheduled follow-ups</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Timer className="h-4 w-4 text-blue-500" />
                      Queue Status
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li><Badge variant="outline" className="text-xs">pending</Badge> Scheduled</li>
                      <li><Badge variant="outline" className="text-xs bg-blue-50">processing</Badge> Being sent</li>
                      <li><Badge variant="outline" className="text-xs bg-green-50">sent</Badge> Delivered</li>
                      <li><Badge variant="outline" className="text-xs bg-red-50">failed</Badge> Error</li>
                      <li><Badge variant="outline" className="text-xs bg-gray-50">skipped</Badge> Cancelled</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Workflow className="h-4 w-4 text-green-500" />
                      Auto-cancellation
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Cancel on response received</li>
                      <li>Cancel on closed_won/lost</li>
                      <li>Cancel on manual override</li>
                      <li>Cancel on campaign pause</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Bell className="h-4 w-4 text-purple-500" />
                      Notifications
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Approval needed alerts</li>
                      <li>High-value response alerts</li>
                      <li>Failed send notifications</li>
                      <li>Queue completion reports</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Conversation Events */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Activity className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Conversation Event Tracking</CardTitle>
                    <CardDescription>Complete audit trail of all interactions</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-600 space-y-2">
                  <p>Every interaction is logged in the conversation_events table:</p>
                  <ul className="grid md:grid-cols-2 gap-2 mt-3">
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">message_generated</Badge>
                      <span>AI created message</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">message_sent</Badge>
                      <span>Message delivered</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">response_classified</Badge>
                      <span>Reply categorized</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">follow_up_scheduled</Badge>
                      <span>Follow-up queued</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">stage_changed</Badge>
                      <span>Conversation stage update</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">outcome_recorded</Badge>
                      <span>Final result logged</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-6">
            {/* Campaign Analytics */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle>Campaign Analytics</CardTitle>
                    <CardDescription>Comprehensive performance metrics</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <LineChart className="h-4 w-4 text-indigo-500" />
                      Delivery Metrics
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>Total messages sent</li>
                      <li>Delivery success rate</li>
                      <li>Failed/skipped count</li>
                      <li>Send velocity (per hour/day)</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-green-500" />
                      Response Metrics
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>Overall response rate</li>
                      <li>Response by type breakdown</li>
                      <li>Average response time</li>
                      <li>Positive response rate</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      Conversion Metrics
                    </h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li>Closed won count & value</li>
                      <li>Conversion rate by stage</li>
                      <li>Pipeline velocity</li>
                      <li>ROI per campaign</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Audience Analytics */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Audience Analytics</CardTitle>
                    <CardDescription>Performance by audience segment</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">By Audience Type</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Response rate by Funder/Ambassador/Debater/Friend</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Conversion rate by audience</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Average deal value by audience</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">By Classification Quality</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Classification confidence vs outcomes</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Fit score vs conversion rate</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>False positive tracking</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* AI Performance */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>AI Performance Tracking</CardTitle>
                    <CardDescription>Monitor AI effectiveness and costs</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Usage Metrics</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Total API calls</li>
                      <li>Tokens consumed</li>
                      <li>Cache hit rate</li>
                      <li>Average latency</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Cost Tracking</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Daily/monthly spend</li>
                      <li>Cost per message</li>
                      <li>Cost per conversion</li>
                      <li>Budget alerts</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">Quality Metrics</h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>AI vs template performance</li>
                      <li>Rejection rate</li>
                      <li>Edit frequency</li>
                      <li>User satisfaction</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Safety & Security Tab */}
        <TabsContent value="safety" className="space-y-6">
          <div className="grid gap-6">
            {/* Rate Limiting */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Rate Limiting</CardTitle>
                    <CardDescription>Protect your LinkedIn account from detection</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Default Limits</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span><strong>Per Hour:</strong> 5 messages</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span><strong>Per Day:</strong> 25 messages</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span><strong>Per Week:</strong> ~100 messages (recommended)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Shield className="h-4 w-4 text-blue-500 mt-0.5" />
                        <span><strong>API Rate:</strong> 30 requests/minute per user</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Timing Controls</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Timer className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Message Delay:</strong> 90-420 seconds random</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Timer className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Typing Simulation:</strong> Human-like speed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Timer className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Quiet Hours:</strong> No sends 10PM-7AM</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Timer className="h-4 w-4 text-green-500 mt-0.5" />
                        <span><strong>Business Hours:</strong> Configurable send windows</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Authentication & Authorization */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-3 rounded-lg">
                    <Lock className="h-6 w-6 text-red-600" />
                  </div>
                  <div>
                    <CardTitle>Authentication & Authorization</CardTitle>
                    <CardDescription>Secure access control and ownership verification</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Authentication Methods</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Lock className="h-4 w-4 text-red-500 mt-0.5" />
                        <span><strong>User Auth:</strong> Supabase session cookies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Lock className="h-4 w-4 text-red-500 mt-0.5" />
                        <span><strong>Runner Auth:</strong> HMAC signature verification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Lock className="h-4 w-4 text-red-500 mt-0.5" />
                        <span><strong>API Auth:</strong> JWT tokens with expiry</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Ownership Verification</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Campaign ownership checks</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Target ownership verification</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Connection ownership validation</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                        <span>Cross-user access prevention</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Integrity */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Database className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Data Integrity & Reliability</CardTitle>
                    <CardDescription>Atomic operations and race condition prevention</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Atomic Operations</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span><strong>Task Claiming:</strong> FOR UPDATE SKIP LOCKED</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span><strong>Message Hash:</strong> Atomic claim before send</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span><strong>Follow-up Creation:</strong> Transactional RPC</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <span><strong>Task Success:</strong> 7-table atomic update</span>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Deduplication</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-purple-500 mt-0.5" />
                        <span><strong>SHA-256 Hashing:</strong> Message content + recipient</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-purple-500 mt-0.5" />
                        <span><strong>Idempotency Keys:</strong> Retry-safe operations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Hash className="h-4 w-4 text-purple-500 mt-0.5" />
                        <span><strong>Persistent Storage:</strong> Database-backed hashes</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Runner Safety */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-100 p-3 rounded-lg">
                    <Terminal className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <CardTitle>Runner Safety Features</CardTitle>
                    <CardDescription>Automation protection and human-like behavior</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Chrome className="h-4 w-4 text-blue-500" />
                      Browser Control
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Real Chrome via Playwright</li>
                      <li>Session persistence</li>
                      <li>Human-like mouse movement</li>
                      <li>Random scroll patterns</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      Error Handling
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Circuit breaker pattern</li>
                      <li>Auto-pause on detection</li>
                      <li>Error notification alerts</li>
                      <li>Graceful degradation</li>
                    </ul>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Server className="h-4 w-4 text-green-500" />
                      Task Management
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>Atomic task claiming</li>
                      <li>Multi-runner support</li>
                      <li>Priority queuing</li>
                      <li>Failure recovery</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Row Level Security */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <Shield className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle>Row Level Security (RLS)</CardTitle>
                    <CardDescription>Database-level access control</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Supabase RLS policies ensure users can only access their own data at the database level,
                  providing defense-in-depth security even if application code has bugs.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-sm">Protected Tables</p>
                    <p className="text-xs text-gray-500 mt-1">
                      campaigns, campaign_targets, connections, follow_up_queue, conversation_events,
                      notifications, sent_message_hashes
                    </p>
                  </div>
                  <div className="border rounded-lg p-3">
                    <p className="font-medium text-sm">Policy Types</p>
                    <p className="text-xs text-gray-500 mt-1">
                      SELECT, INSERT, UPDATE, DELETE - all restricted to owner (user_id = auth.uid())
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
