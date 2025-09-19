'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createClient } from '@/lib/supabase/client';
import {
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Loader2,
  AlertCircle,
  ChevronRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface QueueViewProps {
  tasks: any[];
  campaignId: string;
}

export function QueueView({ tasks: initialTasks, campaignId }: QueueViewProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to real-time updates
    const channel = supabase
      .channel(`campaign-${campaignId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_queue',
          filter: `campaign_id=eq.${campaignId}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setTasks(prev => prev.map(task =>
              task.id === payload.new.id ? { ...task, ...payload.new } : task
            ));
          } else if (payload.eventType === 'INSERT') {
            setTasks(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campaignId, supabase]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'queued':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'in_progress':
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'succeeded':
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'deferred':
        return <RefreshCw className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'queued':
        return 'bg-gray-100 text-gray-700';
      case 'in_progress':
      case 'processing':
        return 'bg-blue-100 text-blue-700';
      case 'succeeded':
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'deferred':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const groupedTasks = {
    processing: tasks.filter(t => t.status === 'in_progress' || t.status === 'processing'),
    queued: tasks.filter(t => t.status === 'queued'),
    completed: tasks.filter(t => t.status === 'succeeded' || t.status === 'completed'),
    failed: tasks.filter(t => t.status === 'failed'),
    deferred: tasks.filter(t => t.status === 'deferred')
  };

  return (
    <div className="space-y-6">
      {/* Real-time Status Indicator */}
      {isSubscribed && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <div className="h-2 w-2 bg-green-600 rounded-full animate-pulse" />
          Real-time updates active
        </div>
      )}

      {/* Queue Summary */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {groupedTasks.processing.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Queued</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {groupedTasks.queued.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {groupedTasks.completed.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {groupedTasks.failed.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Deferred</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {groupedTasks.deferred.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task List */}
      <Card>
        <CardHeader>
          <CardTitle>Task Queue</CardTitle>
          <CardDescription>
            Real-time view of all tasks in this campaign
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No tasks in queue yet
                </div>
              ) : (
                tasks.map((task) => {
                  const connection = task.campaign_targets?.connections;

                  return (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(task.status)}
                        <div>
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3 text-muted-foreground" />
                            <span className="font-medium">
                              {connection?.full_name || 'Unknown'}
                            </span>
                          </div>
                          {connection?.company && (
                            <p className="text-sm text-muted-foreground">
                              {connection.company}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>

                        {task.attempt > 0 && (
                          <Badge variant="outline">
                            Attempt {task.attempt}
                          </Badge>
                        )}

                        {task.run_after && (
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(task.run_after), { addSuffix: true })}
                          </span>
                        )}

                        {task.locked_by && (
                          <span className="text-xs text-blue-600">
                            Runner: {task.locked_by}
                          </span>
                        )}

                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}