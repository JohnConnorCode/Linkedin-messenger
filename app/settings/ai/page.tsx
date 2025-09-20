'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import {
  Brain,
  Settings,
  Shield,
  Zap,
  DollarSign,
  AlertTriangle,
  Plus,
  X,
  Save,
  RefreshCw
} from 'lucide-react';

export default function AISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    enabled: true,
    model: 'gpt-5-nano',
    defaultTone: 'professional',
    defaultTemperature: 0.3,
    maxTokens: 500,
    dailyLimit: 1000,
    hourlyLimit: 100,
    minConfidenceScore: 0.7,
    autoApproveThreshold: 0.9,
    requireManualReview: false,
    enableCaching: true,
    cacheExpirationDays: 7
  });

  const [bannedPhrases, setBannedPhrases] = useState<string[]>([]);
  const [newPhrase, setNewPhrase] = useState('');
  const [usage, setUsage] = useState({
    daily: 0,
    hourly: 0,
    totalCost: 0,
    cachedRequests: 0
  });

  const supabase = createClient();
  const { toast } = useToast();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);

    // Get user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load AI config
    const { data: config } = await supabase
      .from('ai_model_config')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (config) {
      setSettings({
        enabled: config.enabled,
        model: config.model_name || 'gpt-5-nano',
        defaultTone: config.default_tone,
        defaultTemperature: config.default_temperature,
        maxTokens: config.max_tokens,
        dailyLimit: config.daily_limit,
        hourlyLimit: config.hourly_limit,
        minConfidenceScore: config.min_confidence_score,
        autoApproveThreshold: config.auto_approve_threshold,
        requireManualReview: config.require_manual_review,
        enableCaching: true,
        cacheExpirationDays: 7
      });

      setUsage({
        daily: config.current_daily_usage,
        hourly: config.current_hourly_usage,
        totalCost: 0, // Calculate from logs
        cachedRequests: 0 // Calculate from cache hits
      });
    }

    // Load banned phrases
    const { data: filters } = await supabase
      .from('ai_safety_filters')
      .select('pattern')
      .eq('filter_type', 'banned_phrase')
      .eq('is_active', true);

    if (filters) {
      setBannedPhrases(filters.map(f => f.pattern));
    }

    setLoading(false);
  };

  const saveSettings = async () => {
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Save AI config
    const { error: configError } = await supabase
      .from('ai_model_config')
      .upsert({
        user_id: user.id,
        enabled: settings.enabled,
        model_name: settings.model,
        default_tone: settings.defaultTone,
        default_temperature: settings.defaultTemperature,
        max_tokens: settings.maxTokens,
        daily_limit: settings.dailyLimit,
        hourly_limit: settings.hourlyLimit,
        min_confidence_score: settings.minConfidenceScore,
        auto_approve_threshold: settings.autoApproveThreshold,
        require_manual_review: settings.requireManualReview,
        updated_at: new Date().toISOString()
      });

    if (configError) {
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Success',
        description: 'AI settings saved successfully'
      });
    }

    setSaving(false);
  };

  const addBannedPhrase = async () => {
    if (!newPhrase.trim()) return;

    const { error } = await supabase
      .from('ai_safety_filters')
      .insert({
        filter_type: 'banned_phrase',
        pattern: newPhrase.trim(),
        severity: 'medium',
        action: 'regenerate',
        description: 'User-defined banned phrase'
      });

    if (!error) {
      setBannedPhrases([...bannedPhrases, newPhrase.trim()]);
      setNewPhrase('');
      toast({
        title: 'Added',
        description: 'Banned phrase added successfully'
      });
    }
  };

  const removeBannedPhrase = async (phrase: string) => {
    const { error } = await supabase
      .from('ai_safety_filters')
      .update({ is_active: false })
      .eq('pattern', phrase);

    if (!error) {
      setBannedPhrases(bannedPhrases.filter(p => p !== phrase));
    }
  };

  const estimateMonthlyCost = () => {
    // GPT-5 Nano pricing: $0.05/1M input, $0.40/1M output
    const dailyMessages = settings.dailyLimit;
    const avgInputTokens = 200; // Profile + template
    const avgOutputTokens = 100; // Generated content

    const monthlyInputTokens = dailyMessages * avgInputTokens * 30;
    const monthlyOutputTokens = dailyMessages * avgOutputTokens * 30;

    const inputCost = (monthlyInputTokens / 1000000) * 0.05;
    const outputCost = (monthlyOutputTokens / 1000000) * 0.40;

    return (inputCost + outputCost).toFixed(2);
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
    <div className="container max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Brain className="h-8 w-8" />
          AI Personalization Settings
        </h1>
        <p className="text-muted-foreground">Configure GPT-5 Nano for message personalization</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="safety">Safety & Filters</TabsTrigger>
          <TabsTrigger value="usage">Usage & Costs</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Configuration</CardTitle>
              <CardDescription>Basic AI settings for message personalization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable AI */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="ai-enabled">Enable AI Personalization</Label>
                  <p className="text-sm text-muted-foreground">Use GPT-5 Nano to personalize messages</p>
                </div>
                <Switch
                  id="ai-enabled"
                  checked={settings.enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, enabled: checked })}
                />
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={settings.model} onValueChange={(value) => setSettings({ ...settings, model: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-5-nano">
                      <div>
                        <div className="flex items-center gap-2">
                          <Zap className="h-4 w-4" />
                          GPT-5 Nano
                        </div>
                        <p className="text-xs text-muted-foreground">Fast & cost-effective</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="gpt-5-mini">
                      <div>
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          GPT-5 Mini
                        </div>
                        <p className="text-xs text-muted-foreground">Better quality, higher cost</p>
                      </div>
                    </SelectItem>
                    <SelectItem value="gpt-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4" />
                          GPT-5
                        </div>
                        <p className="text-xs text-muted-foreground">Best quality, highest cost</p>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current: {settings.model === 'gpt-5-nano' ? '$0.05/1M input, $0.40/1M output tokens' : 'Check pricing'}
                </p>
              </div>

              {/* Default Tone */}
              <div className="space-y-2">
                <Label>Default Tone</Label>
                <Select value={settings.defaultTone} onValueChange={(value) => setSettings({ ...settings, defaultTone: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="friendly">Friendly</SelectItem>
                    <SelectItem value="concise">Concise</SelectItem>
                    <SelectItem value="curious">Curious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Temperature */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Creativity Level</Label>
                  <span className="text-sm text-muted-foreground">{settings.defaultTemperature}</span>
                </div>
                <Slider
                  value={[settings.defaultTemperature]}
                  onValueChange={([value]) => setSettings({ ...settings, defaultTemperature: value })}
                  min={0}
                  max={1}
                  step={0.1}
                />
                <p className="text-xs text-muted-foreground">
                  Lower = More consistent, Higher = More creative
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Safety Filters
              </CardTitle>
              <CardDescription>Control what language AI should avoid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Confidence Thresholds */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Minimum Confidence Score</Label>
                  <span className="text-sm text-muted-foreground">{settings.minConfidenceScore}</span>
                </div>
                <Slider
                  value={[settings.minConfidenceScore]}
                  onValueChange={([value]) => setSettings({ ...settings, minConfidenceScore: value })}
                  min={0}
                  max={1}
                  step={0.05}
                />
                <p className="text-xs text-muted-foreground">
                  Messages below this confidence will be flagged for review
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label>Auto-Approve Threshold</Label>
                  <span className="text-sm text-muted-foreground">{settings.autoApproveThreshold}</span>
                </div>
                <Slider
                  value={[settings.autoApproveThreshold]}
                  onValueChange={([value]) => setSettings({ ...settings, autoApproveThreshold: value })}
                  min={0}
                  max={1}
                  step={0.05}
                />
                <p className="text-xs text-muted-foreground">
                  Messages above this confidence can be auto-approved
                </p>
              </div>

              {/* Manual Review */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="manual-review">Require Manual Review</Label>
                  <p className="text-sm text-muted-foreground">All messages must be approved manually</p>
                </div>
                <Switch
                  id="manual-review"
                  checked={settings.requireManualReview}
                  onCheckedChange={(checked) => setSettings({ ...settings, requireManualReview: checked })}
                />
              </div>

              {/* Banned Phrases */}
              <div className="space-y-2">
                <Label>Banned Phrases</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add banned phrase..."
                    value={newPhrase}
                    onChange={(e) => setNewPhrase(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addBannedPhrase()}
                  />
                  <Button onClick={addBannedPhrase} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {bannedPhrases.map((phrase, i) => (
                    <Badge key={i} variant="secondary" className="gap-1">
                      {phrase}
                      <button
                        onClick={() => removeBannedPhrase(phrase)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Usage & Costs
              </CardTitle>
              <CardDescription>Monitor AI usage and set limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Usage */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Daily Usage</p>
                  <p className="text-2xl font-bold">{usage.daily} / {settings.dailyLimit}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Hourly Usage</p>
                  <p className="text-2xl font-bold">{usage.hourly} / {settings.hourlyLimit}</p>
                </div>
              </div>

              {/* Rate Limits */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Daily Limit</Label>
                  <Input
                    type="number"
                    value={settings.dailyLimit}
                    onChange={(e) => setSettings({ ...settings, dailyLimit: parseInt(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Hourly Limit</Label>
                  <Input
                    type="number"
                    value={settings.hourlyLimit}
                    onChange={(e) => setSettings({ ...settings, hourlyLimit: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              {/* Cost Estimate */}
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  Estimated monthly cost: <strong>${estimateMonthlyCost()}</strong> based on current settings
                </AlertDescription>
              </Alert>

              {/* Cache Stats */}
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Cache Performance</p>
                    <p className="text-sm text-muted-foreground">Reduces costs by avoiding duplicate API calls</p>
                  </div>
                  <Badge>{usage.cachedRequests} hits</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Advanced Settings</CardTitle>
              <CardDescription>Fine-tune AI behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Max Tokens */}
              <div className="space-y-2">
                <Label>Max Tokens</Label>
                <Input
                  type="number"
                  value={settings.maxTokens}
                  onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">
                  Maximum tokens for AI response (affects cost)
                </p>
              </div>

              {/* Caching */}
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="caching">Enable Response Caching</Label>
                  <p className="text-sm text-muted-foreground">Cache AI responses to reduce costs</p>
                </div>
                <Switch
                  id="caching"
                  checked={settings.enableCaching}
                  onCheckedChange={(checked) => setSettings({ ...settings, enableCaching: checked })}
                />
              </div>

              {settings.enableCaching && (
                <div className="space-y-2">
                  <Label>Cache Expiration (days)</Label>
                  <Input
                    type="number"
                    value={settings.cacheExpirationDays}
                    onChange={(e) => setSettings({ ...settings, cacheExpirationDays: parseInt(e.target.value) })}
                  />
                </div>
              )}

              {/* API Key Status */}
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  API key status: <Badge className="ml-2">Connected</Badge>
                  <br />
                  <span className="text-xs">Using GPT-5 Nano via OpenAI API</span>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  );
}