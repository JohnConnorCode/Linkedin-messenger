'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Plus,
  Trophy,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  Percent,
  Clock,
  AlertCircle,
  CheckCircle2,
  FlaskConical,
  Copy,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  Sparkles,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Variant {
  id: string;
  variant_name: string;
  variant_type: 'control' | 'test_a' | 'test_b' | 'test_c';
  template_id: string;
  traffic_split: number;
  messages_sent: number;
  responses_received: number;
  conversions: number;
  confidence_level: number;
  is_winner: boolean;
  response_rate?: number;
  conversion_rate?: number;
}

interface ABTestingDashboardProps {
  campaign: any;
  variants: Variant[];
  testResults: any[];
}

export function ABTestingDashboard({ campaign, variants: initialVariants, testResults }: ABTestingDashboardProps) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [testStatus, setTestStatus] = useState<'draft' | 'running' | 'completed'>('draft');
  const [newVariant, setNewVariant] = useState({
    name: '',
    template: '',
    trafficSplit: 50
  });
  const { toast } = useToast();

  useEffect(() => {
    // Determine test status based on campaign and variants
    if (campaign.status === 'completed' || variants.some(v => v.is_winner)) {
      setTestStatus('completed');
    } else if (campaign.status === 'active' && variants.length > 1) {
      setTestStatus('running');
    } else {
      setTestStatus('draft');
    }
  }, [campaign, variants]);

  const createVariant = async () => {
    if (!newVariant.name || !newVariant.template) {
      toast({
        title: 'Error',
        description: 'Please provide variant name and template',
        variant: 'destructive',
      });
      return;
    }

    // Simulate variant creation
    const variant: Variant = {
      id: `variant-${Date.now()}`,
      variant_name: newVariant.name,
      variant_type: variants.length === 0 ? 'control' :
                   variants.length === 1 ? 'test_a' :
                   variants.length === 2 ? 'test_b' : 'test_c',
      template_id: 'template-1',
      traffic_split: newVariant.trafficSplit,
      messages_sent: 0,
      responses_received: 0,
      conversions: 0,
      confidence_level: 0,
      is_winner: false,
      response_rate: 0,
      conversion_rate: 0
    };

    setVariants([...variants, variant]);
    setIsCreatingVariant(false);
    setNewVariant({ name: '', template: '', trafficSplit: 50 });

    toast({
      title: 'Variant Created',
      description: `${variant.variant_name} has been added to the test`,
    });
  };

  const calculateSignificance = (variantA: Variant, variantB: Variant) => {
    if (!variantA.messages_sent || !variantB.messages_sent) return 0;

    const p1 = variantA.responses_received / variantA.messages_sent;
    const p2 = variantB.responses_received / variantB.messages_sent;
    const n1 = variantA.messages_sent;
    const n2 = variantB.messages_sent;

    const pooledP = (variantA.responses_received + variantB.responses_received) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));

    if (se === 0) return 0;

    const z = Math.abs(p1 - p2) / se;

    // Convert z-score to confidence level
    if (z >= 2.58) return 99;
    if (z >= 1.96) return 95;
    if (z >= 1.645) return 90;
    return Math.round((z / 2.58) * 100);
  };

  const declareWinner = (variantId: string) => {
    setVariants(variants.map(v => ({
      ...v,
      is_winner: v.id === variantId
    })));

    toast({
      title: 'Winner Declared!',
      description: 'The winning variant will now receive 100% of traffic',
    });
  };

  // Calculate total traffic split
  const totalTrafficSplit = variants.reduce((sum, v) => sum + v.traffic_split, 0);

  // Prepare chart data
  const performanceData = variants.map(v => ({
    name: v.variant_name,
    'Response Rate': ((v.responses_received / (v.messages_sent || 1)) * 100).toFixed(2),
    'Conversion Rate': ((v.conversions / (v.messages_sent || 1)) * 100).toFixed(2),
    'Messages Sent': v.messages_sent
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="space-y-6">
      {/* Test Status Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>A/B Test Configuration</CardTitle>
              <CardDescription>
                Test different message variations to optimize performance
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  testStatus === 'completed' ? 'default' :
                  testStatus === 'running' ? 'secondary' : 'outline'
                }
                className="gap-1"
              >
                <FlaskConical className="h-3 w-3" />
                {testStatus === 'completed' ? 'Test Complete' :
                 testStatus === 'running' ? 'Test Running' : 'Test Draft'}
              </Badge>
              {testStatus === 'running' && (
                <Button size="sm" variant="destructive" onClick={() => {}}>
                  <Pause className="h-4 w-4 mr-1" />
                  Stop Test
                </Button>
              )}
              {testStatus === 'draft' && variants.length > 1 && (
                <Button size="sm" onClick={() => {}}>
                  <Play className="h-4 w-4 mr-1" />
                  Start Test
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Variants Overview */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {variants.map((variant, index) => (
          <Card
            key={variant.id}
            className={cn(
              "relative",
              variant.is_winner && "ring-2 ring-green-500"
            )}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={variant.variant_type === 'control' ? 'default' : 'secondary'}
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {variant.variant_type === 'control' ? 'Control' : `Test ${variant.variant_type.slice(-1).toUpperCase()}`}
                  </Badge>
                  {variant.is_winner && (
                    <Trophy className="h-4 w-4 text-yellow-500" />
                  )}
                </div>
                <span className="text-sm font-medium">{variant.traffic_split}%</span>
              </div>
              <CardTitle className="text-sm mt-2">{variant.variant_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Messages</span>
                    <span className="font-medium">{variant.messages_sent}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Response Rate</span>
                    <span className="font-medium">
                      {variant.messages_sent > 0
                        ? `${((variant.responses_received / variant.messages_sent) * 100).toFixed(1)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Conversions</span>
                    <span className="font-medium">{variant.conversions}</span>
                  </div>
                </div>

                <Progress
                  value={variant.confidence_level * 100}
                  className="h-2"
                />
                <div className="text-xs text-center text-muted-foreground">
                  {variant.confidence_level > 0
                    ? `${(variant.confidence_level * 100).toFixed(0)}% Confidence`
                    : 'Gathering data...'}
                </div>

                {testStatus === 'completed' && !variant.is_winner && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => declareWinner(variant.id)}
                  >
                    Declare Winner
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Add Variant Card */}
        {variants.length < 4 && testStatus === 'draft' && (
          <Dialog open={isCreatingVariant} onOpenChange={setIsCreatingVariant}>
            <DialogTrigger asChild>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px]">
                  <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Add Variant</span>
                </CardContent>
              </Card>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Variant</DialogTitle>
                <DialogDescription>
                  Add a new message variant to your A/B test
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Variant Name</Label>
                  <Input
                    placeholder="e.g., Friendly Opener"
                    value={newVariant.name}
                    onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Message Template</Label>
                  <Textarea
                    placeholder="Hi {{firstName}}, I noticed..."
                    value={newVariant.template}
                    onChange={(e) => setNewVariant({ ...newVariant, template: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Traffic Split (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[newVariant.trafficSplit]}
                      onValueChange={(value) => setNewVariant({ ...newVariant, trafficSplit: value[0] })}
                      max={100 - totalTrafficSplit}
                      step={5}
                      className="flex-1"
                    />
                    <span className="w-12 text-sm font-medium">{newVariant.trafficSplit}%</span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreatingVariant(false)}>
                  Cancel
                </Button>
                <Button onClick={createVariant}>
                  Create Variant
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Performance Charts */}
      {variants.length > 1 && variants.some(v => v.messages_sent > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Comparison</CardTitle>
            <CardDescription>
              Visual comparison of variant performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="response" className="space-y-4">
              <TabsList>
                <TabsTrigger value="response">Response Rates</TabsTrigger>
                <TabsTrigger value="conversion">Conversion Rates</TabsTrigger>
                <TabsTrigger value="volume">Message Volume</TabsTrigger>
              </TabsList>

              <TabsContent value="response">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Response Rate" fill="#3b82f6">
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="conversion">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Conversion Rate" fill="#10b981">
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="volume">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="Messages Sent" fill="#f59e0b">
                      {performanceData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Statistical Significance */}
      {variants.length > 1 && variants.some(v => v.messages_sent > 10) && (
        <Card>
          <CardHeader>
            <CardTitle>Statistical Significance</CardTitle>
            <CardDescription>
              Confidence levels for performance differences between variants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {variants.slice(1).map((variant, index) => {
                const control = variants[0];
                const significance = calculateSignificance(control, variant);
                const improvement = control.messages_sent > 0
                  ? (((variant.responses_received / variant.messages_sent) -
                     (control.responses_received / control.messages_sent)) /
                     (control.responses_received / control.messages_sent) * 100).toFixed(1)
                  : 0;

                return (
                  <div key={variant.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">
                          {variant.variant_name} vs {control.variant_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {Number(improvement) > 0 ? (
                            <span className="text-green-600">+{improvement}% improvement</span>
                          ) : Number(improvement) < 0 ? (
                            <span className="text-red-600">{improvement}% decrease</span>
                          ) : (
                            <span>No difference</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={significance} className="w-32" />
                      <Badge
                        variant={
                          significance >= 95 ? 'default' :
                          significance >= 90 ? 'secondary' : 'outline'
                        }
                      >
                        {significance}% confident
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>

            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Statistical Significance Guide</AlertTitle>
              <AlertDescription>
                • 95%+ confidence: Strong evidence of real difference<br />
                • 90-94% confidence: Moderate evidence<br />
                • Below 90%: Need more data for conclusions
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {testStatus === 'running' && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <CardTitle className="text-blue-900 dark:text-blue-100">
                A/B Testing Best Practices
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>Run tests for at least 100 messages per variant for reliable results</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>Wait for 95% confidence before declaring a winner</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>Test one major change at a time for clear insights</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5" />
                <span>Consider time of day and day of week effects in your analysis</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}