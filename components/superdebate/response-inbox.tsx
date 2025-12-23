'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Send,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  Info,
  UserPlus,
  Calendar,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Copy,
  Trophy,
  DollarSign,
  Users,
  Handshake,
  X,
} from 'lucide-react';
import { LOST_REASONS } from '@/lib/superdebate';

interface ResponseInboxProps {
  campaignId: string;
}

const RESPONSE_TYPES = {
  positive: { label: 'Positive', icon: ThumbsUp, color: 'bg-green-500', description: 'Wants to connect/chat' },
  send_more_info: { label: 'Send Info', icon: Info, color: 'bg-blue-500', description: 'Wants to see deck/details' },
  busy: { label: 'Busy', icon: Clock, color: 'bg-yellow-500', description: 'Not now but maybe later' },
  intro_offered: { label: 'Intro Offered', icon: UserPlus, color: 'bg-purple-500', description: 'Can introduce to someone' },
  hard_no: { label: 'Not Interested', icon: ThumbsDown, color: 'bg-red-500', description: 'Declined' },
  no_response: { label: 'No Response', icon: Clock, color: 'bg-gray-400', description: 'No reply yet' },
};

// Outcome types for tracking wins
const OUTCOME_TYPES = {
  funded: {
    label: 'Funded',
    icon: DollarSign,
    description: 'Made a financial contribution',
    showValue: true,
  },
  ambassador_signup: {
    label: 'Ambassador Signup',
    icon: Users,
    description: 'Agreed to be an ambassador',
    showValue: false,
  },
  meeting_held: {
    label: 'Meeting Held',
    icon: Handshake,
    description: 'Had a meeting/call',
    showValue: false,
  },
  intro_made: {
    label: 'Intro Made',
    icon: UserPlus,
    description: 'Made an introduction',
    showValue: false,
  },
  other: {
    label: 'Other Win',
    icon: Trophy,
    description: 'Other successful outcome',
    showValue: true,
  },
};

