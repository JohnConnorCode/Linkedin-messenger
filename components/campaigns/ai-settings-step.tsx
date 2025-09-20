'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Zap, DollarSign, Shield } from 'lucide-react';

interface AISettingsStepProps {
  data: {
    ai_enabled: boolean;
    ai_tone: string;
    ai_temperature: number;
    ai_auto_approve: boolean;
    ai_min_confidence: number;
  };
  onChange: (updates: Partial<AISettingsStepProps['data']>) => void;
}

export function AISettingsStep({ data, onChange }: AISettingsStepProps) {
  const estimatedCost = () => {
    if (!data.ai_enabled) return '0.00';
    // GPT-5 Nano: $0.05/1M input, $0.40/1M output
    const messagesPerDay = 25; // Using daily_cap
    const costPerMessage = 0.00003; // Approximate
    return (messagesPerDay * costPerMessage * 30).toFixed(2);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Personalization with GPT-5 Nano
          </CardTitle>
          <CardDescription>
            Enhance your messages with AI-powered personalization for better engagement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable AI Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ai-enabled" className="text-base">
                Enable AI Personalization
              </Label>
              <p className="text-sm text-muted-foreground">
                Use GPT-5 Nano to analyze profiles and personalize each message
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={data.ai_enabled}
              onCheckedChange={(checked) => onChange({ ai_enabled: checked })}
            />
          </div>

          {data.ai_enabled && (
            <>
              {/* Tone Selection */}
              <div className="space-y-2">
                <Label htmlFor="ai-tone">Message Tone</Label>
                <Select
                  value={data.ai_tone}
                  onValueChange={(value) => onChange({ ai_tone: value })}
                >
                  <SelectTrigger id="ai-tone">
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">
                      <div className="flex items-center gap-2">
                        <span>Professional</span>
                        <span className="text-xs text-muted-foreground">Formal and respectful</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="casual">
                      <div className="flex items-center gap-2">
                        <span>Casual</span>
                        <span className="text-xs text-muted-foreground">Relaxed and friendly</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="friendly">
                      <div className="flex items-center gap-2">
                        <span>Friendly</span>
                        <span className="text-xs text-muted-foreground">Warm and approachable</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="concise">
                      <div className="flex items-center gap-2">
                        <span>Concise</span>
                        <span className="text-xs text-muted-foreground">Brief and to the point</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="curious">
                      <div className="flex items-center gap-2">
                        <span>Curious</span>
                        <span className="text-xs text-muted-foreground">Engaging with questions</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Creativity Level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-temperature">Creativity Level</Label>
                  <span className="text-sm text-muted-foreground">{data.ai_temperature}</span>
                </div>
                <Slider
                  id="ai-temperature"
                  min={0}
                  max={1}
                  step={0.1}
                  value={[data.ai_temperature]}
                  onValueChange={([value]) => onChange({ ai_temperature: value })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Lower values create more consistent messages, higher values add more variety
                </p>
              </div>

              {/* Confidence Threshold */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="ai-confidence">Minimum Confidence Score</Label>
                  <span className="text-sm text-muted-foreground">
                    {Math.round(data.ai_min_confidence * 100)}%
                  </span>
                </div>
                <Slider
                  id="ai-confidence"
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={[data.ai_min_confidence]}
                  onValueChange={([value]) => onChange({ ai_min_confidence: value })}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Messages below this confidence will be flagged for manual review
                </p>
              </div>

              {/* Auto-Approve */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="ai-auto-approve" className="text-base">
                    Auto-Approve High Confidence
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically approve messages with confidence above 90%
                  </p>
                </div>
                <Switch
                  id="ai-auto-approve"
                  checked={data.ai_auto_approve}
                  onCheckedChange={(checked) => onChange({ ai_auto_approve: checked })}
                />
              </div>

              {/* Cost Estimate */}
              <Alert>
                <DollarSign className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>Estimated monthly AI cost:</span>
                    <strong>${estimatedCost()}</strong>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Based on GPT-5 Nano pricing and your daily message limit
                  </span>
                </AlertDescription>
              </Alert>

              {/* Safety Notice */}
              <Alert className="border-yellow-200 bg-yellow-50">
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  All AI-generated content is filtered for safety and compliance.
                  You'll review messages before sending.
                </AlertDescription>
              </Alert>
            </>
          )}
        </CardContent>
      </Card>

      {data.ai_enabled && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              What Happens Next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="font-semibold">1.</span>
                <span>After uploading contacts, AI will analyze each LinkedIn profile</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">2.</span>
                <span>GPT-5 Nano generates personalized opening lines and context</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">3.</span>
                <span>Review and edit suggestions in the approval queue</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold">4.</span>
                <span>Approved messages are sent with your personalized touch</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}