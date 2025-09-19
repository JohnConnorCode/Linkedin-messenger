'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Users, FileText, Settings, Eye } from 'lucide-react';

interface CampaignWizardProps {
  step: string;
  data: any;
  onUpdate: (data: any) => void;
}

export function CampaignWizard({ step, data, onUpdate }: CampaignWizardProps) {
  const [templates, setTemplates] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (step === 'template') {
      fetchTemplates();
    } else if (step === 'audience') {
      fetchConnections();
    } else {
      setLoading(false);
    }
  }, [step]);

  const fetchTemplates = async () => {
    const { data: temps } = await supabase
      .from('message_templates')
      .select('*')
      .eq('is_active', true);
    setTemplates(temps || []);
    setLoading(false);
  };

  const fetchConnections = async () => {
    const { data: conns } = await supabase
      .from('connections')
      .select('id, full_name, company, tags');
    setConnections(conns || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  switch (step) {
    case 'template':
      return (
        <div className="space-y-4">
          <div>
            <Label htmlFor="campaign-name">Campaign Name</Label>
            <Input
              id="campaign-name"
              value={data.name}
              onChange={(e) => onUpdate({ ...data, name: e.target.value })}
              placeholder="e.g., Q4 Outreach Campaign"
              className="mt-2"
            />
          </div>

          <div>
            <Label>Select Template</Label>
            <RadioGroup
              value={data.template_id}
              onValueChange={(value) => onUpdate({ ...data, template_id: value })}
              className="mt-2"
            >
              {templates.map((template) => (
                <Card key={template.id} className="p-4 mb-2">
                  <div className="flex items-start gap-3">
                    <RadioGroupItem value={template.id} id={template.id} />
                    <div className="flex-1">
                      <Label htmlFor={template.id} className="cursor-pointer">
                        <div className="font-medium">{template.name}</div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {template.body}
                        </p>
                      </Label>
                      <div className="flex gap-1 mt-2">
                        {template.variables?.map((v: string) => (
                          <Badge key={v} variant="outline" className="text-xs">
                            {`{{${v}}}`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </RadioGroup>
          </div>
        </div>
      );

    case 'audience':
      return (
        <div className="space-y-4">
          <div>
            <Label>Filter by Company</Label>
            <Input
              placeholder="e.g., Google, Microsoft (comma-separated)"
              className="mt-2"
              onChange={(e) => {
                const companies = e.target.value.split(',').map(c => c.trim()).filter(Boolean);
                onUpdate({
                  ...data,
                  target_filter: { ...data.target_filter, company_includes: companies }
                });
              }}
            />
          </div>

          <div>
            <Label>Filter by Tags</Label>
            <Input
              placeholder="e.g., prospect, lead (comma-separated)"
              className="mt-2"
              onChange={(e) => {
                const tags = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                onUpdate({
                  ...data,
                  target_filter: { ...data.target_filter, tags_any: tags }
                });
              }}
            />
          </div>

          <div>
            <Label>Not Contacted in Days</Label>
            <Input
              type="number"
              placeholder="e.g., 30"
              className="mt-2"
              onChange={(e) => {
                onUpdate({
                  ...data,
                  target_filter: { ...data.target_filter, not_contacted_days: parseInt(e.target.value) }
                });
              }}
            />
          </div>

          <Card className="p-4 bg-muted">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4" />
              <span className="font-medium">Estimated Targets</span>
            </div>
            <p className="text-2xl font-bold">{connections.length}</p>
            <p className="text-sm text-muted-foreground">
              Based on current filters
            </p>
          </Card>
        </div>
      );

    case 'settings':
      return (
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Rate Limits
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="daily-cap">Daily Message Cap</Label>
                <Input
                  id="daily-cap"
                  type="number"
                  value={data.daily_cap}
                  onChange={(e) => onUpdate({ ...data, daily_cap: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="hourly-cap">Hourly Message Cap</Label>
                <Input
                  id="hourly-cap"
                  type="number"
                  value={data.hourly_cap}
                  onChange={(e) => onUpdate({ ...data, hourly_cap: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Behavior Settings</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jitter">Random Delay (ms)</Label>
                <Input
                  id="jitter"
                  type="number"
                  value={data.jitter_ms}
                  onChange={(e) => onUpdate({ ...data, jitter_ms: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="dwell">Dwell Time (ms)</Label>
                <Input
                  id="dwell"
                  type="number"
                  value={data.dwell_ms}
                  onChange={(e) => onUpdate({ ...data, dwell_ms: parseInt(e.target.value) })}
                  className="mt-2"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="approval">Require Manual Approval</Label>
              <p className="text-sm text-muted-foreground">
                Review each message before sending
              </p>
            </div>
            <Switch
              id="approval"
              checked={data.require_manual_approval}
              onCheckedChange={(checked) => onUpdate({ ...data, require_manual_approval: checked })}
            />
          </div>
        </div>
      );

    case 'review':
      const selectedTemplate = templates.find(t => t.id === data.template_id);

      return (
        <div className="space-y-6">
          <div className="grid gap-4">
            <Card className="p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Campaign Details
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Name:</dt>
                  <dd className="font-medium">{data.name || 'Not set'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Template:</dt>
                  <dd className="font-medium">{selectedTemplate?.name || 'Not selected'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Manual Approval:</dt>
                  <dd className="font-medium">{data.require_manual_approval ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Audience
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total Targets:</dt>
                  <dd className="font-medium">{connections.length}</dd>
                </div>
                {data.target_filter?.company_includes?.length > 0 && (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Companies:</dt>
                    <dd className="font-medium">{data.target_filter.company_includes.join(', ')}</dd>
                  </div>
                )}
              </dl>
            </Card>

            <Card className="p-4">
              <h3 className="font-medium mb-2 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Rate Limits
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Daily Cap:</dt>
                  <dd className="font-medium">{data.daily_cap} messages</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Hourly Cap:</dt>
                  <dd className="font-medium">{data.hourly_cap} messages</dd>
                </div>
              </dl>
            </Card>
          </div>

          <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>⚠️ Final Check:</strong> Make sure your LinkedIn account is connected
              via the Runner before launching this campaign.
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}