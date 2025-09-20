'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Brain,
  Check,
  X,
  RotateCw,
  AlertTriangle,
  User,
  Building,
  ChevronRight,
  Clock,
  Filter,
  MessageSquare
} from 'lucide-react';

interface ApprovalItem {
  id: string;
  campaign_id: string;
  connection_id: string;
  campaign_name: string;
  connection: {
    full_name: string;
    company: string;
    title: string;
    profile_url: string;
  };
  personalization: {
    first_line: string;
    midline: string;
    persona: any;
    confidence_score: number;
  };
  final_message: string;
  approval_status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AIApprovalQueuePage() {
  const [items, setItems] = useState<ApprovalItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovalItems();
  }, [filter]);

  useEffect(() => {
    if (selectedItem) {
      setEditedMessage(selectedItem.final_message || '');
    }
  }, [selectedItem]);

  const fetchApprovalItems = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('campaign_targets')
        .select(`
          id,
          campaign_id,
          connection_id,
          final_message,
          approval_status,
          created_at,
          campaigns!inner(name),
          connections!inner(full_name, company, title, profile_url),
          ai_personalization_queue!inner(
            first_line,
            midline,
            persona,
            confidence_score
          )
        `)
        .not('ai_personalization_queue', 'is', null)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('approval_status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const formattedItems = data?.map(item => ({
        id: item.id,
        campaign_id: item.campaign_id,
        connection_id: item.connection_id,
        campaign_name: item.campaigns.name,
        connection: item.connections,
        personalization: item.ai_personalization_queue,
        final_message: item.final_message,
        approval_status: item.approval_status,
        created_at: item.created_at,
      })) || [];

      setItems(formattedItems);
    } catch (error) {
      console.error('Error fetching approval items:', error);
      toast({
        title: 'Error',
        description: 'Failed to load approval queue',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (id: string, status: 'approved' | 'rejected', message?: string) => {
    setProcessingId(id);
    try {
      const updates: any = { approval_status: status };
      if (message) {
        updates.final_message = message;
      }

      const { error } = await supabase
        .from('campaign_targets')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: status === 'approved' ? 'Message Approved' : 'Message Rejected',
        description: status === 'approved'
          ? 'The message has been approved and queued for sending'
          : 'The message has been rejected',
      });

      // Update local state
      setItems(prev => prev.map(item =>
        item.id === id
          ? { ...item, approval_status: status, final_message: message || item.final_message }
          : item
      ));

      // Move to next item if in pending filter
      if (filter === 'pending') {
        const currentIndex = items.findIndex(item => item.id === id);
        const nextPending = items.find((item, idx) =>
          idx > currentIndex && item.approval_status === 'pending'
        );
        if (nextPending) {
          setSelectedItem(nextPending);
        }
      }
    } catch (error) {
      console.error('Error updating approval:', error);
      toast({
        title: 'Error',
        description: 'Failed to update approval status',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRegenerateAI = async (item: ApprovalItem) => {
    setProcessingId(item.id);
    try {
      const { error } = await supabase
        .from('ai_personalization_queue')
        .update({
          status: 'pending',
          attempts: 0,
          last_error: null
        })
        .eq('connection_id', item.connection_id);

      if (error) throw error;

      toast({
        title: 'Regeneration Requested',
        description: 'AI will regenerate the personalization shortly',
      });

      // Refresh after a delay
      setTimeout(() => fetchApprovalItems(), 3000);
    } catch (error) {
      console.error('Error requesting regeneration:', error);
      toast({
        title: 'Error',
        description: 'Failed to request AI regeneration',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const pendingCount = items.filter(i => i.approval_status === 'pending').length;

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-6">
      {/* Left Panel - Queue List */}
      <Card className="w-96 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Approval Queue
            </span>
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount} pending</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Review and approve AI-generated personalizations
          </CardDescription>
        </CardHeader>
        <div className="px-6 pb-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="approved">Approved</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <ScrollArea className="flex-1 px-6">
          <div className="space-y-2 pb-4">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedItem?.id === item.id
                    ? 'bg-secondary border-primary'
                    : 'hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="font-medium truncate">{item.connection.full_name}</div>
                  {getStatusBadge(item.approval_status)}
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {item.connection.company || 'Unknown Company'}
                  </div>
                  <div className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    {item.campaign_name}
                  </div>
                  <div className={`flex items-center gap-1 ${getConfidenceColor(item.personalization.confidence_score)}`}>
                    <Brain className="h-3 w-3" />
                    {Math.round(item.personalization.confidence_score * 100)}% confidence
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Middle Panel - Message Preview & Edit */}
      {selectedItem ? (
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>Message Preview</CardTitle>
            <CardDescription>
              Edit and approve the personalized message
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <div className="space-y-4">
              {/* AI Insights */}
              <Alert>
                <Brain className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>AI Confidence:</strong>{' '}
                      <span className={getConfidenceColor(selectedItem.personalization.confidence_score)}>
                        {Math.round(selectedItem.personalization.confidence_score * 100)}%
                      </span>
                    </div>
                    <div>
                      <strong>Opening:</strong> {selectedItem.personalization.first_line}
                    </div>
                    {selectedItem.personalization.midline && (
                      <div>
                        <strong>Context:</strong> {selectedItem.personalization.midline}
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>

              {/* Message Editor */}
              <div className="space-y-2">
                <Label>Final Message</Label>
                <Textarea
                  value={editedMessage}
                  onChange={(e) => setEditedMessage(e.target.value)}
                  className="min-h-[200px]"
                  placeholder="Edit the message here..."
                />
              </div>

              {/* Safety Check */}
              {selectedItem.personalization.confidence_score < 0.6 && (
                <Alert className="border-yellow-500 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription>
                    Low confidence score. Please review carefully before approving.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-auto">
              <Button
                onClick={() => handleApproval(selectedItem.id, 'approved', editedMessage)}
                className="flex-1"
                disabled={processingId === selectedItem.id}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve & Send
              </Button>
              <Button
                onClick={() => handleApproval(selectedItem.id, 'rejected')}
                variant="destructive"
                disabled={processingId === selectedItem.id}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
              <Button
                onClick={() => handleRegenerateAI(selectedItem)}
                variant="outline"
                disabled={processingId === selectedItem.id}
              >
                <RotateCw className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <Brain className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Select a message to review</p>
          </div>
        </Card>
      )}

      {/* Right Panel - Profile Context */}
      {selectedItem && (
        <Card className="w-80">
          <CardHeader>
            <CardTitle>Profile Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <User className="h-4 w-4" />
                  Contact Details
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div>{selectedItem.connection.full_name}</div>
                  <div>{selectedItem.connection.title}</div>
                  <div>{selectedItem.connection.company}</div>
                </div>
              </div>

              {selectedItem.personalization.persona && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                    <Brain className="h-4 w-4" />
                    AI Analysis
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {Object.entries(selectedItem.personalization.persona).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">{key}:</span> {String(value)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 text-sm font-medium mb-1">
                  <Clock className="h-4 w-4" />
                  Timeline
                </div>
                <div className="text-sm text-muted-foreground">
                  Created {new Date(selectedItem.created_at).toLocaleDateString()}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(selectedItem.connection.profile_url, '_blank')}
              >
                View LinkedIn Profile
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}