export function ResponseInbox({ campaignId }: ResponseInboxProps) {
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTarget, setSelectedTarget] = useState<any>(null);
  const [classifying, setClassifying] = useState(false);
  const [responseText, setResponseText] = useState('');
  const [suggestedReply, setSuggestedReply] = useState('');

  // Outcome tracking state
  const [outcomeDialogOpen, setOutcomeDialogOpen] = useState(false);
  const [outcomeTarget, setOutcomeTarget] = useState<any>(null);
  const [outcomeType, setOutcomeType] = useState<string>('');
  const [outcomeValue, setOutcomeValue] = useState<string>('');
  const [savingOutcome, setSavingOutcome] = useState(false);

  // Lost/disqualification tracking state
  const [lostDialogOpen, setLostDialogOpen] = useState(false);
  const [lostTarget, setLostTarget] = useState<any>(null);
  const [lostReason, setLostReason] = useState<string>('');
  const [lostNotes, setLostNotes] = useState<string>('');
  const [savingLost, setSavingLost] = useState(false);

  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchTargets();
  }, [campaignId]);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('campaign_targets')
        .select(`
          *,
          connections(
            id,
            full_name,
            first_name,
            company,
            headline,
            linkedin_url
          )
        `)
        .eq('campaign_id', campaignId)
        .not('sent_at', 'is', null)
        .order('responded_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      setTargets(data || []);
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const classifyResponse = async () => {
    if (!selectedTarget || !responseText.trim()) return;

    setClassifying(true);
    try {
      const response = await fetch('/api/superdebate/classify-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responseText: responseText,
          targetId: selectedTarget.id,
          campaignId: campaignId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Response classified',
          description: `Classified as: ${result.classification.type}`,
        });
        setSuggestedReply(result.classification.suggestedReply);
        fetchTargets();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error classifying response:', error);
      toast({
        title: 'Error',
        description: 'Failed to classify response',
        variant: 'destructive',
      });
    } finally {
      setClassifying(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Reply copied to clipboard',
    });
  };

  // Open outcome dialog
  const openOutcomeDialog = (target: any) => {
    setOutcomeTarget(target);
    setOutcomeType('');
    setOutcomeValue('');
    setOutcomeDialogOpen(true);
  };

  // Save outcome
  const saveOutcome = async () => {
    if (!outcomeTarget || !outcomeType) return;

    setSavingOutcome(true);
    try {
      // Determine conversion source based on follow-up count
      let conversionSource = 'first_message';
      if (outcomeTarget.follow_up_count > 0) {
        if (outcomeTarget.follow_up_count === 1) {
          conversionSource = 'day_3';
        } else {
          conversionSource = 'day_7';
        }
      }

      const { error } = await supabase
        .from('campaign_targets')
        .update({
          conversation_stage: 'closed_won',
          closed_won_type: outcomeType,
          closed_won_value: outcomeValue ? parseFloat(outcomeValue) : null,
          conversion_source: conversionSource,
          updated_at: new Date().toISOString(),
        })
        .eq('id', outcomeTarget.id);

      if (error) throw error;

      toast({
        title: 'Outcome recorded',
        description: `Marked as ${OUTCOME_TYPES[outcomeType as keyof typeof OUTCOME_TYPES]?.label}`,
      });

      setOutcomeDialogOpen(false);
      fetchTargets();
    } catch (error) {
      console.error('Error saving outcome:', error);
      toast({
        title: 'Error',
        description: 'Failed to save outcome',
        variant: 'destructive',
      });
    } finally {
      setSavingOutcome(false);
    }
  };

  // Open lost dialog
  const openLostDialog = (target: any) => {
    setLostTarget(target);
    setLostReason('');
    setLostNotes('');
    setLostDialogOpen(true);
  };

  // Save lost with reason
  const saveLostReason = async () => {
    if (!lostTarget || !lostReason) return;

    setSavingLost(true);
    try {
      const { error } = await supabase
        .from('campaign_targets')
        .update({
          conversation_stage: 'closed_lost',
          closed_lost_reason: lostReason,
          metadata: {
            ...(lostTarget.metadata || {}),
            lost_notes: lostNotes || undefined,
            lost_at: new Date().toISOString(),
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', lostTarget.id);

      if (error) throw error;

      toast({
        title: 'Marked as lost',
        description: `Reason: ${lostReason}`,
      });

      setLostDialogOpen(false);
      setLostTarget(null);
      fetchTargets();
    } catch (error) {
      console.error('Error marking as lost:', error);
      toast({
        title: 'Error',
        description: 'Failed to update status',
        variant: 'destructive',
      });
    } finally {
      setSavingLost(false);
    }
  };

  // Quick mark as lost (for programmatic use)
  const markAsLost = async (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (target) {
      openLostDialog(target);
    }
  };

  // Group by response type
  const needsAction = targets.filter(t =>
    t.response_type === 'positive' ||
    t.response_type === 'intro_offered' ||
    t.response_type === 'send_more_info'
  );
  const waiting = targets.filter(t => !t.response_type || t.response_type === 'no_response');
  const closed = targets.filter(t =>
    t.response_type === 'hard_no' ||
    t.conversation_stage === 'closed_won' ||
    t.conversation_stage === 'closed_lost'
  );

  // Stats
  const closedWon = targets.filter(t => t.conversation_stage === 'closed_won');
  const totalWonValue = closedWon.reduce((sum, t) => sum + (t.closed_won_value || 0), 0);

  const stats = {
    total: targets.length,
    responded: targets.filter(t => t.responded_at).length,
    positive: targets.filter(t => t.response_type === 'positive').length,
    introOffered: targets.filter(t => t.response_type === 'intro_offered').length,
    needsInfo: targets.filter(t => t.response_type === 'send_more_info').length,
    noResponse: targets.filter(t => !t.response_type || t.response_type === 'no_response').length,
    won: closedWon.length,
    wonValue: totalWonValue,
  };

  // Audience breakdown stats
  const audienceTypes = ['funder', 'ambassador', 'debater', 'friend'] as const;
  const audienceStats = audienceTypes.map(type => {
    const audienceTargets = targets.filter(t => t.audience_type === type);
    const audienceResponded = audienceTargets.filter(t => t.responded_at).length;
    const audienceWon = audienceTargets.filter(t => t.conversation_stage === 'closed_won').length;
    const audienceValue = audienceTargets
      .filter(t => t.conversation_stage === 'closed_won')
      .reduce((sum, t) => sum + (t.closed_won_value || 0), 0);

    return {
      type,
      total: audienceTargets.length,
      responded: audienceResponded,
      won: audienceWon,
      value: audienceValue,
      responseRate: audienceTargets.length > 0 ? Math.round((audienceResponded / audienceTargets.length) * 100) : 0,
      conversionRate: audienceResponded > 0 ? Math.round((audienceWon / audienceResponded) * 100) : 0,
    };
  });

  const responseRate = stats.total > 0 ? Math.round((stats.responded / stats.total) * 100) : 0;
  const conversionRate = stats.responded > 0 ? Math.round((stats.won / stats.responded) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* How Response Classification Works */}
      <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-green-900">How Response Classification Works</h3>
              <p className="text-sm text-green-800">
                When someone replies, paste their message here to get AI-powered classification and suggested replies:
              </p>
              <ul className="text-sm text-green-800 space-y-1">
                <li><strong>Positive:</strong> They want to connect—schedule a call or send calendar link</li>
                <li><strong>Send Info:</strong> They want to see the deck—send materials and follow up</li>
                <li><strong>Busy:</strong> Not now but maybe later—queue a follow-up for 2-4 weeks</li>
                <li><strong>Intro Offered:</strong> They can introduce you—thank them and ask for the intro</li>
                <li><strong>Not Interested:</strong> Move on, but thank them for their time</li>
              </ul>
              <p className="text-xs text-green-600 mt-2">
                Select a contact from the list, paste their response, and click "Classify" to get a suggested reply you can copy.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Contacted</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{responseRate}%</p>
          <p className="text-sm text-muted-foreground">Response Rate</p>
        </Card>
        <Card className="p-4 border-amber-200 bg-amber-50">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-600" />
            <p className="text-2xl font-bold text-amber-600">{stats.won}</p>
          </div>
          <p className="text-sm text-muted-foreground">Won ({conversionRate}% conv.)</p>
        </Card>
        <Card className="p-4 border-green-200 bg-green-50">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <p className="text-2xl font-bold text-green-600">
              {stats.wonValue > 0 ? `$${stats.wonValue.toLocaleString()}` : '$0'}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">Won Value</p>
        </Card>
      </div>

      {/* Response breakdown */}
      <div className="grid grid-cols-5 gap-4">
        <Card className="p-4 border-green-200">
          <p className="text-2xl font-bold text-green-600">{stats.positive}</p>
          <p className="text-sm text-muted-foreground">Positive</p>
        </Card>
        <Card className="p-4 border-purple-200">
          <p className="text-2xl font-bold text-purple-600">{stats.introOffered}</p>
          <p className="text-sm text-muted-foreground">Intros Offered</p>
        </Card>
        <Card className="p-4 border-blue-200">
          <p className="text-2xl font-bold text-blue-600">{stats.needsInfo}</p>
          <p className="text-sm text-muted-foreground">Want Info</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-gray-400">{stats.noResponse}</p>
          <p className="text-sm text-muted-foreground">Awaiting</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-gray-400">{closed.length}</p>
          <p className="text-sm text-muted-foreground">Closed</p>
        </Card>
      </div>

      {/* Audience Funnel Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Funnel by Audience Type
          </CardTitle>
          <CardDescription>
            See which audience types are converting best
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Audience</th>
                  <th className="text-center py-2 font-medium">Contacted</th>
                  <th className="text-center py-2 font-medium">Responded</th>
                  <th className="text-center py-2 font-medium">Response %</th>
                  <th className="text-center py-2 font-medium">Won</th>
                  <th className="text-center py-2 font-medium">Conv. %</th>
                  <th className="text-right py-2 font-medium">Value</th>
                </tr>
              </thead>
              <tbody>
                {audienceStats.map(({ type, total, responded, won, value, responseRate: rr, conversionRate: cr }) => (
                  <tr key={type} className="border-b last:border-0">
                    <td className="py-2 capitalize font-medium">{type}</td>
                    <td className="py-2 text-center">{total}</td>
                    <td className="py-2 text-center">{responded}</td>
                    <td className="py-2 text-center">
                      <span className={rr >= 20 ? 'text-green-600 font-medium' : rr >= 10 ? 'text-yellow-600' : 'text-red-600'}>
                        {rr}%
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className={won > 0 ? 'text-amber-600 font-bold' : ''}>
                        {won}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <span className={cr >= 15 ? 'text-green-600 font-medium' : cr >= 5 ? 'text-yellow-600' : total > 0 ? 'text-red-600' : ''}>
                        {cr}%
                      </span>
                    </td>
                    <td className="py-2 text-right">
                      {value > 0 ? (
                        <span className="text-green-600 font-medium">${value.toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                ))}
                {/* Totals row */}
                <tr className="bg-muted/50 font-medium">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-center">{stats.total}</td>
                  <td className="py-2 text-center">{stats.responded}</td>
                  <td className="py-2 text-center">{responseRate}%</td>
                  <td className="py-2 text-center text-amber-600">{stats.won}</td>
                  <td className="py-2 text-center">{conversionRate}%</td>
                  <td className="py-2 text-right text-green-600">
                    {stats.wonValue > 0 ? `$${stats.wonValue.toLocaleString()}` : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {audienceStats.some(a => a.total > 0 && a.conversionRate === 0) && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              Some audience types have 0% conversion. Consider adjusting messaging or targeting.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-3 gap-6">
        {/* Response List */}
        <div className="col-span-2">
          <Tabs defaultValue="action">
            <TabsList>
              <TabsTrigger value="action" className="gap-2">
                <AlertCircle className="h-4 w-4" />
                Needs Action ({needsAction.length})
              </TabsTrigger>
              <TabsTrigger value="waiting" className="gap-2">
                <Clock className="h-4 w-4" />
                Waiting ({waiting.length})
              </TabsTrigger>
              <TabsTrigger value="closed" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Closed ({closed.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="action" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Needs Your Attention</CardTitle>
                  <CardDescription>
                    Positive responses, intro offers, and info requests
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {needsAction.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <ThumbsUp className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No responses needing action</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {needsAction.map((target) => (
                        <TargetRow
                          key={target.id}
                          target={target}
                          selected={selectedTarget?.id === target.id}
                          onClick={() => setSelectedTarget(target)}
                          onMarkWon={openOutcomeDialog}
                          onMarkLost={markAsLost}
                          showActions={true}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="waiting" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Awaiting Response</CardTitle>
                  <CardDescription>
                    Messages sent, waiting for replies
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {waiting.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No pending responses</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {waiting.map((target) => (
                        <TargetRow
                          key={target.id}
                          target={target}
                          selected={selectedTarget?.id === target.id}
                          onClick={() => setSelectedTarget(target)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="closed" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Closed</CardTitle>
                  <CardDescription>
                    Conversations that have concluded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {closed.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p>No closed conversations</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {closed.map((target) => (
                        <TargetRow
                          key={target.id}
                          target={target}
                          selected={selectedTarget?.id === target.id}
                          onClick={() => setSelectedTarget(target)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Classification Panel */}
        <div>
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Classify Response
              </CardTitle>
              <CardDescription>
                Paste a response to classify it and get a suggested reply
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedTarget ? (
                <>
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <User className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{selectedTarget.connections?.full_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedTarget.connections?.company}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Their Response</label>
                    <Textarea
                      placeholder="Paste the response you received..."
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      rows={4}
                      className="mt-1"
                    />
                  </div>

                  <Button
                    onClick={classifyResponse}
                    disabled={classifying || !responseText.trim()}
                    className="w-full"
                  >
                    {classifying ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    Classify & Get Reply
                  </Button>

                  {suggestedReply && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Suggested Reply</label>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm whitespace-pre-wrap">{suggestedReply}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(suggestedReply)}
                          className="flex-1"
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>
                        {selectedTarget.connections?.linkedin_url && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(selectedTarget.connections.linkedin_url, '_blank')}
                            className="flex-1"
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            LinkedIn
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Select a contact to classify their response</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Outcome Dialog */}
      <Dialog open={outcomeDialogOpen} onOpenChange={setOutcomeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Mark as Won
            </DialogTitle>
            <DialogDescription>
              Record the successful outcome for {outcomeTarget?.connections?.full_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Outcome Type</label>
              <Select value={outcomeType} onValueChange={setOutcomeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome type..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OUTCOME_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <config.icon className="h-4 w-4" />
                        <span>{config.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {outcomeType && OUTCOME_TYPES[outcomeType as keyof typeof OUTCOME_TYPES]?.showValue && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Value (optional)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Enter value..."
                    value={outcomeValue}
                    onChange={(e) => setOutcomeValue(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Record the financial value of this outcome for ROI tracking
                </p>
              </div>
            )}

            {outcomeType && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {OUTCOME_TYPES[outcomeType as keyof typeof OUTCOME_TYPES]?.description}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOutcomeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveOutcome}
              disabled={!outcomeType || savingOutcome}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {savingOutcome ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trophy className="h-4 w-4 mr-2" />
              )}
              Save Outcome
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lost/Disqualification Dialog */}
      <Dialog open={lostDialogOpen} onOpenChange={setLostDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              Mark as Lost
            </DialogTitle>
            <DialogDescription>
              Record why {lostTarget?.connections?.full_name} didn't convert
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Reason</label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LOST_REASONS).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <span>{config.label}</span>
                        {config.reengageable && (
                          <Badge variant="outline" className="text-xs">
                            Reengageable
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {lostReason && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  {LOST_REASONS[lostReason as keyof typeof LOST_REASONS]?.description}
                </p>
                {(() => {
                  const reason = LOST_REASONS[lostReason as keyof typeof LOST_REASONS];
                  if (reason?.reengageable && 'reengageAfterDays' in reason) {
                    return (
                      <p className="text-xs text-blue-600 mt-1">
                        Re-engage in {reason.reengageAfterDays} days
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Any additional context..."
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLostDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={saveLostReason}
              disabled={!lostReason || savingLost}
              variant="destructive"
            >
              {savingLost ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <X className="h-4 w-4 mr-2" />
              )}
              Mark as Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TargetRowProps {
  target: any;
  selected: boolean;
  onClick: () => void;
  onMarkWon?: (target: any) => void;
  onMarkLost?: (targetId: string) => void;
  showActions?: boolean;
}

function TargetRow({ target, selected, onClick, onMarkWon, onMarkLost, showActions }: TargetRowProps) {
  const responseConfig = target.response_type ? RESPONSE_TYPES[target.response_type as keyof typeof RESPONSE_TYPES] : null;
  const Icon = responseConfig?.icon || Clock;
  const isWon = target.conversation_stage === 'closed_won';
  const isLost = target.conversation_stage === 'closed_lost';
  const outcomeConfig = target.closed_won_type ? OUTCOME_TYPES[target.closed_won_type as keyof typeof OUTCOME_TYPES] : null;

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors
        ${selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'}
        ${isWon ? 'border-amber-200 bg-amber-50' : ''}
        ${isLost ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-full ${isWon ? 'bg-amber-500' : responseConfig?.color || 'bg-gray-200'}`}>
          {isWon ? (
            <Trophy className="h-4 w-4 text-white" />
          ) : (
            <Icon className="h-4 w-4 text-white" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{target.connections?.full_name}</p>
            {isWon && outcomeConfig && (
              <Badge className="bg-amber-500 text-white text-xs">
                {outcomeConfig.label}
              </Badge>
            )}
            {isWon && target.closed_won_value > 0 && (
              <Badge variant="outline" className="text-green-600 text-xs">
                ${target.closed_won_value.toLocaleString()}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {target.connections?.company && (
              <>
                <Building className="h-3 w-3" />
                {target.connections.company}
              </>
            )}
            {target.sent_at && (
              <span>• Sent {new Date(target.sent_at).toLocaleDateString()}</span>
            )}
            {target.conversion_source && (
              <span className="text-xs text-muted-foreground">• via {target.conversion_source.replace('_', ' ')}</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showActions && !isWon && !isLost && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              onClick={(e) => {
                e.stopPropagation();
                onMarkWon?.(target);
              }}
            >
              <Trophy className="h-4 w-4 mr-1" />
              Won
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-gray-600"
              onClick={(e) => {
                e.stopPropagation();
                onMarkLost?.(target.id);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        )}
        {responseConfig && !isWon && (
          <Badge className={`${responseConfig.color} text-white`}>
            {responseConfig.label}
          </Badge>
        )}
        {isLost && (
          <Badge variant="outline" className="text-gray-500">
            Lost
          </Badge>
        )}
      </div>
    </div>
  );
}

export default ResponseInbox;
