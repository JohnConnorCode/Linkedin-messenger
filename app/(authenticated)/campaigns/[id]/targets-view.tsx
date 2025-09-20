'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImportDialog } from '@/components/connections/import-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Upload,
  Brain,
  User,
  CheckCircle,
  Clock,
  XCircle,
  Building,
  AlertTriangle
} from 'lucide-react';

interface Target {
  id: string;
  connection: {
    full_name: string;
    company: string;
    headline: string;
  };
  approval_status: string;
  ai_personalization?: {
    confidence_score: number;
    status: string;
  };
}

export function TargetsView({ campaignId }: { campaignId: string }) {
  const [targets, setTargets] = useState<Target[]>([]);
  const [campaign, setCampaign] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, [campaignId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Get campaign details
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      setCampaign(campaignData);

      // Get targets with connections and AI status
      const { data: targetsData } = await supabase
        .from('campaign_targets')
        .select(`
          id,
          approval_status,
          connections!inner(full_name, company, headline),
          ai_personalization_queue(confidence_score, status)
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (targetsData) {
        const formattedTargets = targetsData.map(t => ({
          id: t.id,
          connection: t.connections,
          approval_status: t.approval_status,
          ai_personalization: t.ai_personalization_queue?.[0],
        }));
        setTargets(formattedTargets);
      }
    } catch (error) {
      console.error('Error fetching targets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'sent':
        return <Badge className="bg-blue-500"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getAIStatusBadge = (ai: any) => {
    if (!ai) return null;

    if (ai.status === 'completed') {
      const confidence = Math.round(ai.confidence_score * 100);
      const variant = confidence >= 80 ? 'default' : confidence >= 60 ? 'secondary' : 'destructive';
      return (
        <Badge variant={variant as any}>
          <Brain className="h-3 w-3 mr-1" />
          {confidence}% confidence
        </Badge>
      );
    }

    if (ai.status === 'pending') {
      return <Badge variant="outline"><Brain className="h-3 w-3 mr-1" />Processing...</Badge>;
    }

    return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />AI Failed</Badge>;
  };

  const stats = {
    total: targets.length,
    approved: targets.filter(t => t.approval_status === 'approved').length,
    pending: targets.filter(t => t.approval_status === 'pending').length,
    sent: targets.filter(t => t.approval_status === 'sent').length,
    aiProcessed: targets.filter(t => t.ai_personalization?.status === 'completed').length,
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Loading targets...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Campaign Targets</CardTitle>
              <CardDescription>
                {stats.total} total connections targeted in this campaign
              </CardDescription>
            </div>
            <Button onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import More Targets
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Overview */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.sent}</div>
              <p className="text-xs text-muted-foreground">Sent</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.aiProcessed}</div>
              <p className="text-xs text-muted-foreground">AI Processed</p>
            </div>
          </div>

          {campaign?.ai_enabled && (
            <Alert className="mb-4">
              <Brain className="h-4 w-4" />
              <AlertDescription>
                AI personalization is enabled. GPT-5 Nano will analyze each profile and create personalized messages.
              </AlertDescription>
            </Alert>
          )}

          {/* Targets List */}
          <div className="space-y-2">
            {targets.map((target) => (
              <div key={target.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <User className="h-8 w-8 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{target.connection.full_name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      {target.connection.company && (
                        <>
                          <Building className="h-3 w-3" />
                          {target.connection.company}
                        </>
                      )}
                      {target.connection.headline && (
                        <span className="text-xs">• {target.connection.headline}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {campaign?.ai_enabled && getAIStatusBadge(target.ai_personalization)}
                  {getStatusBadge(target.approval_status)}
                </div>
              </div>
            ))}
          </div>

          {targets.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No targets added yet</p>
              <p className="text-sm mt-2">Import connections to start your campaign</p>
            </div>
          )}
        </CardContent>
      </Card>

      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        campaignId={campaignId}
        aiEnabled={campaign?.ai_enabled}
      />
    </div>
  );
}