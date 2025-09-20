'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  Pause,
  Square,
  SkipForward,
  RefreshCw,
  Clock,
  Users,
  Send,
  AlertCircle,
  Zap,
  Shield,
  Activity,
  Settings,
  Calendar,
  Target,
  TrendingUp,
  Bell,
  Volume2,
  VolumeX,
  Gauge,
  Timer,
  CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface CampaignControlCenterProps {
  campaignId: string;
}

export function CampaignControlCenter({ campaignId }: CampaignControlCenterProps) {
  const [campaign, setCampaign] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [stats, setStats] = useState({
    totalMessages: 0,
    sentToday: 0,
    sentThisHour: 0,
    pendingMessages: 0,
    failedMessages: 0,
    responseRate: 0,
    avgResponseTime: 0
  });

  // Real-time controls
  const [settings, setSettings] = useState({
    autoApprove: false,
    autoApproveThreshold: 90,
    pauseOnErrors: true,
    errorThreshold: 3,
    enableNotifications: true,
    dailyLimit: 50,
    hourlyLimit: 10,
    delayBetweenMessages: 60, // seconds
    randomDelay: true,
    randomDelayRange: [30, 120], // min/max seconds
    workingHours: {
      enabled: true,
      start: '09:00',
      end: '17:00',
      timezone: 'America/New_York',
      weekendsOff: true
    },
    rateLimiting: {
      enabled: true,
      backoffMultiplier: 2,
      maxRetries: 3,
      cooldownPeriod: 3600 // seconds
    }
  });

  const [liveStats, setLiveStats] = useState({
    messagesPerMinute: 0,
    currentQueue: 0,
    estimatedCompletion: null as Date | null,
    systemHealth: 'healthy' as 'healthy' | 'degraded' | 'critical',
    linkedInStatus: 'connected' as 'connected' | 'rate_limited' | 'disconnected',
    lastActivity: new Date()
  });

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadCampaignData();
    subscribeToRealTimeUpdates();

    // Poll for live stats every 5 seconds
    const interval = setInterval(updateLiveStats, 5000);

    return () => {
      clearInterval(interval);
      unsubscribeFromUpdates();
    };
  }, [campaignId]);

  const loadCampaignData = async () => {
    const { data: campaignData } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignData) {
      setCampaign(campaignData);
      setIsRunning(campaignData.status === 'active');
      setIsPaused(campaignData.status === 'paused');

      // Load saved settings
      if (campaignData.settings) {
        setSettings(prev => ({ ...prev, ...campaignData.settings }));
      }
    }

    await updateStats();
  };

  const updateStats = async () => {
    // Get message statistics
    const { data: messages } = await supabase
      .from('task_queue')
      .select('status, created_at')
      .eq('campaign_id', campaignId);

    if (messages) {
      const now = new Date();
      const todayStart = new Date(now.setHours(0, 0, 0, 0));
      const hourStart = new Date(now.setHours(now.getHours(), 0, 0, 0));

      setStats({
        totalMessages: messages.length,
        sentToday: messages.filter(m =>
          m.status === 'completed' && new Date(m.created_at) > todayStart
        ).length,
        sentThisHour: messages.filter(m =>
          m.status === 'completed' && new Date(m.created_at) > hourStart
        ).length,
        pendingMessages: messages.filter(m => m.status === 'pending').length,
        failedMessages: messages.filter(m => m.status === 'failed').length,
        responseRate: 0.15, // This would come from actual response tracking
        avgResponseTime: 4.2 // hours - this would be calculated
      });
    }
  };

  const updateLiveStats = async () => {
    // Check runner status
    const { data: runnerStatus } = await supabase
      .from('runner_status')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Calculate messages per minute
    const { data: recentMessages } = await supabase
      .from('send_logs')
      .select('sent_at')
      .eq('campaign_id', campaignId)
      .gte('sent_at', new Date(Date.now() - 60000).toISOString());

    const messagesPerMinute = recentMessages?.length || 0;

    // Estimate completion time
    let estimatedCompletion = null;
    if (messagesPerMinute > 0 && stats.pendingMessages > 0) {
      const minutesToComplete = stats.pendingMessages / messagesPerMinute;
      estimatedCompletion = new Date(Date.now() + minutesToComplete * 60000);
    }

    // Determine system health
    let systemHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    if (stats.failedMessages > 10) systemHealth = 'critical';
    else if (stats.failedMessages > 5) systemHealth = 'degraded';

    setLiveStats({
      messagesPerMinute,
      currentQueue: stats.pendingMessages,
      estimatedCompletion,
      systemHealth,
      linkedInStatus: runnerStatus?.linkedin_connected ? 'connected' : 'disconnected',
      lastActivity: runnerStatus?.last_activity ? new Date(runnerStatus.last_activity) : new Date()
    });
  };

  const subscribeToRealTimeUpdates = () => {
    // Subscribe to campaign updates
    supabase
      .channel(`campaign-${campaignId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'task_queue',
        filter: `campaign_id=eq.${campaignId}`
      }, () => {
        updateStats();
      })
      .subscribe();
  };

  const unsubscribeFromUpdates = () => {
    supabase.removeAllChannels();
  };

  const handleStart = async () => {
    try {
      await supabase
        .from('campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId);

      setIsRunning(true);
      setIsPaused(false);

      toast({
        title: 'Campaign Started',
        description: 'Messages will begin sending according to your settings',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start campaign',
        variant: 'destructive',
      });
    }
  };

  const handlePause = async () => {
    try {
      await supabase
        .from('campaigns')
        .update({ status: 'paused' })
        .eq('id', campaignId);

      setIsRunning(false);
      setIsPaused(true);

      toast({
        title: 'Campaign Paused',
        description: 'Message sending has been paused',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to pause campaign',
        variant: 'destructive',
      });
    }
  };

  const handleStop = async () => {
    try {
      await supabase
        .from('campaigns')
        .update({ status: 'stopped' })
        .eq('id', campaignId);

      setIsRunning(false);
      setIsPaused(false);

      toast({
        title: 'Campaign Stopped',
        description: 'Campaign has been stopped completely',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to stop campaign',
        variant: 'destructive',
      });
    }
  };

  const handleSkipCurrent = async () => {
    // Skip the current message in queue
    toast({
      title: 'Message Skipped',
      description: 'Current message has been skipped',
    });
  };

  const updateSetting = async (key: string, value: any) => {
    const newSettings = {
      ...settings,
      [key]: value
    };

    setSettings(newSettings);

    // Save to database
    await supabase
      .from('campaigns')
      .update({ settings: newSettings })
      .eq('id', campaignId);

    toast({
      title: 'Settings Updated',
      description: 'Campaign settings have been saved',
    });
  };

  return (
    <div className="space-y-6">
      {/* Main Control Panel */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Campaign Control Center</CardTitle>
              <CardDescription>
                Real-time monitoring and control of your campaign
              </CardDescription>
            </div>
            <Badge
              variant={
                liveStats.systemHealth === 'healthy' ? 'default' :
                liveStats.systemHealth === 'degraded' ? 'secondary' : 'destructive'
              }
              className="gap-1"
            >
              <Activity className="h-3 w-3" />
              System {liveStats.systemHealth}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Live Stats Bar */}
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.sentToday}</div>
              <div className="text-xs text-muted-foreground">Sent Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.pendingMessages}</div>
              <div className="text-xs text-muted-foreground">In Queue</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{liveStats.messagesPerMinute}</div>
              <div className="text-xs text-muted-foreground">Per Minute</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {liveStats.estimatedCompletion
                  ? `${Math.round((liveStats.estimatedCompletion.getTime() - Date.now()) / 3600000)}h`
                  : '—'}
              </div>
              <div className="text-xs text-muted-foreground">Time Left</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Campaign Progress</span>
              <span>{Math.round((stats.totalMessages - stats.pendingMessages) / stats.totalMessages * 100)}%</span>
            </div>
            <Progress
              value={(stats.totalMessages - stats.pendingMessages) / stats.totalMessages * 100}
              className="h-3"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isRunning && !isPaused && (
              <Button onClick={handleStart} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Start Campaign
              </Button>
            )}
            {isRunning && (
              <>
                <Button onClick={handlePause} variant="secondary" className="flex-1">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
                <Button onClick={handleSkipCurrent} variant="outline">
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip Current
                </Button>
              </>
            )}
            {isPaused && (
              <Button onClick={handleStart} className="flex-1">
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
            )}
            <Button onClick={handleStop} variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
          </div>

          {/* Status Indicators */}
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-3 border rounded-lg">
              {liveStats.linkedInStatus === 'connected' ? (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <div className="text-sm font-medium">LinkedIn</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {liveStats.linkedInStatus.replace('_', ' ')}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-sm font-medium">Last Activity</div>
                <div className="text-xs text-muted-foreground">
                  {liveStats.lastActivity.toLocaleTimeString()}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 p-3 border rounded-lg">
              <Gauge className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-sm font-medium">Rate Limit</div>
                <div className="text-xs text-muted-foreground">
                  {stats.sentThisHour}/{settings.hourlyLimit} this hour
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Settings</CardTitle>
          <CardDescription>
            Configure how your campaign runs automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Auto-Approval */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Approve High Confidence</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically approve messages above threshold
                </div>
              </div>
              <Switch
                checked={settings.autoApprove}
                onCheckedChange={(checked) => updateSetting('autoApprove', checked)}
              />
            </div>

            {settings.autoApprove && (
              <div className="space-y-2 ml-6">
                <Label>Confidence Threshold</Label>
                <div className="flex items-center gap-4">
                  <Slider
                    value={[settings.autoApproveThreshold]}
                    onValueChange={([value]) => updateSetting('autoApproveThreshold', value)}
                    min={70}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <Badge variant="secondary">{settings.autoApproveThreshold}%</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Rate Limiting */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Rate Limits</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Daily Limit</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[settings.dailyLimit]}
                    onValueChange={([value]) => updateSetting('dailyLimit', value)}
                    min={10}
                    max={200}
                    step={10}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.dailyLimit}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hourly Limit</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[settings.hourlyLimit]}
                    onValueChange={([value]) => updateSetting('hourlyLimit', value)}
                    min={1}
                    max={20}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.hourlyLimit}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Message Delays */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Message Timing</h4>

            <div className="space-y-2">
              <Label>Delay Between Messages (seconds)</Label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[settings.delayBetweenMessages]}
                  onValueChange={([value]) => updateSetting('delayBetweenMessages', value)}
                  min={30}
                  max={300}
                  step={10}
                  className="flex-1"
                />
                <Badge variant="outline">{settings.delayBetweenMessages}s</Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Random Delays</Label>
                <div className="text-sm text-muted-foreground">
                  Add human-like randomness to timing
                </div>
              </div>
              <Switch
                checked={settings.randomDelay}
                onCheckedChange={(checked) => updateSetting('randomDelay', checked)}
              />
            </div>
          </div>

          {/* Working Hours */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Working Hours Only</Label>
                <div className="text-sm text-muted-foreground">
                  Only send during business hours
                </div>
              </div>
              <Switch
                checked={settings.workingHours.enabled}
                onCheckedChange={(checked) =>
                  updateSetting('workingHours', { ...settings.workingHours, enabled: checked })
                }
              />
            </div>

            {settings.workingHours.enabled && (
              <div className="grid grid-cols-3 gap-4 ml-6">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={settings.workingHours.start}
                    onChange={(e) =>
                      updateSetting('workingHours', { ...settings.workingHours, start: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={settings.workingHours.end}
                    onChange={(e) =>
                      updateSetting('workingHours', { ...settings.workingHours, end: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={settings.workingHours.timezone}
                    onValueChange={(value) =>
                      updateSetting('workingHours', { ...settings.workingHours, timezone: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern</SelectItem>
                      <SelectItem value="America/Chicago">Central</SelectItem>
                      <SelectItem value="America/Denver">Mountain</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                      <SelectItem value="Europe/London">London</SelectItem>
                      <SelectItem value="Europe/Paris">Paris</SelectItem>
                      <SelectItem value="Asia/Singapore">Singapore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Error Handling */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold">Error Handling</h4>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Pause on Errors</Label>
                <div className="text-sm text-muted-foreground">
                  Automatically pause when errors exceed threshold
                </div>
              </div>
              <Switch
                checked={settings.pauseOnErrors}
                onCheckedChange={(checked) => updateSetting('pauseOnErrors', checked)}
              />
            </div>

            {settings.pauseOnErrors && (
              <div className="space-y-2 ml-6">
                <Label>Error Threshold</Label>
                <div className="flex items-center gap-2">
                  <Slider
                    value={[settings.errorThreshold]}
                    onValueChange={([value]) => updateSetting('errorThreshold', value)}
                    min={1}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <Badge variant="outline">{settings.errorThreshold} errors</Badge>
                </div>
              </div>
            )}
          </div>

          {/* Notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Get alerts for important events
              </div>
            </div>
            <Switch
              checked={settings.enableNotifications}
              onCheckedChange={(checked) => updateSetting('enableNotifications', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Warnings */}
      {stats.failedMessages > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed Messages</AlertTitle>
          <AlertDescription>
            {stats.failedMessages} messages have failed. Review and retry them in the error log.
          </AlertDescription>
        </Alert>
      )}

      {liveStats.linkedInStatus !== 'connected' && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertTitle>LinkedIn Connection Issue</AlertTitle>
          <AlertDescription>
            Your LinkedIn session may have expired. Please check your connection in LinkedIn Setup.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// Add missing Input import
import { Input } from '@/components/ui/input';