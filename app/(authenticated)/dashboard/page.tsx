import { createServerComponentClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  Plus,
  BarChart3,
  Users,
  MessageSquare,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Zap,
  Target,
  ArrowRight
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createServerComponentClient();

  // Get user
  const { data: { user } } = await supabase.auth.getUser();

  // Get user settings (create if doesn't exist)
  let { data: settings } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  if (!settings && user) {
    // Create default settings
    const { data: newSettings } = await supabase
      .from('user_settings')
      .insert({
        user_id: user.id,
        daily_send_limit: 50,
        min_delay_between_messages: 60,
        max_delay_between_messages: 300,
        auto_pause_on_rate_limit: true,
        require_manual_approval: true,
        browser_headless: false,
        timezone: 'UTC'
      })
      .select()
      .single();
    settings = newSettings;
  }

  // Get LinkedIn account status
  const { data: linkedinAccount } = await supabase
    .from('linkedin_accounts')
    .select('*')
    .eq('user_id', user?.id)
    .single();

  // Get campaigns
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', user?.id);

  const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];
  const totalCampaigns = campaigns?.length || 0;

  // Get connections count
  const { count: connectionsCount } = await supabase
    .from('connections')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id);

  // Get templates count
  const { count: templatesCount } = await supabase
    .from('message_templates')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id);

  // Get today's messages
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { data: todayMessages } = await supabase
    .from('message_log')
    .select('status')
    .eq('user_id', user?.id)
    .gte('sent_at', today.toISOString());

  const sentToday = todayMessages?.filter(m => m.status === 'sent').length || 0;
  const failedToday = todayMessages?.filter(m => m.status === 'failed').length || 0;

  const dailyLimit = settings?.daily_send_limit || 50;
  const percentUsed = (sentToday / dailyLimit) * 100;

  // Get pending approvals count
  const { count: pendingApprovals } = await supabase
    .from('task_queue')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user?.id)
    .eq('requires_approval', true)
    .is('approved_at', null);

  // Get recent activity
  const { data: recentActivity } = await supabase
    .from('analytics_events')
    .select('*')
    .eq('user_id', user?.id)
    .order('created_at', { ascending: false })
    .limit(5);

  // Get task queue status
  const { data: taskStats } = await supabase
    .from('task_queue')
    .select('status')
    .eq('user_id', user?.id);

  const pendingTasks = taskStats?.filter(t => t.status === 'pending').length || 0;
  const processingTasks = taskStats?.filter(t => t.status === 'processing').length || 0;

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message_sent': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'message_failed': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'campaign_started': return <Activity className="h-4 w-4 text-blue-500" />;
      case 'campaign_paused': return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActivityDescription = (event: any) => {
    switch (event.event_type) {
      case 'message_sent': return 'Message sent successfully';
      case 'message_failed': return 'Message failed to send';
      case 'campaign_started': return `Campaign "${event.event_data?.campaign_name}" started`;
      case 'campaign_paused': return `Campaign "${event.event_data?.campaign_name}" paused`;
      case 'messages_approved': return `Approved ${event.event_data?.count} messages`;
      case 'messages_rejected': return `Rejected ${event.event_data?.count} messages`;
      default: return event.event_type;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Monitor your LinkedIn messaging campaigns
          </p>
        </div>
        <div className="flex gap-2">
          {pendingApprovals && pendingApprovals > 0 && (
            <Link href="/campaigns">
              <Button variant="outline">
                <AlertCircle className="h-4 w-4 mr-2" />
                {pendingApprovals} Pending Approvals
              </Button>
            </Link>
          )}
          <Link href="/campaigns/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* LinkedIn Status Alert */}
      {linkedinAccount?.status !== 'connected' && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-lg">LinkedIn Account Not Connected</CardTitle>
              </div>
              <Link href="/run">
                <Button size="sm">
                  Connect Now
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Daily Send Limit Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Daily Send Limit</CardTitle>
              <CardDescription>
                {sentToday} of {dailyLimit} messages sent today
              </CardDescription>
            </div>
            <Badge variant={percentUsed > 80 ? "destructive" : percentUsed > 50 ? "secondary" : "default"}>
              {Math.round(percentUsed)}% Used
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={percentUsed} className="h-2" />
          {failedToday > 0 && (
            <p className="text-sm text-red-600 mt-2">
              ⚠️ {failedToday} messages failed today
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Campaigns
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns.length}</div>
            <p className="text-xs text-muted-foreground">
              {totalCampaigns} total campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Connections
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{connectionsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              In your network
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Queue Status
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasks}</div>
            <p className="text-xs text-muted-foreground">
              {processingTasks} processing now
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Success Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sentToday > 0 ? Math.round((sentToday / (sentToday + failedToday)) * 100) : 100}%
            </div>
            <p className="text-xs text-muted-foreground">
              Today's delivery rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Your latest campaign activity and messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((event) => (
                <div key={event.id} className="flex items-center gap-3 text-sm">
                  {getActivityIcon(event.event_type)}
                  <div className="flex-1">
                    <p>{getActivityDescription(event)}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(event.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No recent activity to display
            </p>
          )}
        </CardContent>
      </Card>

      {/* Campaign Performance */}
      {activeCampaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Campaigns Performance</CardTitle>
            <CardDescription>
              Real-time status of your running campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeCampaigns.map((campaign) => (
                <div key={campaign.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.total_sent} sent, {campaign.total_failed} failed
                      </p>
                    </div>
                    <Link href={`/campaigns/${campaign.id}`}>
                      <Button variant="ghost" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                  <Progress
                    value={(campaign.total_sent / (campaign.total_sent + campaign.total_failed || 1)) * 100}
                    className="h-1"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Connections</CardTitle>
            <CardDescription>
              Add new LinkedIn connections to target
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/connections">
              <Button className="w-full" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create Template</CardTitle>
            <CardDescription>
              Design a new message template
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/templates/new">
              <Button className="w-full" variant="outline">
                <MessageSquare className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">View Analytics</CardTitle>
            <CardDescription>
              Check your campaign performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/analytics">
              <Button className="w-full" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Safety Reminder */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                LinkedIn Compliance Reminder
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Always follow LinkedIn's Terms of Service. This tool helps manage outreach but does not automate messaging.
                Messages require manual approval and are sent one at a time with appropriate delays.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}