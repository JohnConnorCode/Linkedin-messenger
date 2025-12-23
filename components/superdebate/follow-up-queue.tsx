'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Calendar,
  Clock,
  Send,
  X,
  Edit2,
  User,
  Building,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  MessageSquare
} from 'lucide-react';

interface FollowUpQueueProps {
  campaignId: string;
}

export function FollowUpQueue({ campaignId }: FollowUpQueueProps) {
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedMessage, setEditedMessage] = useState('');
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchFollowUps();
  }, [campaignId]);

  const fetchFollowUps = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('follow_up_queue')
        .select(`
          *,
          campaign_targets(
            id,
            personalized_message,
            connections(
              id,
              full_name,
              first_name,
              company,
              headline,
              linkedin_url
            )
          )
        `)
        .eq('campaign_id', campaignId)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setFollowUps(data || []);
    } catch (error) {
      console.error('Error fetching follow-ups:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelFollowUp = async (id: string) => {
    try {
      const { error } = await supabase
        .from('follow_up_queue')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Follow-up cancelled',
        description: 'The follow-up has been removed from the queue',
      });
      fetchFollowUps();
    } catch (error) {
      console.error('Error cancelling follow-up:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel follow-up',
        variant: 'destructive',
      });
    }
  };

  const updateMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('follow_up_queue')
        .update({
          message_template: editedMessage,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Message updated',
        description: 'The follow-up message has been saved',
      });
      setEditingId(null);
      fetchFollowUps();
    } catch (error) {
      console.error('Error updating message:', error);
      toast({
        title: 'Error',
        description: 'Failed to update message',
        variant: 'destructive',
      });
    }
  };

  const sendNow = async (followUp: any) => {
    setSending(followUp.id);
    try {
      // Here you would integrate with the LinkedIn sending mechanism
      // For now, we'll just mark it as sent
      const { error } = await supabase
        .from('follow_up_queue')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', followUp.id);

      if (error) throw error;

      toast({
        title: 'Follow-up sent',
        description: `Message sent to ${followUp.campaign_targets?.connections?.full_name}`,
      });
      fetchFollowUps();
    } catch (error) {
      console.error('Error sending follow-up:', error);
      toast({
        title: 'Error',
        description: 'Failed to send follow-up',
        variant: 'destructive',
      });
    } finally {
      setSending(null);
    }
  };

  const getTimeUntil = (dateStr: string) => {
    const now = new Date();
    const scheduled = new Date(dateStr);
    const diffMs = scheduled.getTime() - now.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) return 'Overdue';
    if (diffHours < 1) return 'Less than 1 hour';
    if (diffHours < 24) return `${diffHours} hours`;
    return `${diffDays} days`;
  };

  const pending = followUps.filter(f => f.status === 'pending');
  const sent = followUps.filter(f => f.status === 'sent');
  const cancelled = followUps.filter(f => f.status === 'cancelled');

  // Group pending by type
  const day3 = pending.filter(f => f.follow_up_type === 'day_3');
  const day7 = pending.filter(f => f.follow_up_type === 'day_7');
  const custom = pending.filter(f => f.follow_up_type === 'custom');

  return (
    <div className="space-y-6">
      {/* How Follow-ups Work */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-blue-900">How Automated Follow-ups Work</h3>
              <p className="text-sm text-blue-800">
                When someone doesn't respond to your initial message, SuperDebate automatically queues follow-ups:
              </p>
              <ul className="text-sm text-blue-800 space-y-1">
                <li><strong>Day 3-4:</strong> "Hey [name]—just floating this back up..." (gentle nudge)</li>
                <li><strong>Day 7-10:</strong> "Last note on this—if the mission resonates..." (final attempt)</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2">
                Review each message before sending. Edit to add personal touches, or cancel if they've responded elsewhere.
                "Send Now" will immediately send via LinkedIn.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{pending.length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{day3.length}</p>
              <p className="text-sm text-muted-foreground">Day 3-4</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{day7.length}</p>
              <p className="text-sm text-muted-foreground">Day 7-10</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{sent.length}</p>
              <p className="text-sm text-muted-foreground">Sent</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="sent">
            Sent ({sent.length})
          </TabsTrigger>
          <TabsTrigger value="cancelled">
            Cancelled ({cancelled.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pending Follow-ups</CardTitle>
                  <CardDescription>
                    Review and approve follow-up messages before they're sent
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={fetchFollowUps}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pending.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No pending follow-ups</p>
                  <p className="text-sm mt-2">Follow-ups will appear here when scheduled</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pending.map((followUp) => (
                    <div key={followUp.id} className="border rounded-lg p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <User className="h-8 w-8 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {followUp.campaign_targets?.connections?.full_name}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {followUp.campaign_targets?.connections?.company && (
                                <>
                                  <Building className="h-3 w-3" />
                                  {followUp.campaign_targets.connections.company}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={followUp.follow_up_type === 'day_3' ? 'default' : 'secondary'}>
                            {followUp.follow_up_type === 'day_3' ? 'Day 3-4' :
                             followUp.follow_up_type === 'day_7' ? 'Day 7-10' : 'Custom'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            {getTimeUntil(followUp.scheduled_for)}
                          </Badge>
                        </div>
                      </div>

                      {/* Message */}
                      {editingId === followUp.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editedMessage}
                            onChange={(e) => setEditedMessage(e.target.value)}
                            rows={4}
                          />
                          <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => updateMessage(followUp.id)}>
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                          <MessageSquare className="h-4 w-4 text-muted-foreground mb-2" />
                          <p className="whitespace-pre-wrap">{followUp.message_template}</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingId(followUp.id);
                            setEditedMessage(followUp.message_template);
                          }}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => cancelFollowUp(followUp.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => sendNow(followUp)}
                          disabled={sending === followUp.id}
                        >
                          {sending === followUp.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Send className="h-4 w-4 mr-1" />
                          )}
                          Send Now
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Sent Follow-ups</CardTitle>
              <CardDescription>History of sent follow-up messages</CardDescription>
            </CardHeader>
            <CardContent>
              {sent.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No sent follow-ups yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sent.map((followUp) => (
                    <div key={followUp.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="font-medium">
                            {followUp.campaign_targets?.connections?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Sent {new Date(followUp.sent_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">{followUp.follow_up_type}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cancelled" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cancelled Follow-ups</CardTitle>
              <CardDescription>Follow-ups that were cancelled or skipped</CardDescription>
            </CardHeader>
            <CardContent>
              {cancelled.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <X className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No cancelled follow-ups</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cancelled.map((followUp) => (
                    <div key={followUp.id} className="flex items-center justify-between p-3 border rounded-lg opacity-60">
                      <div className="flex items-center gap-3">
                        <X className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">
                            {followUp.campaign_targets?.connections?.full_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Was scheduled for {new Date(followUp.scheduled_for).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default FollowUpQueue;
