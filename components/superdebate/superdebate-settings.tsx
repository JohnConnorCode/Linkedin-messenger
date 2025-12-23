'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles,
  Users,
  DollarSign,
  Megaphone,
  MessageCircle,
  UserCheck,
  Calendar,
  Save,
  Info
} from 'lucide-react';

interface SuperDebateSettingsProps {
  campaignId: string;
  campaign: any;
  onUpdate?: () => void;
}

const AUDIENCE_TYPES = [
  { value: 'funder', label: 'Funder', icon: DollarSign, color: 'bg-green-500', description: 'Angel investors, VCs, grant-makers' },
  { value: 'ambassador', label: 'Ambassador', icon: Megaphone, color: 'bg-blue-500', description: 'People who could run local clubs' },
  { value: 'debater', label: 'Debater', icon: MessageCircle, color: 'bg-purple-500', description: 'People who want to compete' },
  { value: 'friend', label: 'Friend', icon: UserCheck, color: 'bg-orange-500', description: 'Mission-aligned connectors' },
];

export function SuperDebateSettings({ campaignId, campaign, onUpdate }: SuperDebateSettingsProps) {
  const [settings, setSettings] = useState({
    superdebate_enabled: campaign?.superdebate_enabled || false,
    default_audience_type: campaign?.default_audience_type || null,
    auto_follow_up: campaign?.auto_follow_up || false,
    follow_up_schedule: campaign?.follow_up_schedule || { day_3: true, day_7: true },
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({
          superdebate_enabled: settings.superdebate_enabled,
          default_audience_type: settings.default_audience_type,
          auto_follow_up: settings.auto_follow_up,
          follow_up_schedule: settings.follow_up_schedule,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'SuperDebate settings have been updated',
      });
      onUpdate?.();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle>SuperDebate AI Outreach</CardTitle>
                <CardDescription>
                  AI-powered audience classification and personalized messaging
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={settings.superdebate_enabled}
              onCheckedChange={(checked) => setSettings({ ...settings, superdebate_enabled: checked })}
            />
          </div>
        </CardHeader>
        {settings.superdebate_enabled && (
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="space-y-2">
                <p>
                  <strong>SuperDebate AI</strong> automatically analyzes each LinkedIn profile and:
                </p>
                <ol className="list-decimal ml-4 space-y-1 text-sm">
                  <li>Classifies them into one of 4 audiences (Funder, Ambassador, Debater, Friend)</li>
                  <li>Identifies personalization hooks from their profile (shared interests, mutual connections)</li>
                  <li>Generates a custom message in John's voice with audience-specific CTAs</li>
                  <li>Tracks conversation stage and temperature as they respond</li>
                </ol>
                <p className="text-xs mt-2">
                  Messages are deduplicated to prevent sending the same hook twice. High-value prospects (Funders, 75%+ fit) are flagged for manual review.
                </p>
              </AlertDescription>
            </Alert>

            {/* Audience Types Preview */}
            <div className="grid grid-cols-2 gap-3">
              {AUDIENCE_TYPES.map((audience) => {
                const Icon = audience.icon;
                return (
                  <div
                    key={audience.value}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <div className={`p-2 ${audience.color} rounded-lg`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{audience.label}</p>
                      <p className="text-xs text-muted-foreground">{audience.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        )}
      </Card>

      {settings.superdebate_enabled && (
        <>
          {/* Default Audience Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default Audience Type</CardTitle>
              <CardDescription>
                When AI can't confidently classify someone (e.g., sparse LinkedIn profile), this type is used.
                "Auto-detect" means the AI will make its best guess even at low confidence.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={settings.default_audience_type || 'auto'}
                onValueChange={(value) => setSettings({
                  ...settings,
                  default_audience_type: value === 'auto' ? null : value
                })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select default audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect (recommended)</SelectItem>
                  {AUDIENCE_TYPES.map((audience) => (
                    <SelectItem key={audience.value} value={audience.value}>
                      {audience.label} - {audience.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Follow-up Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Automatic Follow-ups</CardTitle>
                  <CardDescription>
                    When enabled, SuperDebate automatically queues follow-up messages for people who haven't responded.
                    You'll review and approve each one before it's sent.
                  </CardDescription>
                </div>
                <Switch
                  checked={settings.auto_follow_up}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_follow_up: checked })}
                />
              </div>
            </CardHeader>
            {settings.auto_follow_up && (
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Day 3-4 Follow-up</p>
                      <p className="text-sm text-muted-foreground">
                        "Hey [name]—just floating this back up..."
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.follow_up_schedule.day_3}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      follow_up_schedule: { ...settings.follow_up_schedule, day_3: checked }
                    })}
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Day 7-10 Follow-up</p>
                      <p className="text-sm text-muted-foreground">
                        "Last note on this—if the mission resonates..."
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={settings.follow_up_schedule.day_7}
                    onCheckedChange={(checked) => setSettings({
                      ...settings,
                      follow_up_schedule: { ...settings.follow_up_schedule, day_7: checked }
                    })}
                  />
                </div>
              </CardContent>
            )}
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default SuperDebateSettings;
