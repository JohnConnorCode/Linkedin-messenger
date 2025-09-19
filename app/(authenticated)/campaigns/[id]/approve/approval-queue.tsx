'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import {
  Check,
  X,
  Edit2,
  Eye,
  UserCheck,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Mustache from 'mustache';
import { approveMessages, rejectMessages, updateMessage } from './actions';

interface Task {
  id: string;
  scheduled_for: string;
  campaign_targets: {
    id: string;
    personalized_message?: string;
    connections: {
      id: string;
      first_name: string;
      last_name: string;
      full_name: string;
      headline: string;
      company: string;
      location: string;
      linkedin_url: string;
    };
  };
}

interface ApprovalQueueProps {
  campaign: any;
  template: any;
  tasks: Task[];
}

export function ApprovalQueue({ campaign, template, tasks: initialTasks }: ApprovalQueueProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const renderMessage = (task: Task) => {
    const connection = task.campaign_targets.connections;
    const templateBody = task.campaign_targets.personalized_message || template?.body || '';

    // Check if task is being edited
    if (editingTask === task.id) {
      return editedMessages[task.id] || templateBody;
    }

    // Render with Mustache
    try {
      return Mustache.render(templateBody, {
        firstName: connection.first_name,
        lastName: connection.last_name,
        fullName: connection.full_name,
        headline: connection.headline,
        company: connection.company,
        location: connection.location,
      });
    } catch (error) {
      console.error('Mustache rendering error:', error);
      return templateBody;
    }
  };

  const handleSelectAll = () => {
    if (selectedTasks.size === tasks.length) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(tasks.map(t => t.id)));
    }
  };

  const handleSelectTask = (taskId: string) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleApprove = async (taskIds?: string[]) => {
    const idsToApprove = taskIds || Array.from(selectedTasks);
    if (idsToApprove.length === 0) {
      toast({
        title: 'No tasks selected',
        description: 'Please select messages to approve',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      try {
        await approveMessages(idsToApprove);

        // Update local state
        setTasks(prev => prev.filter(t => !idsToApprove.includes(t.id)));
        setSelectedTasks(new Set());

        toast({
          title: 'Messages approved',
          description: `${idsToApprove.length} message(s) approved and queued for sending`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to approve messages',
          variant: 'destructive',
        });
      }
    });
  };

  const handleReject = async (taskIds?: string[]) => {
    const idsToReject = taskIds || Array.from(selectedTasks);
    if (idsToReject.length === 0) {
      toast({
        title: 'No tasks selected',
        description: 'Please select messages to reject',
        variant: 'destructive',
      });
      return;
    }

    startTransition(async () => {
      try {
        await rejectMessages(idsToReject);

        // Update local state
        setTasks(prev => prev.filter(t => !idsToReject.includes(t.id)));
        setSelectedTasks(new Set());

        toast({
          title: 'Messages rejected',
          description: `${idsToReject.length} message(s) rejected`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to reject messages',
          variant: 'destructive',
        });
      }
    });
  };

  const handleSaveEdit = async (taskId: string) => {
    const newMessage = editedMessages[taskId];
    if (!newMessage) return;

    startTransition(async () => {
      try {
        await updateMessage(taskId, newMessage);

        // Update local state
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return {
              ...t,
              campaign_targets: {
                ...t.campaign_targets,
                personalized_message: newMessage,
              }
            };
          }
          return t;
        }));

        setEditingTask(null);
        setEditedMessages(prev => {
          const next = { ...prev };
          delete next[taskId];
          return next;
        });

        toast({
          title: 'Message updated',
          description: 'The message has been updated successfully',
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to update message',
          variant: 'destructive',
        });
      }
    });
  };

  const toggleExpanded = (taskId: string) => {
    const newExpanded = new Set(expandedTasks);
    if (newExpanded.has(taskId)) {
      newExpanded.delete(taskId);
    } else {
      newExpanded.add(taskId);
    }
    setExpandedTasks(newExpanded);
  };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No messages pending approval</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedTasks.size === tasks.length && tasks.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedTasks.size} of {tasks.length} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject()}
                disabled={selectedTasks.size === 0 || isPending}
              >
                <X className="h-4 w-4 mr-1" />
                Reject Selected
              </Button>
              <Button
                size="sm"
                onClick={() => handleApprove()}
                disabled={selectedTasks.size === 0 || isPending}
              >
                <Check className="h-4 w-4 mr-1" />
                Approve Selected
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Message Cards */}
      {tasks.map((task) => {
        const connection = task.campaign_targets.connections;
        const isExpanded = expandedTasks.has(task.id);
        const isEditing = editingTask === task.id;
        const message = renderMessage(task);

        return (
          <Card key={task.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <Checkbox
                    checked={selectedTasks.has(task.id)}
                    onCheckedChange={() => handleSelectTask(task.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CardTitle className="text-base">
                        {connection.full_name}
                      </CardTitle>
                      <a
                        href={connection.linkedin_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        View Profile
                      </a>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {connection.headline}
                    </p>
                    {connection.company && (
                      <p className="text-sm text-muted-foreground">
                        {connection.company} • {connection.location}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(task.scheduled_for).toLocaleString()}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(task.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-muted rounded-lg">
                    {isEditing ? (
                      <Textarea
                        value={editedMessages[task.id] || message}
                        onChange={(e) => setEditedMessages({
                          ...editedMessages,
                          [task.id]: e.target.value,
                        })}
                        className="min-h-[100px] font-mono text-sm"
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">{message}</p>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      {isEditing ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTask(null);
                              setEditedMessages(prev => {
                                const next = { ...prev };
                                delete next[task.id];
                                return next;
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(task.id)}
                            disabled={isPending}
                          >
                            Save Changes
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTask(task.id);
                            setEditedMessages({
                              ...editedMessages,
                              [task.id]: message,
                            });
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit Message
                        </Button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject([task.id])}
                        disabled={isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleApprove([task.id])}
                        disabled={isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Warning */}
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                Important: Manual Review Required
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                Each message will be sent to LinkedIn exactly as shown above.
                Please review carefully before approving.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}