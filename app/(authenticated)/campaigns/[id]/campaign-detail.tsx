'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Users,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import { startCampaign, pauseCampaign, stopCampaign } from './actions';
import Link from 'next/link';

interface CampaignStats {
  total_targets: number;
  messages_sent: number;
  messages_pending: number;
  messages_failed: number;
  approval_pending: number;
}

interface CampaignDetailProps {
  campaign: any;
  stats: CampaignStats;
  todayCount: number;
}

export function CampaignDetail({ campaign, stats, todayCount }: CampaignDetailProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const completionRate = stats.total_targets > 0
    ? (stats.messages_sent / stats.total_targets) * 100
    : 0;

  const successRate = (stats.messages_sent + stats.messages_failed) > 0
    ? (stats.messages_sent / (stats.messages_sent + stats.messages_failed)) * 100
    : 100;

  const handleStart = () => {
    startTransition(async () => {
      try {
        await startCampaign(campaign.id);
        toast({
          title: 'Campaign started',
          description: 'Your campaign is now active and will begin sending messages.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to start campaign',
          variant: 'destructive',
        });
      }
    });
  };

  const handlePause = () => {
    startTransition(async () => {
      try {
        await pauseCampaign(campaign.id);
        toast({
          title: 'Campaign paused',
          description: 'Your campaign has been paused. You can resume it anytime.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to pause campaign',
          variant: 'destructive',
        });
      }
    });
  };

  const handleStop = () => {
    startTransition(async () => {
      try {
        await stopCampaign(campaign.id);
        toast({
          title: 'Campaign stopped',
          description: 'Your campaign has been stopped and archived.',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to stop campaign',
          variant: 'destructive',
        });
      }
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'completed':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'draft':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Zap className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{campaign.name}</h1>
          <p className="text-muted-foreground mt-2">
            Using template: {campaign.message_templates?.name}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge className={`${getStatusColor(campaign.status)} flex items-center gap-1`}>
            {getStatusIcon(campaign.status)}
            {campaign.status}
          </Badge>

          {/* Campaign Controls */}
          {campaign.status === 'draft' && (
            <Button onClick={handleStart} disabled={isPending}>
              <Play className="h-4 w-4 mr-2" />
              Start Campaign
            </Button>
          )}

          {campaign.status === 'active' && (
            <Button onClick={handlePause} variant="secondary" disabled={isPending}>
              <Pause className="h-4 w-4 mr-2" />
              Pause Campaign
            </Button>
          )}

          {campaign.status === 'paused' && (
            <>
              <Button onClick={handleStart} disabled={isPending}>
                <Play className="h-4 w-4 mr-2" />
                Resume
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isPending}>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Stop Campaign?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently stop the campaign and archive it.
                      You won't be able to restart it. All pending messages will be cancelled.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleStop}>
                      Stop Campaign
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}

          {stats.approval_pending > 0 && (
            <Link href={`/campaigns/${campaign.id}/approve`}>
              <Button variant="outline">
                <AlertCircle className="h-4 w-4 mr-2" />
                {stats.approval_pending} Pending Approval
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Progress Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Campaign Progress</CardTitle>
          <CardDescription>
            Overall completion and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Completion</span>
              <span className="font-medium">{Math.round(completionRate)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.messages_sent} of {stats.total_targets} messages sent
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.total_targets}
              </div>
              <p className="text-xs text-muted-foreground">Total Targets</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.messages_sent}
              </div>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.messages_pending}
              </div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.messages_failed}
              </div>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Math.round(successRate)}%
              </div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Today's Activity */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today's Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayCount}</div>
            <p className="text-xs text-muted-foreground">
              Messages sent today
            </p>
            <Progress
              value={(todayCount / campaign.daily_cap) * 100}
              className="h-1 mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {todayCount} / {campaign.daily_cap} daily limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pacing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Hourly Cap</span>
                <span className="font-medium">{campaign.hourly_cap || 5}/hr</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Daily Cap</span>
                <span className="font-medium">{campaign.daily_cap}/day</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Jitter</span>
                <span className="font-medium">{campaign.jitter_ms}ms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Manual Approval</span>
                <Badge variant={campaign.require_manual_approval ? "default" : "secondary"}>
                  {campaign.require_manual_approval ? 'Required' : 'Disabled'}
                </Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span>Quiet Hours</span>
                <span className="font-medium text-xs">
                  {campaign.quiet_hours?.start || '22:00'} - {campaign.quiet_hours?.end || '07:00'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning for Active Campaign */}
      {campaign.status === 'active' && (
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  Campaign is Active
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Messages are being sent automatically according to your rate limits and schedule.
                  Monitor the logs for any issues and pause if needed.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}