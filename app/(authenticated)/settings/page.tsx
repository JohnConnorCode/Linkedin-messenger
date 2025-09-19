'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Save, Clock, Shield, Zap } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    global_daily_cap: 80,
    global_hourly_cap: 8,
    min_between_messages_ms: 90000,
    humanize: true,
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .single();

    if (data) {
      setSettings(data);
    }
  };

  const handleSave = async () => {
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('user_settings')
        .upsert({ ...settings, user_id: user.id } as any);

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your settings have been updated successfully',
      });
    } catch (error) {
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
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure global limits and safety controls
        </p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <CardTitle>Rate Limits</CardTitle>
            </div>
            <CardDescription>
              Set global limits for message sending
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="daily-cap">Daily Message Cap</Label>
                <Input
                  id="daily-cap"
                  type="number"
                  min="1"
                  max="200"
                  value={settings.global_daily_cap}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      global_daily_cap: parseInt(e.target.value) || 80,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum messages per day (recommended: 80)
                </p>
              </div>

              <div>
                <Label htmlFor="hourly-cap">Hourly Message Cap</Label>
                <Input
                  id="hourly-cap"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.global_hourly_cap}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      global_hourly_cap: parseInt(e.target.value) || 8,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum messages per hour (recommended: 8)
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="min-between">Minimum Time Between Messages (ms)</Label>
              <Input
                id="min-between"
                type="number"
                min="60000"
                max="600000"
                step="1000"
                value={settings.min_between_messages_ms}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    min_between_messages_ms: parseInt(e.target.value) || 90000,
                  })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum milliseconds between messages (90000 = 90 seconds)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              <CardTitle>Safety Controls</CardTitle>
            </div>
            <CardDescription>
              Configure anti-detection measures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="humanize">Humanize Behavior</Label>
                <p className="text-xs text-muted-foreground">
                  Add random delays, mouse movements, and typing variations
                </p>
              </div>
              <Switch
                id="humanize"
                checked={settings.humanize}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, humanize: checked })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <CardTitle>Recommendations</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
                <div>
                  <p className="font-medium">Conservative Limits</p>
                  <p className="text-muted-foreground">
                    Stay under 100 messages/day and 10/hour for safety
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
                <div>
                  <p className="font-medium">Natural Timing</p>
                  <p className="text-muted-foreground">
                    Use variable delays and avoid sending at exact intervals
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
                <div>
                  <p className="font-medium">Business Hours</p>
                  <p className="text-muted-foreground">
                    Send messages during normal business hours in recipient&apos;s timezone
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}