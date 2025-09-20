'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  Building,
  Briefcase,
  Brain
} from 'lucide-react';

interface AIPersonalization {
  id: string;
  connectionId: string;
  connection: {
    name: string;
    headline: string;
    company: string;
    title: string;
    linkedin_url: string;
  };
  firstLine: string;
  midline: string;
  persona: {
    label: string;
    confidence: number;
    signals: string[];
  };
  summary: string;
  confidence: number;
  riskFlags: string[];
  status: 'pending' | 'approved' | 'rejected' | 'regenerating';
  finalMessage?: string;
}

export default function ApprovalQueuePage({ params }: { params: { id: string } }) {
  const [targets, setTargets] = useState<AIPersonalization[]>([]);
  const [selectedTarget, setSelectedTarget] = useState<AIPersonalization | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState<string | null>(null);
  const [aiProgress, setAiProgress] = useState(0);
  const [template, setTemplate] = useState('');
  const supabase = createClient();

  useEffect(() => {
    loadCampaignTargets();
  }, [params.id]);

  const loadCampaignTargets = async () => {
    setLoading(true);

    // Load campaign and template
    const { data: campaign } = await supabase
      .from('campaigns')
      .select(`
        *,
        message_templates(*)
      `)
      .eq('id', params.id)
      .single();

    if (campaign) {
      setTemplate(campaign.message_templates?.body || '');
    }

    // Load targets with AI personalizations
    const { data, error } = await supabase
      .from('campaign_targets')
      .select(`
        *,
        connections(*),
        profile_ai_summaries(*)
      `)
      .eq('campaign_id', params.id)
      .eq('status', 'pending');

    if (data) {
      const formatted = data.map(target => ({
        id: target.id,
        connectionId: target.connection_id,
        connection: target.connections,
        firstLine: target.profile_ai_summaries?.[0]?.first_line || '',
        midline: target.profile_ai_summaries?.[0]?.midline || '',
        persona: target.profile_ai_summaries?.[0]?.persona || { label: 'Unknown', confidence: 0, signals: [] },
        summary: target.profile_ai_summaries?.[0]?.summary || '',
        confidence: target.profile_ai_summaries?.[0]?.confidence_score || 0,
        riskFlags: target.profile_ai_summaries?.[0]?.risk_flags || [],
        status: 'pending' as const,
        finalMessage: buildFinalMessage(
          template,
          target.profile_ai_summaries?.[0]?.first_line,
          target.profile_ai_summaries?.[0]?.midline,
          target.connections
        )
      }));

      setTargets(formatted);
      if (formatted.length > 0) {
        setSelectedTarget(formatted[0]);
      }
    }

    setLoading(false);
  };

  const buildFinalMessage = (template: string, firstLine?: string, midline?: string, connection?: any) => {
    let message = template;

    // Add AI first line
    if (firstLine) {
      message = firstLine + '\n\n' + message;
    }

    // Insert midline
    if (midline) {
      const lines = message.split('\n');
      const midPoint = Math.floor(lines.length / 2);
      lines.splice(midPoint, 0, midline);
      message = lines.join('\n');
    }

    // Replace variables
    if (connection) {
      message = message
        .replace(/{{first_name}}/gi, connection.name?.split(' ')[0] || '')
        .replace(/{{name}}/gi, connection.name || '')
        .replace(/{{company}}/gi, connection.company || '')
        .replace(/{{title}}/gi, connection.title || '')
        .replace(/{{headline}}/gi, connection.headline || '');
    }

    return message;
  };

  const regeneratePersonalization = async (targetId: string) => {
    setRegenerating(targetId);

    const response = await fetch('/api/ai/personalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        connectionId: selectedTarget?.connectionId,
        templateId: template,
        tone: 'professional',
        campaignId: params.id
      })
    });

    const data = await response.json();

    if (data.personalization) {
      // Update target with new personalization
      setTargets(prev => prev.map(t =>
        t.id === targetId
          ? {
              ...t,
              firstLine: data.personalization.firstLine,
              midline: data.personalization.midline,
              persona: data.personalization.persona,
              confidence: data.personalization.confidence,
              riskFlags: data.personalization.riskFlags,
              finalMessage: buildFinalMessage(
                template,
                data.personalization.firstLine,
                data.personalization.midline,
                t.connection
              )
            }
          : t
      ));
    }

    setRegenerating(null);
  };

  const approveTarget = async (targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target) return;

    // Save approved message
    await supabase
      .from('campaign_targets')
      .update({
        personalized_body: target.finalMessage,
        status: 'approved',
        ai_personalized: true,
        ai_confidence: target.confidence
      })
      .eq('id', targetId);

    // Update local state
    setTargets(prev => prev.map(t =>
      t.id === targetId ? { ...t, status: 'approved' as const } : t
    ));

    // Move to next target
    const currentIndex = targets.findIndex(t => t.id === targetId);
    if (currentIndex < targets.length - 1) {
      setSelectedTarget(targets[currentIndex + 1]);
    }
  };

  const rejectTarget = async (targetId: string) => {
    await supabase
      .from('campaign_targets')
      .update({ status: 'rejected' })
      .eq('id', targetId);

    setTargets(prev => prev.map(t =>
      t.id === targetId ? { ...t, status: 'rejected' as const } : t
    ));
  };

  const approveAll = async () => {
    for (const target of targets.filter(t => t.status === 'pending')) {
      await approveTarget(target.id);
    }
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">AI Message Approval Queue</h1>
        <p className="text-muted-foreground">Review and approve AI-personalized messages before sending</p>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span>{targets.filter(t => t.status === 'approved').length} / {targets.length} approved</span>
          </div>
          <Progress
            value={(targets.filter(t => t.status === 'approved').length / targets.length) * 100}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <Button onClick={approveAll} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Approve All Pending
        </Button>
        <Button variant="outline" onClick={loadCampaignTargets}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Target List */}
        <div className="col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Targets</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {targets.map(target => (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTarget(target)}
                    className={`w-full text-left p-3 hover:bg-muted transition-colors ${
                      selectedTarget?.id === target.id ? 'bg-muted' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{target.connection.name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {target.connection.company}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`${getConfidenceBadgeColor(target.confidence)} text-white`}
                        >
                          {Math.round(target.confidence * 100)}%
                        </Badge>
                        {target.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                        {target.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500" />}
                        {target.riskFlags.length > 0 && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        {selectedTarget && (
          <>
            {/* Profile Summary */}
            <div className="col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Profile Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedTarget.connection.name}</h3>
                    <p className="text-muted-foreground">{selectedTarget.connection.headline}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedTarget.connection.company}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedTarget.connection.title}</span>
                    </div>
                  </div>

                  {/* AI Persona */}
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4" />
                      <span className="font-medium">AI Analysis</span>
                    </div>
                    <p className="text-sm mb-2">{selectedTarget.persona.label}</p>
                    {selectedTarget.persona.signals.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {selectedTarget.persona.signals.map((signal, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {signal}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* AI Summary */}
                  {selectedTarget.summary && (
                    <div>
                      <p className="text-sm font-medium mb-1">Summary</p>
                      <p className="text-sm text-muted-foreground">{selectedTarget.summary}</p>
                    </div>
                  )}

                  <a
                    href={selectedTarget.connection.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View LinkedIn Profile →
                  </a>
                </CardContent>
              </Card>
            </div>

            {/* Message Editor */}
            <div className="col-span-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      AI-Enhanced Message
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => regeneratePersonalization(selectedTarget.id)}
                      disabled={regenerating === selectedTarget.id}
                    >
                      {regenerating === selectedTarget.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Regenerate
                        </>
                      )}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="enhanced" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="enhanced">Enhanced</TabsTrigger>
                      <TabsTrigger value="edit">Edit</TabsTrigger>
                      <TabsTrigger value="original">Original</TabsTrigger>
                    </TabsList>

                    <TabsContent value="enhanced" className="space-y-4">
                      {/* Risk Warnings */}
                      {selectedTarget.riskFlags.length > 0 && (
                        <Alert className="border-yellow-200 bg-yellow-50">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            AI detected potential issues: {selectedTarget.riskFlags.join(', ')}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Message Preview */}
                      <div className="p-4 bg-muted rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {selectedTarget.finalMessage}
                        </pre>
                      </div>

                      {/* AI Additions Highlighted */}
                      <div className="space-y-2">
                        {selectedTarget.firstLine && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">AI Opening</p>
                            <div className="p-2 bg-primary/10 rounded border border-primary/20">
                              <p className="text-sm">{selectedTarget.firstLine}</p>
                            </div>
                          </div>
                        )}
                        {selectedTarget.midline && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">AI Context</p>
                            <div className="p-2 bg-primary/10 rounded border border-primary/20">
                              <p className="text-sm">{selectedTarget.midline}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="edit" className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Opening Line</label>
                        <Input
                          value={selectedTarget.firstLine}
                          onChange={(e) => {
                            const newFirstLine = e.target.value;
                            setTargets(prev => prev.map(t =>
                              t.id === selectedTarget.id
                                ? {
                                    ...t,
                                    firstLine: newFirstLine,
                                    finalMessage: buildFinalMessage(template, newFirstLine, t.midline, t.connection)
                                  }
                                : t
                            ));
                            setSelectedTarget(prev => prev ? { ...prev, firstLine: newFirstLine } : null);
                          }}
                          placeholder="Personalized opening..."
                          maxLength={160}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedTarget.firstLine.length}/160 characters
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Context Line</label>
                        <Input
                          value={selectedTarget.midline}
                          onChange={(e) => {
                            const newMidline = e.target.value;
                            setTargets(prev => prev.map(t =>
                              t.id === selectedTarget.id
                                ? {
                                    ...t,
                                    midline: newMidline,
                                    finalMessage: buildFinalMessage(template, t.firstLine, newMidline, t.connection)
                                  }
                                : t
                            ));
                            setSelectedTarget(prev => prev ? { ...prev, midline: newMidline } : null);
                          }}
                          placeholder="Additional context..."
                          maxLength={200}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {selectedTarget.midline.length}/200 characters
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Full Message</label>
                        <Textarea
                          value={selectedTarget.finalMessage}
                          onChange={(e) => {
                            const newMessage = e.target.value;
                            setTargets(prev => prev.map(t =>
                              t.id === selectedTarget.id
                                ? { ...t, finalMessage: newMessage }
                                : t
                            ));
                            setSelectedTarget(prev => prev ? { ...prev, finalMessage: newMessage } : null);
                          }}
                          rows={10}
                          className="font-mono text-sm"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="original">
                      <div className="p-4 bg-muted rounded-lg">
                        <pre className="whitespace-pre-wrap font-sans text-sm">
                          {template}
                        </pre>
                      </div>
                    </TabsContent>
                  </Tabs>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-6">
                    <Button
                      onClick={() => approveTarget(selectedTarget.id)}
                      disabled={selectedTarget.status !== 'pending'}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => rejectTarget(selectedTarget.id)}
                      disabled={selectedTarget.status !== 'pending'}
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}