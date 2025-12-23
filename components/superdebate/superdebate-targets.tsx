'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Building,
  DollarSign,
  Megaphone,
  MessageCircle,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  ThermometerSun,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  ChevronRight,
  Flame,
  Snowflake
} from 'lucide-react';

interface SuperDebateTargetsProps {
  campaignId: string;
}

const AUDIENCE_CONFIG = {
  funder: { icon: DollarSign, color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-100' },
  ambassador: { icon: Megaphone, color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-100' },
  debater: { icon: MessageCircle, color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-100' },
  friend: { icon: UserCheck, color: 'bg-orange-500', textColor: 'text-orange-700', bgLight: 'bg-orange-100' },
};

const STAGE_CONFIG = {
  first_message: { label: 'First Message', color: 'bg-gray-500' },
  awaiting_response: { label: 'Awaiting Response', color: 'bg-yellow-500' },
  in_dialogue: { label: 'In Dialogue', color: 'bg-blue-500' },
  meeting_scheduled: { label: 'Meeting Scheduled', color: 'bg-purple-500' },
  closed_won: { label: 'Closed Won', color: 'bg-green-500' },
  closed_lost: { label: 'Closed Lost', color: 'bg-red-500' },
};

const TEMPERATURE_CONFIG = {
  cold: { icon: Snowflake, color: 'text-blue-500', label: 'Cold' },
  warm: { icon: ThermometerSun, color: 'text-yellow-500', label: 'Warm' },
  hot: { icon: Flame, color: 'text-red-500', label: 'Hot' },
};

export function SuperDebateTargets({ campaignId }: SuperDebateTargetsProps) {
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [audienceFilter, setAudienceFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [generating, setGenerating] = useState<string | null>(null);
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
            last_name,
            company,
            headline,
            location,
            linkedin_url,
            audience_types,
            profile_signals
          )
        `)
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTargets(data || []);
    } catch (error) {
      console.error('Error fetching targets:', error);
      toast({
        title: 'Error',
        description: 'Failed to load targets',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const generateMessage = async (target: any) => {
    setGenerating(target.id);
    try {
      if (!target.connections) {
        throw new Error('Connection data not found');
      }

      const response = await fetch('/api/superdebate/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          connectionId: target.connection_id,
          campaignId: campaignId,
          profileData: {
            name: target.connections.full_name || 'Unknown',
            headline: target.connections.headline || '',
            company: target.connections.company || '',
            location: target.connections.location || '',
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Message generated',
          description: `Classified as ${result.classification.primary} (${Math.round(result.classification.confidence * 100)}% confidence)`,
        });
        fetchTargets(); // Refresh to show updated data
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error generating message:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate message',
        variant: 'destructive',
      });
    } finally {
      setGenerating(null);
    }
  };

  // Filter targets
  const filteredTargets = targets.filter((target) => {
    const matchesSearch = !searchQuery ||
      target.connections?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      target.connections?.company?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAudience = audienceFilter === 'all' || target.audience_type === audienceFilter;
    const matchesStage = stageFilter === 'all' || target.conversation_stage === stageFilter;

    return matchesSearch && matchesAudience && matchesStage;
  });

  // Calculate stats
  const stats = {
    total: targets.length,
    classified: targets.filter(t => t.audience_type).length,
    byAudience: {
      funder: targets.filter(t => t.audience_type === 'funder').length,
      ambassador: targets.filter(t => t.audience_type === 'ambassador').length,
      debater: targets.filter(t => t.audience_type === 'debater').length,
      friend: targets.filter(t => t.audience_type === 'friend').length,
    },
    byStage: {
      awaiting: targets.filter(t => t.conversation_stage === 'awaiting_response').length,
      dialogue: targets.filter(t => t.conversation_stage === 'in_dialogue').length,
      won: targets.filter(t => t.conversation_stage === 'closed_won').length,
    },
    hot: targets.filter(t => t.temperature === 'hot').length,
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-6 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Targets</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-purple-600">{stats.classified}</p>
          <p className="text-sm text-muted-foreground">Classified</p>
        </Card>
        {Object.entries(stats.byAudience).map(([key, count]) => {
          const config = AUDIENCE_CONFIG[key as keyof typeof AUDIENCE_CONFIG];
          const Icon = config.icon;
          return (
            <Card key={key} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${config.textColor}`} />
                <p className="text-2xl font-bold">{count}</p>
              </div>
              <p className="text-sm text-muted-foreground capitalize">{key}s</p>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={audienceFilter} onValueChange={setAudienceFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All audiences" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audiences</SelectItem>
                <SelectItem value="funder">Funders</SelectItem>
                <SelectItem value="ambassador">Ambassadors</SelectItem>
                <SelectItem value="debater">Debaters</SelectItem>
                <SelectItem value="friend">Friends</SelectItem>
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="first_message">First Message</SelectItem>
                <SelectItem value="awaiting_response">Awaiting Response</SelectItem>
                <SelectItem value="in_dialogue">In Dialogue</SelectItem>
                <SelectItem value="meeting_scheduled">Meeting Scheduled</SelectItem>
                <SelectItem value="closed_won">Closed Won</SelectItem>
                <SelectItem value="closed_lost">Closed Lost</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchTargets}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-purple-900">How SuperDebate Classification Works</h3>
              <ul className="text-sm text-purple-800 space-y-1">
                <li><strong>Funder</strong> = Investors, VCs, angels who might fund SuperDebate</li>
                <li><strong>Ambassador</strong> = People who could host local debate clubs in their city</li>
                <li><strong>Debater</strong> = Competitive debaters who want to participate</li>
                <li><strong>Friend</strong> = Mission-aligned connectors who can introduce you to others</li>
              </ul>
              <p className="text-xs text-purple-600 mt-2">
                Click "Generate" on any target to have AI analyze their profile and create a personalized message.
                The confidence % shows how certain the AI is about the classification.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Targets List */}
      <Card>
        <CardHeader>
          <CardTitle>Targets ({filteredTargets.length})</CardTitle>
          <CardDescription>
            SuperDebate-classified connections with conversation tracking.
            Temperature shows engagement: Cold (no response), Warm (some interest), Hot (actively engaged).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredTargets.map((target) => {
              const audienceConfig = target.audience_type ? AUDIENCE_CONFIG[target.audience_type as keyof typeof AUDIENCE_CONFIG] : null;
              const stageConfig = target.conversation_stage ? STAGE_CONFIG[target.conversation_stage as keyof typeof STAGE_CONFIG] : null;
              const tempConfig = target.temperature ? TEMPERATURE_CONFIG[target.temperature as keyof typeof TEMPERATURE_CONFIG] : null;
              const AudienceIcon = audienceConfig?.icon || User;
              const TempIcon = tempConfig?.icon || Snowflake;

              return (
                <div
                  key={target.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar/Audience Icon */}
                    <div className={`p-3 rounded-full ${audienceConfig?.bgLight || 'bg-gray-100'}`}>
                      <AudienceIcon className={`h-5 w-5 ${audienceConfig?.textColor || 'text-gray-500'}`} />
                    </div>

                    {/* Contact Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{target.connections?.full_name}</span>
                        {tempConfig && (
                          <TempIcon className={`h-4 w-4 ${tempConfig.color}`} />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {target.connections?.company && (
                          <>
                            <Building className="h-3 w-3" />
                            <span>{target.connections.company}</span>
                          </>
                        )}
                        {target.connections?.headline && (
                          <span className="truncate max-w-[200px]">• {target.connections.headline}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Badges and Actions */}
                  <div className="flex items-center gap-3">
                    {/* Audience Badge */}
                    {audienceConfig && (
                      <Badge className={`${audienceConfig.color} text-white`}>
                        {target.audience_type}
                        {target.classification_confidence && (
                          <span className="ml-1 opacity-75">
                            {Math.round(target.classification_confidence * 100)}%
                          </span>
                        )}
                      </Badge>
                    )}

                    {/* Stage Badge */}
                    {stageConfig && (
                      <Badge variant="outline" className="text-xs">
                        {stageConfig.label}
                      </Badge>
                    )}

                    {/* Personalized Message Indicator */}
                    {target.personalized_message ? (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Message Ready
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => generateMessage(target)}
                        disabled={generating === target.id}
                      >
                        {generating === target.id ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-1" />
                            Generate
                          </>
                        )}
                      </Button>
                    )}

                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              );
            })}

            {filteredTargets.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No targets match your filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SuperDebateTargets;
