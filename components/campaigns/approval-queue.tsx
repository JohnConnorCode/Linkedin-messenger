'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { renderTemplate } from '@/lib/templating';
import { Check, X, ChevronLeft, ChevronRight, User, Building, Briefcase, MapPin } from 'lucide-react';

interface ApprovalQueueProps {
  campaignId: string;
  template: any;
  targets: any[];
}

export function ApprovalQueue({ campaignId, template, targets }: ApprovalQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [editedMessages, setEditedMessages] = useState<Record<string, string>>({});
  const [processingAction, setProcessingAction] = useState<'approve' | 'reject' | null>(null);
  const { toast } = useToast();
  const supabase = createClient();

  const currentTarget = targets[currentIndex];
  const connection = currentTarget?.connections;

  // Build the data for template rendering
  const templateData = {
    first_name: connection?.first_name || '',
    last_name: connection?.last_name || '',
    full_name: connection?.full_name || '',
    company: connection?.company || '',
    headline: connection?.headline || '',
    location: connection?.location || '',
    sender_first_name: 'Your Name', // This should come from user profile
  };

  const getPersonalizedMessage = () => {
    if (editedMessages[currentTarget.id]) {
      return editedMessages[currentTarget.id];
    }
    return currentTarget.personalized_body || renderTemplate(template.body, templateData);
  };

  const handleApprove = async () => {
    setProcessingAction('approve');

    try {
      const personalizedBody = getPersonalizedMessage();

      // Update target status
      const { error: updateError } = await supabase
        .from('campaign_targets')
        .update({
          approval_status: 'approved',
          personalized_body: personalizedBody,
        } as any)
        .eq('id', currentTarget.id);

      if (updateError) throw updateError;

      // Create task in queue
      const { error: taskError } = await supabase
        .from('task_queue')
        .insert({
          campaign_id: campaignId,
          target_id: currentTarget.id,
          status: 'queued',
        } as any);

      if (taskError) throw taskError;

      toast({
        title: 'Message approved',
        description: 'The message has been added to the send queue',
      });

      // Move to next
      if (currentIndex < targets.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast({
          title: 'All messages reviewed',
          description: 'You have reviewed all pending messages',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve message',
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async () => {
    setProcessingAction('reject');

    try {
      const { error } = await supabase
        .from('campaign_targets')
        .update({
          approval_status: 'rejected',
          reason: 'Manually rejected during review',
        } as any)
        .eq('id', currentTarget.id);

      if (error) throw error;

      toast({
        title: 'Message rejected',
        description: 'This message will not be sent',
      });

      // Move to next
      if (currentIndex < targets.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to reject message',
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(null);
    }
  };

  const handleBulkApprove = async () => {
    const remaining = targets.slice(currentIndex);
    const confirmed = confirm(`Approve all ${remaining.length} remaining messages?`);

    if (!confirmed) return;

    setProcessingAction('approve');

    try {
      // Approve all remaining targets
      for (const target of remaining) {
        const data = {
          first_name: target.connections?.first_name || '',
          last_name: target.connections?.last_name || '',
          full_name: target.connections?.full_name || '',
          company: target.connections?.company || '',
          headline: target.connections?.headline || '',
          location: target.connections?.location || '',
        };

        const personalizedBody = renderTemplate(template.body, data);

        await supabase
          .from('campaign_targets')
          .update({
            approval_status: 'approved',
            personalized_body: personalizedBody,
          } as any)
          .eq('id', target.id);

        await supabase
          .from('task_queue')
          .insert({
            campaign_id: campaignId,
            target_id: target.id,
            status: 'queued',
          } as any);
      }

      toast({
        title: 'Bulk approval complete',
        description: `${remaining.length} messages approved and queued`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete bulk approval',
        variant: 'destructive',
      });
    } finally {
      setProcessingAction(null);
    }
  };

  if (!currentTarget) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No more messages to review</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Connection Details */}
      <Card>
        <CardHeader>
          <CardTitle>Recipient Details</CardTitle>
          <CardDescription>
            {currentIndex + 1} of {targets.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">{connection?.full_name || 'Unknown'}</h3>
              <p className="text-sm text-muted-foreground">{connection?.headline || 'No headline'}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {connection?.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{connection.company}</span>
              </div>
            )}
            {connection?.location && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span>{connection.location}</span>
              </div>
            )}
            {connection?.tags && connection.tags.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {connection.tags.map((tag: string) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {connection?.linkedin_url && (
            <a
              href={connection.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              View LinkedIn Profile →
            </a>
          )}
        </CardContent>
      </Card>

      {/* Message Preview and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Message Preview</CardTitle>
          <CardDescription>
            Review and edit the personalized message
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="message">Message Content</Label>
            <Textarea
              id="message"
              value={getPersonalizedMessage()}
              onChange={(e) => setEditedMessages({
                ...editedMessages,
                [currentTarget.id]: e.target.value
              })}
              className="mt-2 min-h-[200px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Character count: {getPersonalizedMessage().length}
              {getPersonalizedMessage().length > 2500 && (
                <span className="text-destructive"> (exceeds limit)</span>
              )}
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleReject}
              variant="destructive"
              disabled={processingAction !== null}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processingAction !== null || getPersonalizedMessage().length > 2500}
              className="flex-1"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkApprove}
              disabled={processingAction !== null}
            >
              Approve All Remaining
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentIndex(Math.min(targets.length - 1, currentIndex + 1))}
              disabled={currentIndex === targets.length - 1}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}