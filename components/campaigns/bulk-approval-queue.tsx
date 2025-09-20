'use client';

import { useState, useTransition, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Check,
  X,
  Edit2,
  Eye,
  UserCheck,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  Brain,
  Sparkles,
  Keyboard,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Zap
} from 'lucide-react';
import Mustache from 'mustache';
import { approveMessages, rejectMessages, updateMessage } from '@/app/(authenticated)/campaigns/[id]/approve/actions';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  scheduled_for: string;
  campaign_targets: {
    id: string;
    personalized_message?: string;
    final_message?: string;
    ai_summary_id?: string;
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
  ai_personalization_queue?: {
    confidence_score: number;
    first_line: string;
    midline: string;
    persona: any;
  };
}

interface BulkApprovalQueueProps {
  campaign: any;
  template: any;
  tasks: Task[];
}

export function BulkApprovalQueue({ campaign, template, tasks: initialTasks }: BulkApprovalQueueProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  // Filtering and sorting
  const [filterMode, setFilterMode] = useState<'all' | 'high-confidence' | 'low-confidence' | 'needs-review'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'confidence' | 'name'>('date');
  const [groupBy, setGroupBy] = useState<'none' | 'confidence' | 'company'>('none');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Keyboard navigation
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Filter tasks based on mode
  const filteredTasks = tasks.filter(task => {
    const confidence = task.ai_personalization_queue?.confidence_score || 0;
    switch (filterMode) {
      case 'high-confidence':
        return confidence >= 0.9;
      case 'low-confidence':
        return confidence < 0.7;
      case 'needs-review':
        return confidence < 0.8 || !task.campaign_targets.personalized_message;
      default:
        return true;
    }
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        const aConf = a.ai_personalization_queue?.confidence_score || 0;
        const bConf = b.ai_personalization_queue?.confidence_score || 0;
        return bConf - aConf;
      case 'name':
        return a.campaign_targets.connections.full_name.localeCompare(
          b.campaign_targets.connections.full_name
        );
      default:
        return new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime();
    }
  });

  // Group tasks
  const groupedTasks = groupBy === 'none' ? { 'All Messages': sortedTasks } :
    sortedTasks.reduce((groups, task) => {
      let key = '';
      if (groupBy === 'confidence') {
        const confidence = task.ai_personalization_queue?.confidence_score || 0;
        if (confidence >= 0.9) key = 'High Confidence (90%+)';
        else if (confidence >= 0.8) key = 'Good Confidence (80-89%)';
        else if (confidence >= 0.7) key = 'Medium Confidence (70-79%)';
        else key = 'Low Confidence (<70%)';
      } else if (groupBy === 'company') {
        key = task.campaign_targets.connections.company || 'No Company';
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
      return groups;
    }, {} as Record<string, Task[]>);

  // Paginate current group
  const paginatedGroups = Object.entries(groupedTasks).map(([group, tasks]) => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return [group, tasks.slice(start, end)];
  });

  const totalPages = Math.ceil(sortedTasks.length / itemsPerPage);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in textarea
      if (e.target instanceof HTMLTextAreaElement) return;

      const currentTasks = sortedTasks.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

      switch (e.key.toLowerCase()) {
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSelectAll();
          } else if (focusedIndex < currentTasks.length) {
            e.preventDefault();
            handleApprove([currentTasks[focusedIndex].id]);
          }
          break;
        case 'r':
          if (focusedIndex < currentTasks.length) {
            e.preventDefault();
            handleReject([currentTasks[focusedIndex].id]);
          }
          break;
        case 'e':
          if (focusedIndex < currentTasks.length) {
            e.preventDefault();
            const taskId = currentTasks[focusedIndex].id;
            setEditingTask(taskId);
            setEditedMessages({
              ...editedMessages,
              [taskId]: renderMessage(currentTasks[focusedIndex]),
            });
          }
          break;
        case ' ':
          e.preventDefault();
          if (focusedIndex < currentTasks.length) {
            handleSelectTask(currentTasks[focusedIndex].id);
          }
          break;
        case 'arrowdown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, currentTasks.length - 1));
          break;
        case 'arrowup':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'arrowleft':
          if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
            setFocusedIndex(0);
          }
          break;
        case 'arrowright':
          if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
            setFocusedIndex(0);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [focusedIndex, currentPage, sortedTasks, editedMessages]);

  const renderMessage = (task: Task) => {
    const connection = task.campaign_targets.connections;
    const templateBody = task.campaign_targets.personalized_message ||
                        task.campaign_targets.final_message ||
                        template?.body || '';

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
    const currentTasks = sortedTasks.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    );

    const allSelected = currentTasks.every(t => selectedTasks.has(t.id));

    if (allSelected) {
      // Deselect all on current page
      const newSelected = new Set(selectedTasks);
      currentTasks.forEach(t => newSelected.delete(t.id));
      setSelectedTasks(newSelected);
    } else {
      // Select all on current page
      const newSelected = new Set(selectedTasks);
      currentTasks.forEach(t => newSelected.add(t.id));
      setSelectedTasks(newSelected);
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

  const handleBulkApprove = async (threshold?: number) => {
    let idsToApprove: string[] = [];

    if (threshold !== undefined) {
      // Approve all with confidence >= threshold
      idsToApprove = tasks
        .filter(t => (t.ai_personalization_queue?.confidence_score || 0) >= threshold)
        .map(t => t.id);
    } else {
      // Approve selected
      idsToApprove = Array.from(selectedTasks);
    }

    if (idsToApprove.length === 0) {
      toast({
        title: 'No tasks to approve',
        description: threshold
          ? `No messages meet the ${threshold * 100}% confidence threshold`
          : 'Please select messages to approve',
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
      {/* Controls Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="space-y-4">
            {/* Top Row: Selection and Bulk Actions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Checkbox
                  checked={selectedTasks.size === sortedTasks.length && sortedTasks.length > 0}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm text-muted-foreground">
                  {selectedTasks.size} of {filteredTasks.length} selected
                </span>

                {/* Quick Stats */}
                <div className="flex gap-2">
                  <Badge variant="secondary">
                    <Brain className="h-3 w-3 mr-1" />
                    {tasks.filter(t => (t.ai_personalization_queue?.confidence_score || 0) >= 0.9).length} High Confidence
                  </Badge>
                  <Badge variant="outline">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {tasks.filter(t => (t.ai_personalization_queue?.confidence_score || 0) < 0.7).length} Need Review
                  </Badge>
                </div>
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

            {/* Second Row: Filters and Sorting */}
            <div className="flex items-center gap-3">
              <Select value={filterMode} onValueChange={(v: any) => setFilterMode(v)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter messages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Messages</SelectItem>
                  <SelectItem value="high-confidence">High Confidence (90%+)</SelectItem>
                  <SelectItem value="low-confidence">Low Confidence (&lt;70%)</SelectItem>
                  <SelectItem value="needs-review">Needs Review</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>

              <Select value={groupBy} onValueChange={(v: any) => setGroupBy(v)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Group by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Grouping</SelectItem>
                  <SelectItem value="confidence">Confidence Level</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto flex gap-2">
                {/* Bulk Actions */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkApprove(0.9)}
                  disabled={isPending}
                >
                  <Zap className="h-4 w-4 mr-1" />
                  Approve All 90%+
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBulkApprove(0.8)}
                  disabled={isPending}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve All 80%+
                </Button>
              </div>
            </div>

            {/* Third Row: Keyboard Shortcuts Help */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Keyboard className="h-3 w-3" />
                <span>Keyboard shortcuts:</span>
              </div>
              <span><kbd>A</kbd> Approve</span>
              <span><kbd>R</kbd> Reject</span>
              <span><kbd>E</kbd> Edit</span>
              <span><kbd>Space</kbd> Select</span>
              <span><kbd>↑↓</kbd> Navigate</span>
              <span><kbd>←→</kbd> Pages</span>
              <span><kbd>Ctrl+A</kbd> Select All</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Message Cards Grouped */}
      <ScrollArea className="h-[600px]">
        {Object.entries(groupedTasks).map(([group, groupTasks]) => (
          <div key={group} className="space-y-4 mb-6">
            {groupBy !== 'none' && (
              <h3 className="text-sm font-semibold text-muted-foreground">
                {group} ({groupTasks.length})
              </h3>
            )}

            {groupTasks
              .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
              .map((task, index) => {
                const connection = task.campaign_targets.connections;
                const isExpanded = expandedTasks.has(task.id);
                const isEditing = editingTask === task.id;
                const message = renderMessage(task);
                const isFocused = index === focusedIndex;
                const confidence = task.ai_personalization_queue?.confidence_score || 0;

                return (
                  <Card
                    key={task.id}
                    className={cn(
                      "overflow-hidden transition-all",
                      isFocused && "ring-2 ring-primary",
                      selectedTasks.has(task.id) && "border-primary"
                    )}
                  >
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
                          {/* Confidence Badge */}
                          <Badge
                            variant={
                              confidence >= 0.9 ? "default" :
                              confidence >= 0.8 ? "secondary" :
                              confidence >= 0.7 ? "outline" : "destructive"
                            }
                            className="gap-1"
                          >
                            {confidence >= 0.9 ? (
                              <Sparkles className="h-3 w-3" />
                            ) : (
                              <Brain className="h-3 w-3" />
                            )}
                            {Math.round(confidence * 100)}%
                          </Badge>

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

                          {/* AI Insights */}
                          {task.ai_personalization_queue && (
                            <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Brain className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                  AI Personalization
                                </span>
                              </div>
                              <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                                <p><strong>Opening:</strong> {task.ai_personalization_queue.first_line}</p>
                                {task.ai_personalization_queue.midline && (
                                  <p><strong>Context:</strong> {task.ai_personalization_queue.midline}</p>
                                )}
                              </div>
                            </div>
                          )}

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
          </div>
        ))}
      </ScrollArea>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages} • Showing {Math.min(filteredTasks.length, itemsPerPage)} of {filteredTasks.length} messages
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                Pro Tip: Bulk Approval Workflow
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                1. Use filters to show high-confidence messages (90%+)<br />
                2. Review a sample, then click "Approve All 90%+" to bulk approve<br />
                3. Switch to "Needs Review" filter for manual inspection<br />
                4. Use keyboard shortcuts (A/R/E) for fast individual processing
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}